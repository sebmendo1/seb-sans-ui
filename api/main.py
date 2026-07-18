from __future__ import annotations

import shutil
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, select

from .db import SessionLocal, engine
from .models import Experiment, FontAsset
from . import font_store
from .routers import admin, studio, survey
from .runtime import allowed_origins as cors_origins, configure_serverless, releases_dir

ROOT = Path(__file__).resolve().parents[1]
FONT_SHA = "7a9ee8556c97076547457fb800662fa92611e038299a67420df0092053525525"

DISPLAY_DEFAULTS = {
    "size": 36,
    "weight": 660,
    "opsz": 30,
    "tracking": -0.015,
    "leading": 1.1,
    "xheight": 100,
}
BODY_DEFAULTS = {
    "size": 18,
    "weight": 430,
    "opsz": 14,
    "tracking": 0,
    "leading": 1.55,
    "xheight": 100,
}
DISPLAY_SAMPLE = "The lamp that would not argue"
BODY_SAMPLE = (
    "The surveyor arrived in spring with instruments nobody recognized, and measured "
    "the village for a map nobody had asked for. Streets: 14. Wells: 3. Doors painted "
    "blue: 27. She wrote each number in a small canvas book, and the numbers lined up "
    "like fence posts.\n\n"
    "“Why count what we already know?” asked the innkeeper, watching her chart the square.\n\n"
    "“Because you know it differently than it is,” she said. “You remember 40 blue doors. "
    "There are 27. The map holds what the memory rounds.”"
)


def seed() -> None:
    with SessionLocal() as db:
        asset = db.scalar(select(FontAsset).where(FontAsset.sha256 == FONT_SHA))
        if not asset:
            asset = FontAsset(
                version="Seb Sans v0.5.1",
                relative_path="fonts/survey/v0.5.1/SebSansVar.woff2",
                sha256=FONT_SHA,
                axes={
                    "wght": {"min": 100, "default": 400, "max": 900},
                    "opsz": {"min": 14, "default": 14, "max": 32},
                    "XHGT": {"min": 82, "default": 100, "max": 122},
                },
            )
            db.add(asset)
            db.flush()
        if not db.scalar(select(Experiment)):
            db.add(
                Experiment(
                    version="survey-001",
                    status="active",
                    font_asset_id=asset.id,
                    display_defaults=DISPLAY_DEFAULTS,
                    body_defaults=BODY_DEFAULTS,
                    display_sample=DISPLAY_SAMPLE,
                    body_sample=BODY_SAMPLE,
                )
            )
        db.commit()


def migrate() -> None:
    config = Config(ROOT / "alembic.ini")
    inspector = inspect(engine)
    if inspector.has_table("survey_sessions") and not inspector.has_table("alembic_version"):
        command.stamp(config, "head")
        return
    command.upgrade(config, "head")


def startup() -> None:
    configure_serverless()
    try:
        font_store.ensure_layout()
        font_store.ensure_working_copy()
    except (font_store.FontStoreError, OSError, PermissionError):
        pass
    migrate()
    seed()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    startup()
    yield


def mount_frontend(app: FastAPI) -> None:
    dist = ROOT / "dist"
    if not dist.is_dir():
        return
    assets = dist / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="frontend-assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa_fallback(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = dist / path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(dist / "index.html")


app = FastAPI(title="Seb Sans Legibility Survey", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(survey.router)
app.include_router(admin.router)
app.include_router(studio.router)
app.mount("/fonts", StaticFiles(directory=ROOT / "fonts"), name="fonts")
if (ROOT / "icons").is_dir():
    app.mount("/icons", StaticFiles(directory=ROOT / "icons"), name="icons")
releases_path = releases_dir()
app.mount("/releases", StaticFiles(directory=releases_path), name="releases")


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "tools": {
            "harfbuzz": bool(shutil.which("hb-shape")),
            "ttfautohint": bool(shutil.which("ttfautohint")),
            "ots": bool(shutil.which("ots-sanitize")),
        },
    }


mount_frontend(app)
