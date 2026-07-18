from __future__ import annotations

import csv
import io
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..auth import ADMIN_PIN, COOKIE_NAME, create_admin_token, require_admin
from ..db import DATABASE_URL, get_db
from ..models import Experiment
from ..runtime import backup_dir
from ..schemas import AdminLogin, ExperimentCreate
from ..services.analytics import build_summary, experiment_to_dict, submissions_payload
from ..services.events import broker

router = APIRouter(prefix="/api/admin", tags=["admin"])
ROOT = Path(__file__).resolve().parents[2]


@router.post("/session")
def login(payload: AdminLogin, response: Response):
    if payload.pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    response.set_cookie(
        COOKIE_NAME,
        create_admin_token(),
        httponly=True,
        samesite="strict",
        secure=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
        max_age=60 * 60 * 12,
    )
    return {"ok": True}


@router.get("/me", dependencies=[Depends(require_admin)])
def me():
    return {"authenticated": True}


@router.get("/summary", dependencies=[Depends(require_admin)])
def summary(experiment_id: int | None = None, db: Session = Depends(get_db)):
    return build_summary(db, experiment_id)


@router.get("/submissions", dependencies=[Depends(require_admin)])
def submissions(experiment_id: int | None = None, db: Session = Depends(get_db)):
    return {"items": submissions_payload(db, experiment_id)}


@router.get("/experiments", dependencies=[Depends(require_admin)])
def experiments(db: Session = Depends(get_db)):
    rows = list(db.scalars(select(Experiment).order_by(Experiment.id.desc())))
    return {"items": [experiment_to_dict(row) for row in rows]}


@router.get("/events", dependencies=[Depends(require_admin)])
async def events():
    return StreamingResponse(
        broker.stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/experiments", dependencies=[Depends(require_admin)])
async def create_experiment(payload: ExperimentCreate, db: Session = Depends(get_db)):
    active = db.scalar(select(Experiment).where(Experiment.status == "active"))
    if not active:
        raise HTTPException(status_code=409, detail="No source experiment")
    count = db.scalar(select(func.count(Experiment.id))) or 0
    experiment = Experiment(
        version=f"survey-{count + 1:03d}",
        status="draft",
        font_asset_id=active.font_asset_id,
        display_defaults=payload.display_defaults.model_dump(),
        body_defaults=payload.body_defaults.model_dump(),
        display_sample=payload.display_sample,
        body_sample=payload.body_sample,
    )
    db.add(experiment)
    db.commit()
    await broker.publish("experiment_created", {"experimentId": experiment.id})
    return experiment_to_dict(experiment)


@router.post("/experiments/{experiment_id}/activate", dependencies=[Depends(require_admin)])
async def activate_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.get(Experiment, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    db.execute(update(Experiment).values(status="archived"))
    experiment.status = "active"
    db.commit()
    await broker.publish("experiment_activated", {"experimentId": experiment.id})
    return experiment_to_dict(experiment)


@router.get("/export.json", dependencies=[Depends(require_admin)])
def export_json(db: Session = Depends(get_db)):
    return JSONResponse(
        {"exportedAt": datetime.now(timezone.utc).isoformat(), "submissions": submissions_payload(db)},
        headers={"Content-Disposition": 'attachment; filename="seb-sans-survey.json"'},
    )


@router.get("/export.csv", dependencies=[Depends(require_admin)])
def export_csv(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    controls = ("size", "weight", "opsz", "tracking", "leading", "xheight")
    writer.writerow(
        ["completion_code", "experiment", "completed_at"]
        + [f"display_{control}" for control in controls]
        + [f"body_{control}" for control in controls]
        + ["display_rating", "body_rating", "overall_rating", "likes", "dislikes", "feelings"]
    )
    for item in submissions_payload(db):
        writer.writerow(
            [item["completionCode"], item["experimentVersion"], item["completedAt"]]
            + [item["display"]["final"][control] for control in controls]
            + [item["body"]["final"][control] for control in controls]
            + [
                item["display"]["legibilityRating"],
                item["body"]["legibilityRating"],
                item["feedback"]["overallRating"],
                item["feedback"]["likes"],
                item["feedback"]["dislikes"],
                item["feedback"]["feelings"],
            ]
        )
    return Response(
        output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="seb-sans-survey.csv"'},
    )


@router.get("/recommendations.json", dependencies=[Depends(require_admin)])
def recommendations(db: Session = Depends(get_db)):
    summary = build_summary(db)
    active = summary["activeExperiment"]
    suggested = {}
    for role in ("display", "body"):
        suggested[role] = {
            control: distribution["median"]
            for control, distribution in summary["distributions"][role].items()
            if control != "rating" and distribution["median"] is not None
        }
    return JSONResponse(
        {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sampleSize": summary["completed"],
            "minimumSampleSize": summary["recommendationMinimum"],
            "ready": summary["recommendationsReady"],
            "experiment": active["version"] if active else None,
            "fontSha256": active["font"]["sha256"] if active else None,
            "suggested": suggested,
        },
        headers={"Content-Disposition": 'attachment; filename="recommendations.json"'},
    )


@router.post("/backup", dependencies=[Depends(require_admin)])
def backup():
    if not DATABASE_URL.startswith("sqlite:///"):
        raise HTTPException(status_code=400, detail="Backup is only available for SQLite")
    source_path = Path(DATABASE_URL.removeprefix("sqlite:///"))
    if not source_path.is_absolute():
        source_path = ROOT / source_path
    backup_dir_path = backup_dir()
    destination = backup_dir_path / f"survey-{datetime.now().strftime('%Y%m%d-%H%M%S')}.sqlite3"
    with sqlite3.connect(source_path) as source, sqlite3.connect(destination) as target:
        source.backup(target)
    try:
        path = str(destination.relative_to(ROOT))
    except ValueError:
        path = str(destination)
    return {"ok": True, "path": path}
