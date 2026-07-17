from __future__ import annotations

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

from ..font_store import SOURCE_PATH, WORKING_PATH, ensure_working_copy
from .glyphs import load_working_font, total_glyph_count
from .outlines import _draw_glyph, _instantiate_font

CONFUSABLES = {
    "l": ["I", "one", "i"],
    "I": ["l", "one"],
    "one": ["l", "I"],
    "zero": ["O", "o"],
    "O": ["zero", "o"],
    "o": ["zero", "O"],
    "G": ["C", "O"],
}

ADVANCE_EPSILON = 8


def _bbox_width(font: TTFont, glyph_name: str) -> float:
    glyph_set = font.getGlyphSet()
    if glyph_name not in glyph_set:
        return 0.0
    pen = BoundsPen(glyph_set)
    glyph_set[glyph_name].draw(pen)
    bounds = pen.bounds
    if bounds is None:
        return 0.0
    return bounds[2] - bounds[0]


def _glyph_exists(font: TTFont, glyph_name: str) -> bool:
    return glyph_name in font.getGlyphSet()


def _advance(font: TTFont, glyph_name: str) -> float:
    return float(font["hmtx"][glyph_name][1])


def _published_baseline_font() -> TTFont | None:
    if not SOURCE_PATH.is_file():
        return None
    return TTFont(SOURCE_PATH)


def get_principle_checks(glyph: str | None = None, batch_count: int | None = None) -> dict:
    ensure_working_copy()
    working = load_working_font()
    published = _published_baseline_font()
    total = total_glyph_count()

    distinct = {"glyph": glyph, "confusables": [], "flags": []}
    if glyph:
        instance = _instantiate_font(working, 400, 14)
        target_advance = _advance(instance, glyph) if _glyph_exists(instance, glyph) else 0
        target_bbox = _bbox_width(instance, glyph)
        for other in CONFUSABLES.get(glyph, []):
            if not _glyph_exists(instance, other):
                continue
            other_advance = _advance(instance, other)
            other_bbox = _bbox_width(instance, other)
            suspicious = (
                abs(other_advance - target_advance) <= ADVANCE_EPSILON
                and abs(other_bbox - target_bbox) <= ADVANCE_EPSILON
            )
            distinct["confusables"].append(
                {
                    "glyph": other,
                    "advanceWidth": other_advance,
                    "bboxWidth": other_bbox,
                    "suspicious": suspicious,
                }
            )
        if any(item["suspicious"] for item in distinct["confusables"]):
            distinct["flags"].append("Distinct at 13px: confusable metrics converging.")

    warmth = {"selectionCount": batch_count or 0, "totalGlyphs": total, "flags": []}
    if batch_count and total:
        ratio = batch_count / total
        warmth["coverageRatio"] = ratio
        if ratio > 0.4:
            warmth["flags"].append(
                "Warmth is detail: batch selection touches more than 40% of the glyph set."
            )

    rhythm = {"deltas": [], "flags": []}
    if glyph and published is not None:
        if _glyph_exists(working, glyph) and _glyph_exists(published, glyph):
            delta = _advance(working, glyph) - _advance(published, glyph)
            rhythm["deltas"].append({"glyph": glyph, "advanceDelta": delta})
            if abs(delta) >= 20:
                rhythm["flags"].append(
                    f"Rhythm before letterforms: {glyph} advance shifted by {delta:.0f} units vs published source."
                )

    return {
        "distinctAt13px": distinct,
        "warmthIsDetail": warmth,
        "rhythmBeforeLetterforms": rhythm,
        "advisoryOnly": True,
    }
