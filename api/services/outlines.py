from __future__ import annotations

import copy
import io
import math
from dataclasses import dataclass

from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

from ..font_store import BASELINE_DIR, WORKING_PATH, ensure_working_copy
from .glyphs import load_working_font


@dataclass
class OutlinePoint:
    x: float
    y: float
    on_curve: bool


def _recording_to_contours(recording: list) -> list[dict]:
    contours: list[dict] = []
    current: list[dict] = []
    for operator, operands in recording:
        if operator == "moveTo":
            if current:
                contours.append({"points": current})
                current = []
            x, y = operands[0]
            current.append({"x": x, "y": y, "onCurve": True})
        elif operator == "lineTo":
            x, y = operands[0]
            current.append({"x": x, "y": y, "onCurve": True})
        elif operator == "qCurveTo":
            for point in operands[:-1]:
                x, y = point
                current.append({"x": x, "y": y, "onCurve": False})
            x, y = operands[-1]
            current.append({"x": x, "y": y, "onCurve": True})
        elif operator == "curveTo":
            for idx in range(0, len(operands), 3):
                cx1, cy1 = operands[idx]
                cx2, cy2 = operands[idx + 1]
                x, y = operands[idx + 2]
                current.append({"x": cx1, "y": cy1, "onCurve": False})
                current.append({"x": cx2, "y": cy2, "onCurve": False})
                current.append({"x": x, "y": y, "onCurve": True})
        elif operator == "closePath":
            if current:
                contours.append({"points": current})
                current = []
    if current:
        contours.append({"points": current})
    return contours


def _count_points(contours: list[dict]) -> int:
    return sum(len(contour["points"]) for contour in contours)


def _instantiate_font(font: TTFont, wght: float, opsz: float) -> TTFont:
    location = {"wght": wght, "opsz": opsz}
    if "XHGT" in [axis.axisTag for axis in font["fvar"].axes]:
        location["XHGT"] = 100
    return instantiateVariableFont(copy.deepcopy(font), location)


def _draw_glyph(font: TTFont, glyph_name: str) -> tuple[list[dict], float]:
    glyph_set = font.getGlyphSet()
    if glyph_name not in glyph_set:
        raise KeyError(glyph_name)
    pen = RecordingPen()
    glyph_set[glyph_name].draw(pen)
    contours = _recording_to_contours(pen.value)
    advance = font["hmtx"][glyph_name][0]
    return contours, advance


def get_glyph_outline(glyph_name: str, wght: float = 400, opsz: float = 14) -> dict:
    font = load_working_font()
    instance = _instantiate_font(font, wght, opsz)
    contours, advance = _draw_glyph(instance, glyph_name)
    return {
        "name": glyph_name,
        "wght": wght,
        "opsz": opsz,
        "advanceWidth": advance,
        "contours": contours,
        "pointCount": _count_points(contours),
    }


def _glyph_point_count(font: TTFont, glyph_name: str) -> int:
    if "glyf" not in font:
        return 0
    glyph = font["glyf"][glyph_name]
    if glyph.isComposite():
        return sum(_glyph_point_count(font, component.glyphName) for component in glyph.components)
    return len(glyph.coordinates) if glyph.numberOfContours > 0 else 0


def master_point_count(font: TTFont, glyph_name: str) -> int:
    return _glyph_point_count(font, glyph_name)


def _apply_point_updates(
    font: TTFont,
    glyph_name: str,
    updates: list[dict],
) -> None:
    glyf = font["glyf"]
    glyph = glyf[glyph_name]
    if glyph.isComposite():
        raise ValueError("Composite glyph point edits are not supported in v1")
    before = len(glyph.coordinates)
    for update in updates:
        index = int(update["index"])
        glyph.coordinates[index] = (float(update["x"]), float(update["y"]))
    font["glyf"][glyph_name] = glyph
    if len(glyph.coordinates) != before:
        raise ValueError("Point count changed")


def _apply_transform(
    font: TTFont,
    glyph_name: str,
    payload: dict,
) -> None:
    glyf = font["glyf"]
    glyph = glyf[glyph_name]
    if glyph.numberOfContours <= 0:
        return
    pivot_x = float(payload.get("pivotX", 0))
    pivot_y = float(payload.get("pivotY", 0))
    scale_x = float(payload.get("scaleX", 1))
    scale_y = float(payload.get("scaleY", 1))
    translate_x = float(payload.get("translateX", 0))
    translate_y = float(payload.get("translateY", 0))
    before = len(glyph.coordinates)
    coords = []
    for x, y in glyph.coordinates:
        nx = (x - pivot_x) * scale_x + pivot_x + translate_x
        ny = (y - pivot_y) * scale_y + pivot_y + translate_y
        coords.append((nx, ny))
    glyph.coordinates = coords
    font["glyf"][glyph_name] = glyph
    if len(glyph.coordinates) != before:
        raise ValueError("Point count changed")


def _apply_metrics(font: TTFont, glyph_name: str, payload: dict) -> None:
    lsb, advance = font["hmtx"][glyph_name]
    lsb = int(payload.get("lsb", lsb))
    advance = int(payload.get("advanceWidth", advance))
    font["hmtx"][glyph_name] = (lsb, advance)


def _copy_glyph_from_baseline(font: TTFont, glyph_name: str) -> None:
    baseline_files = sorted(BASELINE_DIR.glob("Inter*.ttf"))
    if not baseline_files:
        raise FileNotFoundError("Inter baseline not cached")
    baseline = TTFont(baseline_files[0])
    if glyph_name not in baseline.getGlyphSet():
        raise KeyError(f"{glyph_name} not found in Inter baseline")
    target_glyf = font["glyf"]
    source_glyf = baseline["glyf"][glyph_name]
    target_glyf[glyph_name] = copy.deepcopy(source_glyf)
    if glyph_name in baseline["hmtx"]:
        font["hmtx"][glyph_name] = baseline["hmtx"][glyph_name]


def save_font(font: TTFont) -> None:
    ensure_working_copy()
    font.save(WORKING_PATH)


def contours_from_glyph(font: TTFont, glyph_name: str) -> list[dict]:
    contours, _ = _draw_glyph(font, glyph_name)
    return contours
