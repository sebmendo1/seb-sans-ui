"""Vercel serverless entrypoint for the FastAPI app."""

from __future__ import annotations

import logging

from mangum import Mangum

from api.main import app as fastapi_app
from api.main import startup

logger = logging.getLogger(__name__)

try:
    startup()
except Exception:
    logger.exception("API startup failed on Vercel")
    raise

app = Mangum(fastapi_app, lifespan="off")
