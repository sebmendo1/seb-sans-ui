from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
import os
from statistics import median

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Experiment, Feedback, RoleConfig, SurveySession

CONTROLS = ("weight", "opsz", "tracking", "leading", "xheight")


def quartiles(values: list[float]) -> dict:
    ordered = sorted(values)
    if not ordered:
        return {"count": 0, "median": None, "q1": None, "q3": None, "values": []}
    midpoint = len(ordered) // 2
    lower = ordered[:midpoint] or ordered
    upper = ordered[midpoint + (len(ordered) % 2) :] or ordered
    return {
        "count": len(ordered),
        "median": median(ordered),
        "q1": median(lower),
        "q3": median(upper),
        "values": ordered,
    }


def build_summary(db: Session, experiment_id: int | None = None) -> dict:
    session_query = select(SurveySession)
    role_query = select(RoleConfig)
    if experiment_id:
        session_query = session_query.where(SurveySession.experiment_id == experiment_id)
        role_query = role_query.join(SurveySession).where(SurveySession.experiment_id == experiment_id)
    sessions = list(db.scalars(session_query))
    roles = list(db.scalars(role_query))
    completed = [session for session in sessions if session.completed_at]
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    active = [
        session
        for session in sessions
        if not session.completed_at
        and session.updated_at.replace(tzinfo=session.updated_at.tzinfo or timezone.utc) >= cutoff
    ]
    durations = [
        (session.completed_at - session.started_at).total_seconds()
        for session in completed
        if session.completed_at
    ]
    distributions: dict[str, dict] = {"display": {}, "body": {}}
    ratings: dict[str, list[int]] = {"display": [], "body": []}
    grouped: dict[str, dict[str, list[float]]] = {
        role: defaultdict(list) for role in ("display", "body")
    }
    for config in roles:
        for control in CONTROLS:
            grouped[config.role][control].append(float(config.final[control]))
        ratings[config.role].append(config.legibility_rating)
    for role in ("display", "body"):
        distributions[role] = {
            control: quartiles(grouped[role][control]) for control in CONTROLS
        }
        distributions[role]["rating"] = quartiles([float(value) for value in ratings[role]])
    active_experiment = db.scalar(select(Experiment).where(Experiment.status == "active"))
    minimum = int(os.getenv("RECOMMENDATION_MINIMUM", "5"))
    return {
        "sessions": len(sessions),
        "activeSessions": len(active),
        "completed": len(completed),
        "completionRate": len(completed) / len(sessions) if sessions else 0,
        "medianDurationSeconds": median(durations) if durations else None,
        "activeExperiment": experiment_to_dict(active_experiment) if active_experiment else None,
        "distributions": distributions,
        "smallSample": len(completed) < 10,
        "recommendationMinimum": minimum,
        "recommendationsReady": len(completed) >= minimum,
    }


def experiment_to_dict(experiment: Experiment) -> dict:
    return {
        "id": experiment.id,
        "version": experiment.version,
        "status": experiment.status,
        "displayDefaults": experiment.display_defaults,
        "bodyDefaults": experiment.body_defaults,
        "displaySample": experiment.display_sample,
        "bodySample": experiment.body_sample,
        "font": {
            "version": experiment.font_asset.version,
            "url": f"/{experiment.font_asset.relative_path}",
            "sha256": experiment.font_asset.sha256,
            "axes": experiment.font_asset.axes,
        },
        "createdAt": experiment.created_at.isoformat(),
    }


def submissions_payload(db: Session, experiment_id: int | None = None) -> list[dict]:
    query = select(SurveySession).where(SurveySession.completed_at.is_not(None))
    if experiment_id:
        query = query.where(SurveySession.experiment_id == experiment_id)
    sessions = list(db.scalars(query.order_by(SurveySession.completed_at.desc())))
    output = []
    for session in sessions:
        configs = {config.role: config for config in session.role_configs}
        feedback: Feedback | None = session.feedback
        output.append(
            {
                "id": session.id,
                "completionCode": session.completion_code,
                "experimentVersion": session.experiment.version,
                "completedAt": session.completed_at.isoformat() if session.completed_at else None,
                "durationSeconds": (
                    (session.completed_at - session.started_at).total_seconds()
                    if session.completed_at
                    else None
                ),
                "browserFamily": session.browser_family,
                "viewport": session.viewport,
                "display": role_to_dict(configs.get("display")),
                "body": role_to_dict(configs.get("body")),
                "feedback": {
                    "likes": feedback.likes,
                    "dislikes": feedback.dislikes,
                    "overallRating": feedback.overall_rating,
                    "feelings": feedback.feelings,
                }
                if feedback
                else None,
                "events": [
                    {
                        "role": event.role,
                        "control": event.control,
                        "value": event.value,
                        "elapsedMs": event.elapsed_ms,
                    }
                    for event in session.tuning_events
                ],
            }
        )
    return output


def role_to_dict(config: RoleConfig | None) -> dict | None:
    if not config:
        return None
    return {
        "initial": config.initial,
        "final": config.final,
        "text": config.final_text,
        "sampleEdited": config.sample_edited,
        "legibilityRating": config.legibility_rating,
    }
