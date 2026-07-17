#!/usr/bin/env python3
"""Seb Sans release build — static instances, variable rebuild, WOFF2."""

from __future__ import annotations

import argparse
import shutil
import subprocess
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import compress as woff2_compress
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent
VERSION_STRING = "Version 2.000;SebSans-fork-of-Inter-4.1"
UNIQUE_PREFIX = "2.000;SEBM;"

VARIATION_TABLES = ("fvar", "gvar", "avar", "HVAR", "MVAR", "STAT")


@dataclass(frozen=True)
class StaticConfig:
    filename: str
    wght: float
    opsz: float
    family_name: str
    style_name: str
    ps_name: str
    weight_class: int
    apply_tracking: bool
    line_gap: int


STATIC_CONFIGS: tuple[StaticConfig, ...] = (
    StaticConfig("SebSans-Regular.ttf", 430, 14, "Seb Sans", "Regular", "SebSans-Regular", 400, True, 225),
    StaticConfig("SebSans-Medium.ttf", 530, 14, "Seb Sans Medium", "Regular", "SebSans-Medium", 500, True, 225),
    StaticConfig("SebSans-SemiBold.ttf", 620, 14, "Seb Sans SemiBold", "Regular", "SebSans-SemiBold", 600, True, 225),
    StaticConfig("SebSans-Bold.ttf", 720, 14, "Seb Sans", "Bold", "SebSans-Bold", 700, True, 225),
    StaticConfig("SebSansDisplay-Regular.ttf", 400, 32, "Seb Sans Display", "Regular", "SebSansDisplay-Regular", 400, False, 0),
    StaticConfig("SebSansDisplay-Bold.ttf", 700, 32, "Seb Sans Display", "Bold", "SebSansDisplay-Bold", 700, False, 0),
)


def instantiate_static(var_font: TTFont, wght: float, opsz: float) -> TTFont:
    location = {"wght": wght, "opsz": opsz}
    if "fvar" in var_font:
        tags = [axis.axisTag for axis in var_font["fvar"].axes]
        if "XHGT" in tags:
            location["XHGT"] = 100.0
    return instantiateVariableFont(deepcopy(var_font), location)


def strip_variation_tables(font: TTFont) -> None:
    for tag in VARIATION_TABLES:
        if tag in font:
            del font[tag]


def apply_text_tracking(font: TTFont, lsb_delta: int = 16, advance_delta: int = 8) -> None:
    for glyph_name in font.getGlyphOrder():
        lsb, advance = font["hmtx"][glyph_name]
        font["hmtx"][glyph_name] = (lsb + lsb_delta, advance + advance_delta)


def apply_sebsans_naming(font: TTFont, config: StaticConfig, version_label: str) -> None:
    name_table = font["name"]
    target_ids = {1, 2, 3, 4, 5, 6, 16, 17}
    name_table.names = [record for record in name_table.names if record.nameID not in target_ids]
    entries = {
        1: config.family_name,
        2: config.style_name,
        3: f"{UNIQUE_PREFIX}{config.ps_name}",
        4: config.family_name,
        5: VERSION_STRING,
        6: config.ps_name,
        16: config.family_name,
        17: config.style_name,
    }
    for name_id, value in entries.items():
        name_table.setName(value, name_id, 3, 1, 0x409)
    font["OS/2"].usWeightClass = config.weight_class
    font["OS/2"].sTypoLineGap = config.line_gap
    font["OS/2"].fsSelection |= 1 << 7
    font["head"].macStyle = 1 if config.style_name == "Bold" else 0


def hint_static(path: Path) -> None:
    ttfautohint = shutil.which("ttfautohint")
    if not ttfautohint:
        return
    temp = path.with_suffix(".hinted.ttf")
    result = subprocess.run(
        [ttfautohint, str(path), str(temp)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode == 0 and temp.is_file():
        temp.replace(path)


def build_statics(var_font: TTFont, output_dir: Path, version_label: str) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    for config in STATIC_CONFIGS:
        static = instantiate_static(var_font, config.wght, config.opsz)
        strip_variation_tables(static)
        if config.apply_tracking:
            apply_text_tracking(static)
        apply_sebsans_naming(static, config, version_label)
        path = output_dir / config.filename
        static.save(path)
        hint_static(path)
        outputs.append(path)
    return outputs


def write_variable_outputs(var_font: TTFont, output_dir: Path) -> tuple[Path, Path | None]:
    output_dir.mkdir(parents=True, exist_ok=True)
    ttf_path = output_dir / "SebSansVar.ttf"
    woff2_path = output_dir / "SebSansVar.woff2"
    var_font.save(ttf_path)
    try:
        woff2_compress(str(ttf_path), str(woff2_path))
    except ImportError:
        return ttf_path, None
    return ttf_path, woff2_path


def copy_release_docs(output_dir: Path) -> None:
    for doc in ("README.md", "OFL.txt"):
        src = ROOT / "fonts" / doc
        if src.is_file():
            shutil.copy2(src, output_dir / doc)


def build_release(input_path: Path, output_dir: Path, version: str = "0.6.0") -> list[Path]:
    var_font = TTFont(input_path)
    outputs = build_statics(var_font, output_dir, version)
    var_font = TTFont(input_path)
    ttf_path, woff2_path = write_variable_outputs(var_font, output_dir)
    outputs.append(ttf_path)
    if woff2_path is not None:
        outputs.append(woff2_path)
    copy_release_docs(output_dir)
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Seb Sans release fonts.")
    parser.add_argument("--input", type=Path, default=ROOT / "fonts" / "SebSansVar.ttf")
    parser.add_argument("--output", type=Path, default=ROOT / "releases" / "SebSans-build")
    parser.add_argument("--version", default="0.6.0")
    args = parser.parse_args()
    paths = build_release(args.input, args.output, args.version)
    print(f"Built {len(paths)} font files in {args.output}")


if __name__ == "__main__":
    main()
