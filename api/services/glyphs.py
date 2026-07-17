from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from fontTools.ttLib import TTFont

from ..font_store import WORKING_PATH, ensure_working_copy

GROUPS = [
    "caps",
    "lowercase",
    "figures",
    "punctuation",
    "accents",
    "math_arrows",
    "other",
]

DNA_GLYPH_NAMES = {
    "G",
    "G.1",
    "one",
    "one.ss01",
    "l",
    "l.ss02",
    "zero",
    "zero.slash",
    "quotedbl",
    "quotesingle",
    "comma",
    "period",
    "i",
    "j",
    "dotlessi",
    "dotlessj",
    "idieresis",
    "ij",
}

MATH_ARROW_RANGES = {
    (0x2190, 0x21FF),
    (0x2200, 0x22FF),
    (0x27F0, 0x27FF),
    (0x2900, 0x297F),
}


@dataclass(frozen=True)
class GlyphEntry:
    name: str
    unicode: str | None
    group: str
    dna: bool
    index: int


def _format_unicode(codepoint: int | None) -> str | None:
    if codepoint is None:
        return None
    return f"U+{codepoint:04X}"


def _is_accented(name: str, codepoint: int | None) -> bool:
    if codepoint is None:
        return "." in name and any(
            part in name
            for part in (
                "acute",
                "grave",
                "circumflex",
                "tilde",
                "dieresis",
                "dot",
                "ring",
                "caron",
                "macron",
                "cedilla",
                "ogonek",
                "breve",
                "hook",
            )
        )
    try:
        return unicodedata.category(chr(codepoint)).startswith("L") and "M" in [
            unicodedata.category(c)
            for c in unicodedata.normalize("NFD", chr(codepoint))
        ]
    except ValueError:
        return False


def _classify_glyph(name: str, codepoint: int | None) -> str:
    if codepoint is not None:
        if 0x0041 <= codepoint <= 0x005A:
            return "caps"
        if 0x0061 <= codepoint <= 0x007A:
            return "lowercase"
        if 0x0030 <= codepoint <= 0x0039:
            return "figures"
        if unicodedata.category(chr(codepoint)).startswith("P"):
            return "punctuation"
        if _is_accented(name, codepoint):
            return "accents"
        for start, end in MATH_ARROW_RANGES:
            if start <= codepoint <= end:
                return "math_arrows"

    lower = name.lower()
    if re.fullmatch(r"[A-Z](\.[\w]+)?", name):
        return "caps"
    if re.fullmatch(r"[a-z](\.[\w]+)?", name):
        return "lowercase"
    if lower.startswith(("zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine")):
        return "figures"
    if any(token in lower for token in ("fraction", "numerator", "denominator", "ordfeminine", "ordmasculine")):
        return "figures"
    if _is_accented(name, codepoint):
        return "accents"
    if any(token in lower for token in ("arrow", "math", "integral", "summation", "infinity")):
        return "math_arrows"
    if any(token in lower for token in ("comma", "period", "quote", "question", "exclam", "semicolon", "colon")):
        return "punctuation"
    return "other"


def load_working_font() -> TTFont:
    ensure_working_copy()
    return TTFont(WORKING_PATH)


def list_glyphs() -> list[GlyphEntry]:
    font = load_working_font()
    glyph_order = font.getGlyphOrder()
    cmap = font.getBestCmap() or {}
    reverse_cmap: dict[str, int] = {}
    for codepoint, name in cmap.items():
        reverse_cmap.setdefault(name, codepoint)

    entries: list[GlyphEntry] = []
    for index, name in enumerate(glyph_order):
        if name == ".notdef":
            continue
        codepoint = reverse_cmap.get(name)
        entries.append(
            GlyphEntry(
                name=name,
                unicode=_format_unicode(codepoint),
                group=_classify_glyph(name, codepoint),
                dna=name in DNA_GLYPH_NAMES,
                index=index,
            )
        )
    return entries


def glyph_catalog() -> dict:
    glyphs = list_glyphs()
    return {
        "glyphs": [
            {
                "name": entry.name,
                "unicode": entry.unicode,
                "group": entry.group,
                "dna": entry.dna,
                "index": entry.index,
            }
            for entry in glyphs
        ],
        "groups": GROUPS,
        "total": len(glyphs),
    }


def total_glyph_count() -> int:
    return len(list_glyphs())
