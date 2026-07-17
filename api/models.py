from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class FontAsset(Base):
    __tablename__ = "font_assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[str] = mapped_column(String(32), unique=True)
    relative_path: Mapped[str] = mapped_column(String(255))
    sha256: Mapped[str] = mapped_column(String(64), unique=True)
    axes: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[str] = mapped_column(String(32), unique=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    font_asset_id: Mapped[int] = mapped_column(ForeignKey("font_assets.id"))
    display_defaults: Mapped[dict] = mapped_column(JSON)
    body_defaults: Mapped[dict] = mapped_column(JSON)
    display_sample: Mapped[str] = mapped_column(Text)
    body_sample: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    font_asset: Mapped[FontAsset] = relationship()


class SurveySession(Base):
    __tablename__ = "survey_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    token_hash: Mapped[str] = mapped_column(String(64))
    experiment_id: Mapped[int] = mapped_column(ForeignKey("experiments.id"))
    experiment_snapshot: Mapped[dict] = mapped_column(JSON)
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    revision: Mapped[int] = mapped_column(Integer, default=0)
    draft: Mapped[dict] = mapped_column(JSON, default=dict)
    viewport: Mapped[dict] = mapped_column(JSON, default=dict)
    browser_family: Mapped[str | None] = mapped_column(String(40), nullable=True)
    variable_font_supported: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completion_code: Mapped[str | None] = mapped_column(String(16), nullable=True, unique=True)

    experiment: Mapped[Experiment] = relationship()
    role_configs: Mapped[list["RoleConfig"]] = relationship(cascade="all, delete-orphan")
    tuning_events: Mapped[list["TuningEvent"]] = relationship(cascade="all, delete-orphan")
    feedback: Mapped["Feedback | None"] = relationship(cascade="all, delete-orphan")


class RoleConfig(Base):
    __tablename__ = "role_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("survey_sessions.id"))
    role: Mapped[str] = mapped_column(String(10))
    initial: Mapped[dict] = mapped_column(JSON)
    final: Mapped[dict] = mapped_column(JSON)
    final_text: Mapped[str] = mapped_column(Text)
    sample_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    legibility_rating: Mapped[int] = mapped_column(Integer)


class TuningEvent(Base):
    __tablename__ = "tuning_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("survey_sessions.id"))
    role: Mapped[str] = mapped_column(String(10))
    control: Mapped[str] = mapped_column(String(16))
    value: Mapped[float] = mapped_column(Float)
    elapsed_ms: Mapped[int] = mapped_column(Integer)


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("survey_sessions.id"), unique=True)
    likes: Mapped[str] = mapped_column(Text)
    dislikes: Mapped[str] = mapped_column(Text)
    overall_rating: Mapped[int] = mapped_column(Integer)
    feelings: Mapped[str] = mapped_column(Text)
