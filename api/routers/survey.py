from __future__ import annotations

import hmac
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import hash_session_token, new_session_token
from ..db import get_db
from ..models import Experiment, Feedback, RoleConfig, SurveySession, TuningEvent
from ..schemas import DraftUpdate, SessionCreate, SubmitRequest, SurveyState
from ..services.analytics import experiment_to_dict
from ..services.events import broker

router = APIRouter(prefix="/api/survey", tags=["survey"])


def active_experiment(db: Session) -> Experiment:
    experiment = db.scalar(select(Experiment).where(Experiment.status == "active"))
    if not experiment:
        raise HTTPException(status_code=503, detail="No active experiment")
    return experiment


def verify_session(db: Session, session_id: str, token: str | None) -> SurveySession:
    session = db.get(SurveySession, session_id)
    if not session or not token or not hmac.compare_digest(session.token_hash, hash_session_token(token)):
        raise HTTPException(status_code=404, detail="Survey session not found")
    return session


def validate_role_ranges(state: SurveyState, snapshot: dict) -> None:
    display = state.display
    body = state.body
    if display.size != snapshot["displayDefaults"]["size"] or not 0.85 <= display.leading <= 1.8:
        raise HTTPException(status_code=422, detail="Display settings outside experiment range")
    if not -0.05 <= display.tracking <= 0.08:
        raise HTTPException(status_code=422, detail="Display tracking outside experiment range")
    if body.size != snapshot["bodyDefaults"]["size"] or not 300 <= body.weight <= 700:
        raise HTTPException(status_code=422, detail="Body settings outside experiment range")
    if not 1.1 <= body.leading <= 2 or not -0.03 <= body.tracking <= 0.06:
        raise HTTPException(status_code=422, detail="Body settings outside experiment range")


def save_events(db: Session, session: SurveySession, events) -> None:
    for event in events:
        db.add(
            TuningEvent(
                session_id=session.id,
                role=event.role,
                control=event.control,
                value=event.value,
                elapsed_ms=event.elapsed_ms,
            )
        )


@router.get("/config")
def get_config(db: Session = Depends(get_db)):
    return experiment_to_dict(active_experiment(db))


@router.post("/sessions")
async def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    experiment = active_experiment(db)
    token = new_session_token()
    snapshot = experiment_to_dict(experiment)
    session = SurveySession(
        token_hash=hash_session_token(token),
        experiment_id=experiment.id,
        experiment_snapshot=snapshot,
        viewport=payload.viewport,
        browser_family=payload.browser_family,
        variable_font_supported=payload.variable_font_supported,
    )
    db.add(session)
    db.commit()
    await broker.publish("session_started", {"sessionId": session.id})
    return {
        "sessionId": session.id,
        "sessionToken": token,
        "revision": session.revision,
        "experiment": snapshot,
    }


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    x_session_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    session = verify_session(db, session_id, x_session_token)
    return {
        "sessionId": session.id,
        "revision": session.revision,
        "currentStep": session.current_step,
        "state": session.draft,
        "completed": bool(session.completed_at),
        "completionCode": session.completion_code,
        "experiment": session.experiment_snapshot,
    }


@router.put("/sessions/{session_id}/draft")
async def update_draft(
    session_id: str,
    payload: DraftUpdate,
    x_session_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    session = verify_session(db, session_id, x_session_token)
    if session.completed_at:
        raise HTTPException(status_code=409, detail="Submission already completed")
    if payload.revision != session.revision:
        raise HTTPException(
            status_code=409,
            detail={"message": "Stale draft", "revision": session.revision},
        )
    validate_role_ranges(payload.state, session.experiment_snapshot)
    session.draft = payload.state.model_dump()
    session.current_step = payload.current_step
    session.revision += 1
    session.updated_at = datetime.now(timezone.utc)
    save_events(db, session, payload.events)
    db.commit()
    await broker.publish("draft_saved", {"sessionId": session.id, "step": session.current_step})
    return {"revision": session.revision}


@router.post("/sessions/{session_id}/submit")
async def submit(
    session_id: str,
    payload: SubmitRequest,
    x_session_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    session = verify_session(db, session_id, x_session_token)
    if session.completed_at:
        return {"completionCode": session.completion_code, "alreadyCompleted": True}
    if payload.revision != session.revision:
        raise HTTPException(
            status_code=409,
            detail={"message": "Stale submission", "revision": session.revision},
        )
    validate_role_ranges(payload.state, session.experiment_snapshot)
    if not payload.state.likes.strip() or not payload.state.dislikes.strip():
        raise HTTPException(status_code=422, detail="Likes and changes are required")
    snapshot = session.experiment_snapshot
    state = payload.state
    for role in ("display", "body"):
        config = getattr(state, role)
        text = getattr(state, f"{role}_text")
        sample = snapshot[f"{role}Sample"]
        db.add(
            RoleConfig(
                session_id=session.id,
                role=role,
                initial=snapshot[f"{role}Defaults"],
                final=config.model_dump(),
                final_text=text,
                sample_edited=text.strip() != sample.strip(),
                legibility_rating=getattr(state, f"{role}_rating"),
            )
        )
    db.add(
        Feedback(
            session_id=session.id,
            likes=state.likes.strip(),
            dislikes=state.dislikes.strip(),
            overall_rating=state.overall_rating,
            feelings=state.feelings.strip(),
        )
    )
    save_events(db, session, payload.events)
    session.draft = state.model_dump()
    session.current_step = 5
    session.revision += 1
    session.completed_at = datetime.now(timezone.utc)
    session.updated_at = session.completed_at
    session.completion_code = f"SEB-{secrets.token_hex(3).upper()}"
    db.commit()
    await broker.publish("submission_completed", {"sessionId": session.id})
    return {"completionCode": session.completion_code, "alreadyCompleted": False}
