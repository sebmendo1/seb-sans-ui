from __future__ import annotations

import hashlib
import os
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = Path(os.environ.get("STUDIO_FONT_DIR", ROOT / "fonts"))
SOURCE_PATH = FONT_DIR / "SebSansVar.ttf"
WORKING_DIR = FONT_DIR / "_working"
WORKING_PATH = WORKING_DIR / "SebSansVar.ttf"
HISTORY_DIR = FONT_DIR / "_history"
BASELINE_DIR = FONT_DIR / "_baseline"


class FontStoreError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class FontStatus:
    source_path: str
    working_path: str
    source_bytes: int
    working_bytes: int
    source_sha256: str
    working_sha256: str
    working_matches_source: bool
    history_count: int


def _display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        try:
            return str(path.relative_to(FONT_DIR.parent))
        except ValueError:
            return str(path)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _atomic_replace(src: Path, dest: Path) -> None:
    temp_path = dest.with_suffix(dest.suffix + ".tmp")
    try:
        shutil.copy2(src, temp_path)
        temp_path.replace(dest)
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)


def ensure_layout() -> None:
    WORKING_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    BASELINE_DIR.mkdir(parents=True, exist_ok=True)


def ensure_source_exists() -> None:
    if not SOURCE_PATH.is_file():
        raise FontStoreError(
            "SOURCE_FONT_MISSING",
            f"Source font not found at {SOURCE_PATH}",
        )


def ensure_working_copy() -> None:
    ensure_layout()
    ensure_source_exists()
    if not WORKING_PATH.is_file():
        shutil.copy2(SOURCE_PATH, WORKING_PATH)


def read_source_bytes() -> bytes:
    ensure_source_exists()
    return SOURCE_PATH.read_bytes()


def read_working_bytes() -> bytes:
    ensure_working_copy()
    return WORKING_PATH.read_bytes()


def status() -> FontStatus:
    ensure_working_copy()
    source_sha = _sha256(SOURCE_PATH)
    working_sha = _sha256(WORKING_PATH)
    history_count = len(list(HISTORY_DIR.glob("SebSansVar-*.ttf")))
    return FontStatus(
        source_path=_display_path(SOURCE_PATH),
        working_path=_display_path(WORKING_PATH),
        source_bytes=SOURCE_PATH.stat().st_size,
        working_bytes=WORKING_PATH.stat().st_size,
        source_sha256=source_sha,
        working_sha256=working_sha,
        working_matches_source=source_sha == working_sha,
        history_count=history_count,
    )


def save_working_to_source() -> str:
    ensure_working_copy()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    history_path = HISTORY_DIR / f"SebSansVar-{timestamp}.ttf"
    shutil.copy2(SOURCE_PATH, history_path)
    _atomic_replace(WORKING_PATH, SOURCE_PATH)
    return _display_path(history_path)


def discard_working() -> None:
    ensure_source_exists()
    ensure_layout()
    shutil.copy2(SOURCE_PATH, WORKING_PATH)
