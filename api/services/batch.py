from __future__ import annotations

from fontTools.ttLib import TTFont

from ..pipeline.loader import load_pipeline_module


class BatchPipelineError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _fallback_contour_scale(font: TTFont, glyph_name: str, factor: float) -> None:
    glyf = font["glyf"][glyph_name]
    if glyf.numberOfContours <= 0:
        return
    xs = [x for x, _ in glyf.coordinates]
    ys = [y for _, y in glyf.coordinates]
    pivot_x = sum(xs) / len(xs)
    pivot_y = sum(ys) / len(ys)
    coords = []
    for x, y in glyf.coordinates:
        coords.append(((x - pivot_x) * factor + pivot_x, (y - pivot_y) * factor + pivot_y))
    glyf.coordinates = coords
    font["glyf"][glyph_name] = glyf


def _fallback_scale_width(font: TTFont, glyph_name: str, factor: float) -> None:
    glyf = font["glyf"][glyph_name]
    if glyf.numberOfContours <= 0:
        return
    xs = [x for x, _ in glyf.coordinates]
    pivot_x = sum(xs) / len(xs)
    coords = []
    for x, y in glyf.coordinates:
        coords.append(((x - pivot_x) * factor + pivot_x, y))
    glyf.coordinates = coords
    font["glyf"][glyph_name] = glyf
    lsb, advance = font["hmtx"][glyph_name]
    font["hmtx"][glyph_name] = (int(lsb * factor), int(advance * factor))


def _fallback_vertical_shift(font: TTFont, glyph_name: str, delta: float, edge: str) -> None:
    glyf = font["glyf"][glyph_name]
    if glyf.numberOfContours <= 0:
        return
    ys = [y for _, y in glyf.coordinates]
    if edge == "ascender":
        threshold = max(ys)
        coords = []
        for x, y in glyf.coordinates:
            coords.append((x, y + delta if y >= threshold - 20 else y))
    else:
        threshold = min(ys)
        coords = []
        for x, y in glyf.coordinates:
            coords.append((x, y + delta if y <= threshold + 20 else y))
    glyf.coordinates = coords
    font["glyf"][glyph_name] = glyf


def _fallback_sidebearings(font: TTFont, glyph_name: str, lsb_delta: float, rsb_delta: float) -> None:
    lsb, advance = font["hmtx"][glyph_name]
    font["hmtx"][glyph_name] = (int(lsb + lsb_delta), int(advance + lsb_delta + rsb_delta))


def apply_batch_to_font(font: TTFont, glyphs: list[str], payload: dict) -> None:
    module = load_pipeline_module("letterform_pass")
    operation = payload.get("operation")
    if module is not None and hasattr(module, "apply_batch"):
        module.apply_batch(font, glyphs, payload)
        return

    if operation == "contour_scale":
        factor = float(payload.get("factor", 1))
        for name in glyphs:
            _fallback_contour_scale(font, name, factor)
    elif operation == "scale_width":
        factor = float(payload.get("factor", 1))
        for name in glyphs:
            _fallback_scale_width(font, name, factor)
    elif operation == "shift_vertical":
        delta = float(payload.get("delta", 0))
        edge = payload.get("edge", "descender")
        for name in glyphs:
            _fallback_vertical_shift(font, name, delta, edge)
    elif operation == "sidebearings":
        lsb_delta = float(payload.get("lsbDelta", 0))
        rsb_delta = float(payload.get("rsbDelta", 0))
        for name in glyphs:
            _fallback_sidebearings(font, name, lsb_delta, rsb_delta)
    else:
        raise BatchPipelineError("UNKNOWN_BATCH_OPERATION", f"Unknown batch operation: {operation}")
