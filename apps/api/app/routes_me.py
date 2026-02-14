from __future__ import annotations

from flask import Blueprint, current_app, g, jsonify

from app.auth import get_authenticated_user

bp = Blueprint("me", __name__)


@bp.get("/me")
def me():
    config = current_app.config["APP_CONFIG"]
    user = get_authenticated_user(g.db, config)
    if user is None:
        return jsonify({"error": "Unauthorized"}), 401

    return jsonify(
        {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "created_at": user.created_at.isoformat(),
        }
    )
