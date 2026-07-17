from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from ..font_store import ROOT

PIPELINE_ROOT = ROOT


def _module_available(name: str) -> bool:
    path = PIPELINE_ROOT / f"{name}.py"
    return path.is_file()


def load_pipeline_module(name: str):
    path = PIPELINE_ROOT / f"{name}.py"
    if not path.is_file():
        return None
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def pipeline_status() -> dict[str, bool]:
    return {
        "build_sebsans": _module_available("build_sebsans"),
        "letterform_pass": _module_available("letterform_pass"),
        "patch_gsub": _module_available("patch_gsub"),
    }


def require_letterform_pass():
    module = load_pipeline_module("letterform_pass")
    if module is None:
        raise RuntimeError("letterform_pass.py is not present")
    return module


def require_build_sebsans():
    module = load_pipeline_module("build_sebsans")
    if module is None:
        raise RuntimeError("build_sebsans.py is not present")
    return module


def require_patch_gsub():
    module = load_pipeline_module("patch_gsub")
    if module is None:
        raise RuntimeError("patch_gsub.py is not present")
    return module
