from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time

from fastapi import Cookie, HTTPException

ADMIN_PIN = os.getenv("ADMIN_PIN", "sebsans")
SECRET = os.getenv("ADMIN_SECRET", hashlib.sha256(f"seb-sans:{ADMIN_PIN}".encode()).hexdigest())
COOKIE_NAME = "seb_sans_admin"


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def create_admin_token() -> str:
    expires = str(int(time.time()) + 60 * 60 * 12)
    signature = hmac.new(SECRET.encode(), expires.encode(), hashlib.sha256).hexdigest()
    return f"{expires}.{signature}"


def require_admin(seb_sans_admin: str | None = Cookie(default=None)) -> None:
    if not seb_sans_admin:
        raise HTTPException(status_code=401, detail="Admin login required")
    try:
        expires, signature = seb_sans_admin.split(".", 1)
    except ValueError as error:
        raise HTTPException(status_code=401, detail="Invalid admin session") from error
    expected = hmac.new(SECRET.encode(), expires.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected) or int(expires) < time.time():
        raise HTTPException(status_code=401, detail="Admin session expired")
