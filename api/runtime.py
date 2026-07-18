from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def is_vercel() -> bool:
    return os.getenv("VERCEL") == "1"


def data_dir() -> Path:
    if is_vercel():
        path = Path("/tmp/seb-sans-data")
    else:
        path = ROOT / "data"
    path.mkdir(parents=True, exist_ok=True)
    return path


def backup_dir() -> Path:
    path = data_dir() / "backups"
    path.mkdir(parents=True, exist_ok=True)
    return path


def releases_dir() -> Path:
    if is_vercel():
        path = Path("/tmp/seb-sans-releases")
    else:
        path = ROOT / "releases"
    path.mkdir(parents=True, exist_ok=True)
    return path


def configure_serverless() -> None:
    backup_dir()
    releases_dir()
    if not is_vercel():
        return
    font_dir = Path("/tmp/seb-sans-fonts")
    font_dir.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("STUDIO_FONT_DIR", str(font_dir))


def allowed_origins() -> list[str]:
    configured = os.getenv("ALLOWED_ORIGINS", "").strip()
    if configured:
        origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    else:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    for env_name in ("VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_BRANCH_URL"):
        host = os.getenv(env_name, "").strip()
        if host:
            origins.append(f"https://{host.removeprefix('https://')}")
    deduped: list[str] = []
    seen: set[str] = set()
    for origin in origins:
        if origin not in seen:
            seen.add(origin)
            deduped.append(origin)
    return deduped
