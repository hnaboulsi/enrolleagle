from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import select

from app.cron_tick import apply_status_to_watch
from app.models import NotificationLog, Watch

bp = Blueprint("report", __name__)


def _verify_signature(secret: str, watch_salt: str, payload_bytes: bytes, signature: str) -> bool:
    signing_key = f"{secret}:{watch_salt}".encode("utf-8")
    expected = hmac.new(signing_key, payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@bp.post("/report")
def browser_report():
    config = current_app.config["APP_CONFIG"]
    signature = request.headers.get("X-Report-Signature")
    if not signature:
        return jsonify({"error": "Missing X-Report-Signature"}), 401

    raw_payload = request.get_data() or b""
    payload = request.get_json(silent=True) or {}
    watch_id = payload.get("watch_id")
    if not watch_id:
        return jsonify({"error": "watch_id is required"}), 400

    try:
        watch_uuid = uuid.UUID(str(watch_id))
    except ValueError:
        return jsonify({"error": "Invalid watch id"}), 400

    watch = g.db.execute(select(Watch).where(Watch.id == watch_uuid)).scalars().first()
    if watch is None:
        return jsonify({"error": "watch not found"}), 404

    if not _verify_signature(config.report_hmac_secret, watch.report_hmac_salt, raw_payload, signature):
        return jsonify({"error": "Invalid report signature"}), 401

    status_payload = {
        "open_seats": payload.get("open_seats"),
        "waitlist_open_seats": payload.get("waitlist_open_seats"),
        "status": payload.get("status") or "UNKNOWN",
        "source_url": payload.get("source_url") or watch.source_url,
        "raw_excerpt": (payload.get("raw_excerpt") or "browser_report")[:500],
        "block_reason": None,
    }

    checked_at = datetime.now(timezone.utc)
    pending = apply_status_to_watch(g.db, watch, status_payload, checked_at)
    g.db.commit()

    email_sender = current_app.extensions["email_sender"]
    sent = 0
    for item in pending:
        subject = f"Seat Update: {item.provider} {item.section_ref} ({item.term_ref})"
        text = (
            f"Provider: {item.provider}\n"
            f"Term: {item.term_ref}\n"
            f"Section: {item.section_ref}\n"
            f"Open seats: {item.open_seats}\n"
            f"Waitlist seats: {item.waitlist_open_seats}"
        )
        html = text.replace("\n", "<br/>")

        try:
            response = email_sender.send_email(
                to=item.email,
                subject=subject,
                text=text,
                html=html,
            )
            sent_at = datetime.now(timezone.utc)
            sent += 1
        except Exception as exc:  # pragma: no cover - failure path
            response = {"ok": False, "error": str(exc)}
            sent_at = None

        log = g.db.get(NotificationLog, item.notification_log_id)
        if log:
            log.provider_response = response
            log.sent_at = sent_at

    g.db.commit()

    return jsonify({"ok": True, "queued": len(pending), "sent": sent})
