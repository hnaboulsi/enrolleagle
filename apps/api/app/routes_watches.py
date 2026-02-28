from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import func, select

from app.auth import login_required
from app.models import Watch
from app.schemas import ValidationError, parse_watch_create_payload, parse_watch_patch_payload
from enrolleagle_providers import build_watch_from_user_input

bp = Blueprint("watches", __name__)


def _watch_to_dict(watch: Watch) -> dict:
    return {
        "id": str(watch.id),
        "provider": watch.provider,
        "section_ref": watch.section_ref,
        "term_ref": watch.term_ref,
        "fetch_key": watch.fetch_key,
        "source_url": watch.source_url,
        "campus_code": watch.campus_code,
        "notify_on_waitlist": watch.notify_on_waitlist,
        "last_open_seats": watch.last_open_seats,
        "last_waitlist_open_seats": watch.last_waitlist_open_seats,
        "last_status": watch.last_status,
        "last_checked_at": watch.last_checked_at.isoformat() if watch.last_checked_at else None,
        "next_run_at": watch.next_run_at.isoformat(),
        "cadence_seconds": watch.cadence_seconds,
        "is_active": watch.is_active,
        "created_at": watch.created_at.isoformat(),
        "updated_at": watch.updated_at.isoformat(),
    }


@bp.get("/watches")
@login_required
def list_watches():
    user = g.current_user
    rows = (
        g.db.execute(
            select(Watch)
            .where(Watch.user_id == user.id)
            .order_by(Watch.created_at.desc())
        )
        .scalars()
        .all()
    )
    return jsonify({"items": [_watch_to_dict(item) for item in rows]})


@bp.post("/watches")
@login_required
def create_watch():
    config = current_app.config["APP_CONFIG"]
    payload = request.get_json(silent=True) or {}

    # Check active watch limit
    active_count = g.db.execute(
        select(func.count(Watch.id)).where(
            Watch.user_id == g.current_user.id,
            Watch.is_active.is_(True),
        )
    ).scalar_one()
    if active_count >= config.max_active_watches:
        return jsonify({"error": f"Active watch limit reached ({config.max_active_watches})"}), 400

    # ----- New path: create from search results (section_id) -----
    section_id = payload.get("section_id")
    school_id = payload.get("school_id")
    if section_id and school_id:
        term_ref = payload.get("term_ref", "current")
        notify_on_waitlist = bool(payload.get("notify_on_waitlist", False))
        cadence_seconds = max(120, int(payload.get("cadence_seconds", 120)))

        # section_id format: "CRN:12345"
        section_ref = section_id.replace("CRN:", "").strip()
        provider = school_id  # school_id maps to provider key
        fetch_key = f"{provider}:{term_ref}:{section_ref}"
        source_url = payload.get("source_url")

        watch = Watch(
            user_id=g.current_user.id,
            provider=provider,
            section_ref=section_ref,
            term_ref=term_ref,
            fetch_key=fetch_key,
            source_url=source_url,
            campus_code=payload.get("campus_code"),
            notify_on_waitlist=notify_on_waitlist,
            cadence_seconds=cadence_seconds,
            last_status="UNKNOWN",
            next_run_at=datetime.now(timezone.utc),
            is_active=True,
            report_hmac_salt=secrets.token_hex(16),
        )

        g.db.add(watch)
        g.db.commit()
        g.db.refresh(watch)
        return jsonify(_watch_to_dict(watch)), 201

    # ----- Legacy path: create from CRN/URL -----
    try:
        parsed = parse_watch_create_payload(payload)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        built = build_watch_from_user_input(
            {
                "provider": parsed.provider,
                "term_ref": parsed.term_ref,
                "pasted_url": parsed.pasted_url,
                "crn": parsed.crn,
                "class_number": parsed.class_number,
                "campus_code": parsed.campus_code,
            }
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    watch = Watch(
        user_id=g.current_user.id,
        provider=parsed.provider,
        section_ref=built["section_ref"],
        term_ref=built["term_ref"],
        fetch_key=built["fetch_key"],
        source_url=built.get("source_url"),
        campus_code=parsed.campus_code,
        notify_on_waitlist=parsed.notify_on_waitlist,
        cadence_seconds=parsed.cadence_seconds,
        last_status="UNKNOWN",
        next_run_at=datetime.now(timezone.utc),
        is_active=True,
        report_hmac_salt=secrets.token_hex(16),
    )

    g.db.add(watch)
    g.db.commit()
    g.db.refresh(watch)

    return jsonify(_watch_to_dict(watch)), 201


@bp.patch("/watches/<watch_id>")
@login_required
def patch_watch(watch_id: str):
    try:
        watch_uuid = uuid.UUID(watch_id)
    except ValueError:
        return jsonify({"error": "Invalid watch id"}), 400

    watch = (
        g.db.execute(
            select(Watch).where(Watch.id == watch_uuid, Watch.user_id == g.current_user.id)
        )
        .scalars()
        .first()
    )
    if watch is None:
        return jsonify({"error": "Watch not found"}), 404

    payload = request.get_json(silent=True) or {}
    try:
        patch = parse_watch_patch_payload(payload)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400

    if patch.is_active is not None:
        if patch.is_active and not watch.is_active:
            config = current_app.config["APP_CONFIG"]
            active_count = g.db.execute(
                select(func.count(Watch.id)).where(
                    Watch.user_id == g.current_user.id,
                    Watch.is_active.is_(True),
                )
            ).scalar_one()
            if active_count >= config.max_active_watches:
                return jsonify({"error": f"Active watch limit reached ({config.max_active_watches})"}), 400
        watch.is_active = patch.is_active
        if not patch.is_active:
            watch.last_status = "PAUSED"
    if patch.notify_on_waitlist is not None:
        watch.notify_on_waitlist = patch.notify_on_waitlist
    if patch.cadence_seconds is not None:
        watch.cadence_seconds = patch.cadence_seconds

    g.db.commit()
    g.db.refresh(watch)

    return jsonify(_watch_to_dict(watch))


@bp.delete("/watches/<watch_id>")
@login_required
def delete_watch(watch_id: str):
    try:
        watch_uuid = uuid.UUID(watch_id)
    except ValueError:
        return jsonify({"error": "Invalid watch id"}), 400

    watch = (
        g.db.execute(
            select(Watch).where(Watch.id == watch_uuid, Watch.user_id == g.current_user.id)
        )
        .scalars()
        .first()
    )
    if watch is None:
        return jsonify({"error": "Watch not found"}), 404

    watch.is_active = False
    watch.last_status = "DELETED"
    g.db.commit()

    return jsonify({"ok": True})
