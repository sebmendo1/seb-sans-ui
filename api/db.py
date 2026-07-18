from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local")

default_db = ROOT / "data" / "survey.sqlite3"
if os.getenv("VERCEL"):
    default_db = Path("/tmp/seb-sans-survey.sqlite3")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{default_db}")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)


@event.listens_for(engine, "connect")
def configure_sqlite(connection, _record) -> None:
    if DATABASE_URL.startswith("sqlite"):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
