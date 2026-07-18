"""Vercel serverless entrypoint for the FastAPI app."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

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
