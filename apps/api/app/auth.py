from __future__ import annotations

import uuid
from functools import wraps
from typing import Callable

from flask import current_app, g, jsonify, request
from sqlalchemy.orm import Session

from app.config import AppConfig
from app.models import User
from app.session import load_payload, sign_payload

SESSION_SALT = "enrolleagle-session"
OAUTH_STATE_SALT = "enrolleagle-oauth-state"


def set_session_cookie(response, config: AppConfig, user: User) -> None:
    token = sign_payload(
        config.session_secret,
        SESSION_SALT,
        {
            "user_id": str(user.id),
            "email": user.email,
        },
    )
    response.set_cookie(
        config.session_cookie_name,
        token,
        max_age=config.session_ttl_seconds,
        httponly=True,
        secure=config.cookie_secure,
        samesite=config.session_same_site,
        path="/",
    )


def clear_session_cookie(response, config: AppConfig) -> None:
    response.delete_cookie(config.session_cookie_name, path="/")


def set_oauth_state_cookie(response, config: AppConfig, state: str) -> None:
    token = sign_payload(config.session_secret, OAUTH_STATE_SALT, {"state": state})
    response.set_cookie(
        config.oauth_state_cookie_name,
        token,
        max_age=600,
        httponly=True,
        secure=config.cookie_secure,
        samesite=config.session_same_site,
        path="/",
    )


def clear_oauth_state_cookie(response, config: AppConfig) -> None:
    response.delete_cookie(config.oauth_state_cookie_name, path="/")


def validate_oauth_state(config: AppConfig, expected_state: str) -> bool:
    token = request.cookies.get(config.oauth_state_cookie_name)
    if not token:
        return False
    payload = load_payload(config.session_secret, OAUTH_STATE_SALT, token, max_age_seconds=600)
    if payload is None:
        return False
    return payload.get("state") == expected_state


def get_authenticated_user(db: Session, config: AppConfig) -> User | None:
    token = request.cookies.get(config.session_cookie_name)
    if not token:
        return None

    payload = load_payload(config.session_secret, SESSION_SALT, token, max_age_seconds=config.session_ttl_seconds)
    if payload is None:
        return None

    user_id = payload.get("user_id")
    if not user_id:
        return None

    try:
        user_uuid = uuid.UUID(str(user_id))
    except ValueError:
        return None

    user = db.get(User, user_uuid)
    if user is None:
        return None

    g.current_user = user
    g.refresh_session_cookie = True
    return user


def login_required(view: Callable):
    @wraps(view)
    def wrapped(*args, **kwargs):
        config: AppConfig = current_app.config["APP_CONFIG"]
        db: Session = g.db
        user = get_authenticated_user(db, config)
        if user is None:
            return jsonify({"error": "Unauthorized"}), 401
        return view(*args, **kwargs)

    return wrapped
