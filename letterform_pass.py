#!/usr/bin/env python3
"""Seb Sans letterform transforms — point-count-preserving batch operations."""

from __future__ import annotations

import argparse
from pathlib import Path

from fontTools.ttLib import TTFont

WIDTH_FACTOR = 1.015
POINT_FACTOR = 1.06
DESCENDER_FACTOR = 0.96

VAR_AXIS_DEFAULTS = {"wght": 400.0, "opsz": 14.0, "XHGT": 100.0}


def _head_metrics(font: TTFont) -> tuple[int, int]:
    os2 = font["OS/2"]
    x_height = getattr(os2, "sxHeight", 0) or int(font["head"].unitsPerEm * 0.52)
    return x_height, 0


def _centroid(glyph) -> tuple[float, float]:
    if glyph.numberOfContours <= 0:
        return 0.0, 0.0
    xs = [x for x, _ in glyph.coordinates]
    ys = [y for _, y in glyph.coordinates]
    return sum(xs) / len(xs), sum(ys) / len(ys)


def _scale_gvar_axis_delta(font: TTFont, glyph_name: str, axis: str, factor: float) -> None:
    if "gvar" not in font or glyph_name not in font["gvar"].variations:
        return
    axis_index = None
    if "fvar" in font:
        for idx, faxis in enumerate(font["fvar"].axes):
            if faxis.axisTag == axis:
                axis_index = idx
                break
    for variation in font["gvar"].variations[glyph_name]:
        coords = variation.coordinates
        if not coords:
            continue
        if axis_index is not None and variation.axes:
            peak = variation.axes.get(axis, (0.0, 0.0, 0.0))
            if peak[1] == 0.0 and peak[2] == 0.0:
                continue
        updated = []
        for dx, dy in coords:
            if axis == "x" or axis == "wght":
                updated.append((dx * factor if dx else dx, dy))
            elif axis == "y":
                updated.append((dx, dy * factor if dy else dy))
            else:
                updated.append((dx, dy))
        variation.coordinates = updated


def contour_scale_glyph(font: TTFont, glyph_name: str, factor: float) -> None:
    glyf = font["glyf"][glyph_name]
    if glyf.numberOfContours <= 0:
        return
    pivot_x, pivot_y = _centroid(glyf)
    coords = []
    for x, y in glyf.coordinates:
        coords.append(
            ((x - pivot_x) * factor + pivot_x, (y - pivot_y) * factor + pivot_y)
        )
    glyf.coordinates = coords
    font["glyf"][glyph_name] = glyf
    _scale_gvar_axis_delta(font, glyph_name, "x", factor)
    _scale_gvar_axis_delta(font, glyph_name, "y", factor)


def scale_width_glyph(font: TTFont, glyph_name: str, factor: float) -> None:
    glyf = font["glyf"][glyph_name]
    if glyf.isComposite():
        for component in glyf.components:
            component.x = int(round(component.x * factor))
        font["glyf"][glyph_name] = glyf
    elif glyf.numberOfContours > 0:
        pivot_x, _ = _centroid(glyf)
        coords = []
        for x, y in glyf.coordinates:
            coords.append(((x - pivot_x) * factor + pivot_x, y))
        glyf.coordinates = coords
        font["glyf"][glyph_name] = glyf
    lsb, advance = font["hmtx"][glyph_name]
    font["hmtx"][glyph_name] = (int(round(lsb * factor)), int(round(advance * factor)))
    _scale_gvar_axis_delta(font, glyph_name, "x", factor)


def shift_vertical_glyph(font: TTFont, glyph_name: str, delta: float, edge: str) -> None:
    glyf = font["glyf"][glyph_name]
    if glyf.numberOfContours <= 0:
        return
    x_height, baseline = _head_metrics(font)
    ys = [y for _, y in glyf.coordinates]
    if edge == "ascender":
        threshold = max(ys)
        predicate = lambda y: y >= threshold - 20
    else:
        threshold = min(ys)
        predicate = lambda y: y <= min(threshold + 20, baseline + 40)
    coords = []
    for x, y in glyf.coordinates:
        coords.append((x, y + delta if predicate(y) else y))
    glyf.coordinates = coords
    font["glyf"][glyph_name] = glyf
    _scale_gvar_axis_delta(font, glyph_name, "y", 1.0 + (delta / max(abs(threshold), 1)))


def nudge_sidebearings_glyph(
    font: TTFont,
    glyph_name: str,
    lsb_delta: float,
    rsb_delta: float,
) -> None:
    lsb, advance = font["hmtx"][glyph_name]
    font["hmtx"][glyph_name] = (int(lsb + lsb_delta), int(advance + lsb_delta + rsb_delta))


def apply_batch(font: TTFont, glyphs: list[str], payload: dict) -> None:
    operation = payload.get("operation")
    if operation == "contour_scale":
        factor = float(payload.get("factor", POINT_FACTOR))
        for name in glyphs:
            if name in font.getGlyphSet():
                contour_scale_glyph(font, name, factor)
    elif operation == "scale_width":
        factor = float(payload.get("factor", WIDTH_FACTOR))
        for name in glyphs:
            if name in font.getGlyphSet():
                scale_width_glyph(font, name, factor)
    elif operation == "shift_vertical":
        delta = float(payload.get("delta", 0))
        edge = payload.get("edge", "descender")
        if edge == "descender" and payload.get("factor"):
            delta = 0.0
            factor = float(payload["factor"])
            for name in glyphs:
                if name not in font.getGlyphSet():
                    continue
                glyf = font["glyf"][name]
                if glyf.numberOfContours <= 0:
                    continue
                ys = [y for _, y in glyf.coordinates]
                threshold = min(ys)
                for idx, (x, y) in enumerate(glyf.coordinates):
                    if y <= threshold + 20:
                        glyf.coordinates[idx] = (x, y * factor)
                font["glyf"][name] = glyf
            return
        for name in glyphs:
            if name in font.getGlyphSet():
                shift_vertical_glyph(font, name, delta, edge)
    elif operation == "sidebearings":
        lsb_delta = float(payload.get("lsbDelta", 0))
        rsb_delta = float(payload.get("rsbDelta", 0))
        for name in glyphs:
            if name in font["hmtx"].metrics:
                nudge_sidebearings_glyph(font, name, lsb_delta, rsb_delta)
    else:
        raise ValueError(f"Unknown batch operation: {operation}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply Seb Sans letterform batch transforms.")
    parser.add_argument("--font", type=Path, required=True)
    parser.add_argument("--operation", required=True)
    parser.add_argument("--glyphs", nargs="+", required=True)
    parser.add_argument("--factor", type=float)
    parser.add_argument("--delta", type=float, default=0)
    parser.add_argument("--edge", choices=["ascender", "descender"], default="descender")
    parser.add_argument("--lsb-delta", type=float, default=0)
    parser.add_argument("--rsb-delta", type=float, default=0)
    args = parser.parse_args()
    font = TTFont(args.font)
    payload = {
        "operation": args.operation,
        "factor": args.factor,
        "delta": args.delta,
        "edge": args.edge,
        "lsbDelta": args.lsb_delta,
        "rsbDelta": args.rsb_delta,
    }
    apply_batch(font, args.glyphs, payload)
    font.save(args.font)
    print(f"Applied {args.operation} to {len(args.glyphs)} glyphs in {args.font}")


if __name__ == "__main__":
    main()
