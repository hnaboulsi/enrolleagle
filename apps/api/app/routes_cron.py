from __future__ import annotations

from flask import Blueprint, current_app, g, jsonify, request

from app.cron_tick import run_tick

bp = Blueprint("cron", __name__, url_prefix="/cron")


@bp.get("/tick")
def cron_tick():
    config = current_app.config["APP_CONFIG"]
    token = request.args.get("token") or request.headers.get("X-Cron-Token")
    if token != config.cron_secret:
        return jsonify({"error": "Unauthorized"}), 401

    summary = run_tick(
        g.db,
        app_config=config,
        provider_registry=current_app.extensions["provider_registry"],
        email_sender=current_app.extensions["email_sender"],
    )
    return jsonify(summary)
