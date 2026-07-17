#!/usr/bin/env python3
"""Seb Sans GSUB patch — wire frozen DNA and ss03 through all substitution lookups."""

from __future__ import annotations

import argparse
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.otlLib.builder import buildCoverage

DNA_RULES: tuple[tuple[str, str], ...] = (
    ("zero", ".slash"),
    ("one", ".ss01"),
    ("l", ".ss02"),
    ("G", ".1"),
)

SS03_PREFIXES = ("comma", "quote", "period")


def _glyph_order(font: TTFont) -> list[str]:
    return list(font.getGlyphOrder())


def _glyph_set(font: TTFont) -> set[str]:
    return set(_glyph_order(font))


def _dna_partner(name: str, base: str, suffix: str, glyphs: set[str]) -> str | None:
    if not name.startswith(base):
        return None
    candidate = name + suffix
    return candidate if candidate in glyphs else None


def _ss03_partner(name: str, glyphs: set[str]) -> str | None:
    if name.endswith(".ss03"):
        return name
    candidate = f"{name}.ss03"
    return candidate if candidate in glyphs else None


def _should_ss03_mirror(name: str) -> bool:
    return name == "period" or any(name.startswith(prefix) for prefix in SS03_PREFIXES)


def _rebuild_coverage(subtable, font: TTFont) -> None:
    glyph_map = font.getReverseGlyphMap()
    sources = sorted(subtable.mapping.keys(), key=lambda glyph: glyph_map[glyph])
    subtable.Coverage = buildCoverage(sources, glyph_map)


def _extend_mapping(mapping: dict[str, str], glyphs: set[str]) -> int:
    added = 0
    for src, dst in list(mapping.items()):
        for base, suffix in DNA_RULES:
            dna_src = _dna_partner(src, base, suffix, glyphs)
            dna_dst = _dna_partner(dst, base, suffix, glyphs)
            if dna_src and dna_dst and dna_src not in mapping:
                mapping[dna_src] = dna_dst
                added += 1
        if _should_ss03_mirror(src) or _should_ss03_mirror(dst):
            ss03_src = _ss03_partner(src, glyphs)
            ss03_dst = _ss03_partner(dst, glyphs)
            if ss03_src and ss03_dst and ss03_src not in mapping:
                mapping[ss03_src] = ss03_dst
                added += 1
    return added


def sort_gsub_coverage(font: TTFont) -> None:
    if "GSUB" not in font:
        return
    for lookup in font["GSUB"].table.LookupList.Lookup:
        if lookup.LookupType != 1:
            continue
        for subtable in lookup.SubTable:
            if hasattr(subtable, "mapping"):
                _rebuild_coverage(subtable, font)


def patch_gsub(font: TTFont) -> int:
    if "GSUB" not in font:
        return 0
    glyphs = _glyph_set(font)
    total_added = 0
    for lookup in font["GSUB"].table.LookupList.Lookup:
        if lookup.LookupType != 1:
            continue
        for subtable in lookup.SubTable:
            if hasattr(subtable, "mapping"):
                total_added += _extend_mapping(subtable.mapping, glyphs)
    sort_gsub_coverage(font)
    return total_added


def patch_file(path: Path, in_place: bool = True) -> int:
    font = TTFont(path)
    added = patch_gsub(font)
    if in_place:
        font.save(path)
    return added


def main() -> None:
    parser = argparse.ArgumentParser(description="Patch Seb Sans GSUB DNA wiring.")
    parser.add_argument("--font", type=Path, default=Path("fonts/_working/SebSansVar.ttf"))
    parser.add_argument("--in-place", action="store_true", default=True)
    args = parser.parse_args()
    added = patch_file(args.font, in_place=args.in_place)
    print(f"Patched {args.font}: {added} mappings added")


if __name__ == "__main__":
    main()
