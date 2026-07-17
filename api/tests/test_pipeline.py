"""Tests for Seb Sans production pipeline scripts."""

from __future__ import annotations

import os
import shutil
import tempfile
from copy import deepcopy
from pathlib import Path

import pytest
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture()
def temp_font(tmp_path: Path) -> Path:
    src = ROOT / "fonts" / "SebSansVar.ttf"
    dest = tmp_path / "SebSansVar.ttf"
    shutil.copy2(src, dest)
    return dest


def test_patch_gsub_is_idempotent(temp_font: Path):
    import patch_gsub

    font = TTFont(temp_font)
    first = patch_gsub.patch_gsub(font)
    second = patch_gsub.patch_gsub(font)
    assert first >= 0
    assert second == 0


def test_patch_gsub_wires_zero_slash_in_tnum(temp_font: Path):
    import patch_gsub

    font = TTFont(temp_font)
    patch_gsub.patch_gsub(font)
    gsub = font["GSUB"].table
    tnum_lookup = gsub.LookupList.Lookup[62]
    mapping = tnum_lookup.SubTable[0].mapping
    assert mapping.get("zero.slash") == "zero.tf.slash"


def test_build_regular_matches_reference_metrics(temp_font: Path, tmp_path: Path):
    import build_sebsans

    out = tmp_path / "fonts"
    paths = build_sebsans.build_release(temp_font, out, version="test")
    regular = TTFont(out / "SebSans-Regular.ttf")
    assert regular["hmtx"]["n"][1] == 165
    assert regular["name"].getDebugName(1) == "Seb Sans"
    assert (out / "SebSansVar.ttf").is_file()


def test_letterform_preserves_point_count(temp_font: Path):
    import letterform_pass

    font = TTFont(temp_font)
    before = len(font["glyf"]["n"].coordinates)
    letterform_pass.apply_batch(font, ["n"], {"operation": "scale_width", "factor": 1.01})
    after = len(font["glyf"]["n"].coordinates)
    assert before == after


def test_pipeline_modules_discoverable():
    from api.pipeline.loader import pipeline_status

    status = pipeline_status()
    assert status["build_sebsans"] is True
    assert status["letterform_pass"] is True
    assert status["patch_gsub"] is True
