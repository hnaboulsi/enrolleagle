from __future__ import annotations

import secrets
from urllib.parse import urlencode

import httpx
from flask import Blueprint, current_app, g, jsonify, redirect, request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import or_, select

from app.auth import clear_oauth_state_cookie, clear_session_cookie, set_oauth_state_cookie, set_session_cookie, validate_oauth_state
from app.config import AppConfig
from app.models import User

bp = Blueprint("auth", __name__, url_prefix="/auth")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
VALID_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def exchange_code_for_tokens(config: AppConfig, code: str) -> dict:
    response = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": config.google_client_id,
            "client_secret": config.google_client_secret,
            "redirect_uri": config.google_redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def verify_google_id_token(token: str, audience: str) -> dict:
    claims = id_token.verify_oauth2_token(token, google_requests.Request(), audience=audience)
    if claims.get("iss") not in VALID_ISSUERS:
        raise ValueError("Invalid token issuer")
    return claims


@bp.get("/google/start")
def google_start():
    config: AppConfig = current_app.config["APP_CONFIG"]

    if not config.google_client_id:
        return jsonify({"error": "Google OAuth is not configured"}), 500

    state = secrets.token_urlsafe(32)
    params = {
        "client_id": config.google_client_id,
        "redirect_uri": config.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }

    redirect_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    response = redirect(redirect_url, code=302)
    set_oauth_state_cookie(response, config, state)
    return response


@bp.get("/google/callback")
def google_callback():
    config: AppConfig = current_app.config["APP_CONFIG"]
    db = g.db

    def _callback_error(message: str, status_code: int):
        response = jsonify({"error": message})
        clear_oauth_state_cookie(response, config)
        return response, status_code

    code = request.args.get("code")
    state = request.args.get("state")

    if not code or not state:
        return _callback_error("Missing code/state", 400)

    if not validate_oauth_state(config, state):
        return _callback_error("Invalid OAuth state", 400)

    try:
        tokens = exchange_code_for_tokens(config, code)
        id_token_value = tokens["id_token"]
        claims = verify_google_id_token(id_token_value, config.google_client_id)
    except Exception as exc:
        return _callback_error(f"Google OAuth failed: {exc}", 400)

    google_sub = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    email_verified = bool(claims.get("email_verified"))
    name = str(claims.get("name") or "").strip() or None

    if not google_sub or not email:
        return _callback_error("Google identity missing required fields", 400)
    if not email_verified:
        return _callback_error("Google email is not verified", 400)

    existing = db.execute(
        select(User).where(or_(User.google_sub == google_sub, User.email == email))
    ).scalars().first()

    if existing is None:
        user = User(email=email, google_sub=google_sub, name=name)
        db.add(user)
    else:
        user = existing
        user.email = email
        user.google_sub = google_sub
        user.name = name

    db.commit()

    response = redirect(f"{config.frontend_url.rstrip('/')}/dashboard", code=302)
    set_session_cookie(response, config, user)
    clear_oauth_state_cookie(response, config)
    return response


@bp.post("/logout")
def logout():
    config: AppConfig = current_app.config["APP_CONFIG"]
    response = jsonify({"ok": True})
    clear_session_cookie(response, config)
    return response, 200
