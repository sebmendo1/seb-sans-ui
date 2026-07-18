from __future__ import annotations

import hashlib
import os
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLED_SOURCE = ROOT / "fonts" / "SebSansVar.ttf"


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


def font_dir() -> Path:
    return Path(os.environ.get("STUDIO_FONT_DIR", str(ROOT / "fonts")))


def source_path() -> Path:
    return font_dir() / "SebSansVar.ttf"


def working_dir() -> Path:
    return font_dir() / "_working"


def working_path() -> Path:
    return working_dir() / "SebSansVar.ttf"


def history_dir() -> Path:
    return font_dir() / "_history"


def baseline_dir() -> Path:
    return font_dir() / "_baseline"


def _display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        try:
            return str(path.relative_to(font_dir().parent))
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
    working_dir().mkdir(parents=True, exist_ok=True)
    history_dir().mkdir(parents=True, exist_ok=True)
    baseline_dir().mkdir(parents=True, exist_ok=True)


def ensure_source_exists() -> None:
    source = source_path()
    if source.is_file():
        return
    if BUNDLED_SOURCE.is_file() and source != BUNDLED_SOURCE:
        source.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(BUNDLED_SOURCE, source)
        return
    raise FontStoreError(
        "SOURCE_FONT_MISSING",
        f"Source font not found at {source}",
    )


def ensure_working_copy() -> None:
    ensure_layout()
    ensure_source_exists()
    working = working_path()
    source = source_path()
    if not working.is_file():
        shutil.copy2(source, working)


def read_source_bytes() -> bytes:
    ensure_source_exists()
    return source_path().read_bytes()


def read_working_bytes() -> bytes:
    ensure_working_copy()
    return working_path().read_bytes()


def status() -> FontStatus:
    ensure_working_copy()
    source = source_path()
    working = working_path()
    source_sha = _sha256(source)
    working_sha = _sha256(working)
    history_count = len(list(history_dir().glob("SebSansVar-*.ttf")))
    return FontStatus(
        source_path=_display_path(source),
        working_path=_display_path(working),
        source_bytes=source.stat().st_size,
        working_bytes=working.stat().st_size,
        source_sha256=source_sha,
        working_sha256=working_sha,
        working_matches_source=source_sha == working_sha,
        history_count=history_count,
    )


def save_working_to_source() -> str:
    ensure_working_copy()
    source = source_path()
    working = working_path()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    history_path = history_dir() / f"SebSansVar-{timestamp}.ttf"
    shutil.copy2(source, history_path)
    _atomic_replace(working, source)
    return _display_path(history_path)


def discard_working() -> None:
    ensure_source_exists()
    ensure_layout()
    shutil.copy2(source_path(), working_path())
