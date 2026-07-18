"""Vercel serverless entrypoint for the FastAPI app."""

from __future__ import annotations

from mangum import Mangum

from api.main import app as fastapi_app
from api.main import startup

startup()
app = Mangum(fastapi_app, lifespan="off")
