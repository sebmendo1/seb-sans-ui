from __future__ import annotations

import copy
import io
import shutil
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from fontTools.ttLib import TTFont

from ..font_store import WORKING_PATH, ensure_working_copy
from . import outlines
from .glyphs import load_working_font


class EditError(Exception):
    def __init__(self, code: str, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


@dataclass
class EditSession:
    undo_stack: list[bytes] = field(default_factory=list)
    redo_stack: list[bytes] = field(default_factory=list)
    preview_bytes: bytes | None = None


SESSION = EditSession()
MAX_UNDO = 32


def _snapshot() -> bytes:
    ensure_working_copy()
    return WORKING_PATH.read_bytes()


def _restore_snapshot(data: bytes) -> None:
    ensure_working_copy()
    WORKING_PATH.write_bytes(data)


def _push_undo() -> None:
    SESSION.undo_stack.append(_snapshot())
    if len(SESSION.undo_stack) > MAX_UNDO:
        SESSION.undo_stack.pop(0)
    SESSION.redo_stack.clear()


def _validate_point_counts(
    font: TTFont,
    glyph_names: list[str],
    before_counts: dict[str, int],
    confirm_advanced: bool,
) -> None:
    changed = []
    for name in glyph_names:
        after = outlines.master_point_count(font, name)
        before = before_counts.get(name, after)
        if after != before:
            changed.append({"glyph": name, "before": before, "after": after})
    if changed and not confirm_advanced:
        raise EditError(
            "POINT_COUNT_CHANGE_REQUIRES_CONFIRM",
            "This edit would change point counts across masters.",
            {"glyphs": changed},
        )


def apply_intent(
    intent: str,
    glyphs: list[str],
    payload: dict,
    confirm_advanced: bool = False,
) -> dict:
    if not glyphs:
        raise EditError("NO_GLYPHS", "At least one glyph is required.")

    _push_undo()
    font = load_working_font()
    before_counts = {name: outlines.master_point_count(font, name) for name in glyphs}

    try:
        if intent == "points":
            for name in glyphs:
                outlines._apply_point_updates(font, name, payload.get("updates", []))
        elif intent == "transform":
            for name in glyphs:
                outlines._apply_transform(font, name, payload)
        elif intent == "metrics":
            for name in glyphs:
                outlines._apply_metrics(font, name, payload)
        elif intent == "reset_inter":
            for name in glyphs:
                outlines._copy_glyph_from_baseline(font, name)
        elif intent == "batch":
            from .batch import apply_batch_to_font

            apply_batch_to_font(font, glyphs, payload)
        else:
            raise EditError("UNKNOWN_INTENT", f"Unsupported intent: {intent}")

        _validate_point_counts(font, glyphs, before_counts, confirm_advanced)
        outlines.save_font(font)
    except EditError:
        if SESSION.undo_stack:
            _restore_snapshot(SESSION.undo_stack.pop())
        raise
    except Exception as exc:
        if SESSION.undo_stack:
            _restore_snapshot(SESSION.undo_stack.pop())
        raise EditError("EDIT_FAILED", str(exc)) from exc

    SESSION.preview_bytes = None
    result_glyphs = []
    for name in glyphs:
        outline = outlines.get_glyph_outline(
            name,
            float(payload.get("wght", 400)),
            float(payload.get("opsz", 14)),
        )
        result_glyphs.append({"name": name, "pointCount": outline["pointCount"]})
    return {"ok": True, "glyphs": result_glyphs}


def undo() -> dict:
    if not SESSION.undo_stack:
        raise EditError("UNDO_EMPTY", "Nothing to undo.")
    SESSION.redo_stack.append(_snapshot())
    _restore_snapshot(SESSION.undo_stack.pop())
    return {"ok": True}


def redo() -> dict:
    if not SESSION.redo_stack:
        raise EditError("REDO_EMPTY", "Nothing to redo.")
    SESSION.undo_stack.append(_snapshot())
    _restore_snapshot(SESSION.redo_stack.pop())
    return {"ok": True}


def preview_batch(glyphs: list[str], payload: dict) -> dict:
    ensure_working_copy()
    font = load_working_font()
    preview_font = copy.deepcopy(font)
    from .batch import apply_batch_to_font

    apply_batch_to_font(preview_font, glyphs, payload)
    buffer = io.BytesIO()
    preview_font.save(buffer)
    SESSION.preview_bytes = buffer.getvalue()
    previews = []
    for name in glyphs[:12]:
        contours = outlines.contours_from_glyph(preview_font, name)
        previews.append({"name": name, "contours": contours})
    return {"ok": True, "previewGlyphCount": len(glyphs), "previews": previews}


def clear_preview() -> None:
    SESSION.preview_bytes = None
