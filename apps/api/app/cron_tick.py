from __future__ import annotations

import hashlib
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import NotificationLog, SeatSnapshot, Watch


@dataclass(slots=True)
class PendingNotification:
    notification_log_id: uuid.UUID
    watch_id: str
    email: str
    trigger_type: str
    provider: str
    section_ref: str
    term_ref: str
    open_seats: int | None
    waitlist_open_seats: int | None
    source_url: str | None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _dedupe_key(watch_id: str, trigger_type: str, checked_at: datetime) -> str:
    bucket = checked_at.astimezone(timezone.utc).strftime("%Y%m%d%H%M")
    return f"{watch_id}:{trigger_type}:{bucket}"


def _raw_hash(excerpt: str | None) -> str | None:
    if not excerpt:
        return None
    return hashlib.sha256(excerpt.encode("utf-8")).hexdigest()


def _queue_notification(
    db: Session,
    watch: Watch,
    trigger_type: str,
    status_payload: dict,
    checked_at: datetime,
) -> NotificationLog | None:
    dedupe_key = _dedupe_key(str(watch.id), trigger_type, checked_at)
    existing = db.execute(select(NotificationLog.id).where(NotificationLog.dedupe_key == dedupe_key)).scalar_one_or_none()
    if existing is not None:
        return None

    log = NotificationLog(
        watch_id=watch.id,
        channel="email",
        trigger_type=trigger_type,
        dedupe_key=dedupe_key,
        payload_json=status_payload,
        sent_at=None,
    )
    db.add(log)
    db.flush()
    return log


def apply_status_to_watch(
    db: Session,
    watch: Watch,
    status_payload: dict,
    checked_at: datetime,
) -> list[PendingNotification]:
    open_seats = status_payload.get("open_seats")
    waitlist_open_seats = status_payload.get("waitlist_open_seats")
    status = status_payload.get("status") or "UNKNOWN"
    raw_excerpt = status_payload.get("raw_excerpt")

    snapshot = SeatSnapshot(
        watch_id=watch.id,
        checked_at=checked_at,
        open_seats=open_seats,
        waitlist_open_seats=waitlist_open_seats,
        status=status,
        raw_hash=_raw_hash(raw_excerpt),
        raw_excerpt=(raw_excerpt or "")[:500] or None,
    )
    db.add(snapshot)

    prev_open = watch.last_open_seats
    prev_waitlist = watch.last_waitlist_open_seats

    watch.last_open_seats = open_seats
    watch.last_waitlist_open_seats = waitlist_open_seats
    watch.last_status = status
    watch.last_checked_at = checked_at
    watch.next_run_at = checked_at + timedelta(seconds=watch.cadence_seconds)

    should_trigger_seat = (prev_open in (None, 0)) and (open_seats or 0) > 0
    should_trigger_waitlist = watch.notify_on_waitlist and (prev_waitlist in (None, 0)) and (waitlist_open_seats or 0) > 0

    pending: list[PendingNotification] = []

    if should_trigger_seat:
        log = _queue_notification(db, watch, "SEAT_OPEN", status_payload, checked_at)
        if log is not None:
            pending.append(
                PendingNotification(
                    notification_log_id=log.id,
                    watch_id=str(watch.id),
                    email=watch.user.email,
                    trigger_type="SEAT_OPEN",
                    provider=watch.provider,
                    section_ref=watch.section_ref,
                    term_ref=watch.term_ref,
                    open_seats=open_seats,
                    waitlist_open_seats=waitlist_open_seats,
                    source_url=watch.source_url,
                )
            )

    if should_trigger_waitlist:
        log = _queue_notification(db, watch, "WAITLIST_OPEN", status_payload, checked_at)
        if log is not None:
            pending.append(
                PendingNotification(
                    notification_log_id=log.id,
                    watch_id=str(watch.id),
                    email=watch.user.email,
                    trigger_type="WAITLIST_OPEN",
                    provider=watch.provider,
                    section_ref=watch.section_ref,
                    term_ref=watch.term_ref,
                    open_seats=open_seats,
                    waitlist_open_seats=waitlist_open_seats,
                    source_url=watch.source_url,
                )
            )

    return pending


def _email_subject(item: PendingNotification) -> str:
    if item.trigger_type == "SEAT_OPEN":
        return f"Seat Open: {item.provider} {item.section_ref} ({item.term_ref})"
    return f"Waitlist Open: {item.provider} {item.section_ref} ({item.term_ref})"


def _email_body(item: PendingNotification) -> tuple[str, str]:
    lines = [
        "EnrollEagle alert",
        f"Provider: {item.provider}",
        f"Term: {item.term_ref}",
        f"Section: {item.section_ref}",
        f"Open seats: {item.open_seats if item.open_seats is not None else 'unknown'}",
        f"Waitlist open seats: {item.waitlist_open_seats if item.waitlist_open_seats is not None else 'unknown'}",
    ]
    if item.source_url:
        lines.append(f"Source: {item.source_url}")
    text = "\n".join(lines)
    html = "<br/>".join(lines)
    return text, html


def run_tick(db: Session, app_config, provider_registry: dict, email_sender, now: datetime | None = None) -> dict:
    started = time.monotonic()
    checked_at = now or _now_utc()

    due_watches = (
        db.execute(
            select(Watch)
            .options(joinedload(Watch.user))
            .where(Watch.is_active.is_(True), Watch.next_run_at <= checked_at)
            .order_by(Watch.next_run_at.asc())
            .limit(app_config.cron_batch_size)
            .with_for_update(skip_locked=True)
        )
        .scalars()
        .all()
    )

    grouped: dict[tuple[str, str], list[Watch]] = {}
    for watch in due_watches:
        grouped.setdefault((watch.provider, watch.fetch_key), []).append(watch)

    group_results: dict[tuple[str, str], dict] = {}

    for (provider_key, fetch_key), watches in grouped.items():
        provider = provider_registry.get(provider_key)
        if provider is None:
            group_results[(provider_key, fetch_key)] = {
                "open_seats": None,
                "waitlist_open_seats": None,
                "status": "UNSUPPORTED",
                "source_url": watches[0].source_url,
                "raw_excerpt": None,
                "block_reason": f"Unknown provider: {provider_key}",
            }
            continue

        representative = watches[0]
        payload = {
            "section_ref": representative.section_ref,
            "term_ref": representative.term_ref,
            "source_url": representative.source_url,
            "campus_code": representative.campus_code,
        }

        try:
            result = provider.get_seat_status(payload)
            group_results[(provider_key, fetch_key)] = {
                "open_seats": result.open_seats,
                "waitlist_open_seats": result.waitlist_open_seats,
                "status": result.status,
                "source_url": result.source_url or representative.source_url,
                "raw_excerpt": result.raw_excerpt,
                "block_reason": result.block_reason,
            }
        except Exception as exc:  # pragma: no cover - protective fallback
            group_results[(provider_key, fetch_key)] = {
                "open_seats": None,
                "waitlist_open_seats": None,
                "status": "UNKNOWN",
                "source_url": representative.source_url,
                "raw_excerpt": None,
                "block_reason": f"provider_error:{exc}",
            }

    pending_notifications: list[PendingNotification] = []
    blocked_count = 0
    unsupported_count = 0

    for watch in due_watches:
        status_payload = group_results[(watch.provider, watch.fetch_key)]
        status = status_payload.get("status")
        if status == "BLOCKED":
            blocked_count += 1
        elif status == "UNSUPPORTED":
            unsupported_count += 1

        watch_pending = apply_status_to_watch(db, watch, status_payload, checked_at)
        pending_notifications.extend(watch_pending)

    db.commit()

    sent_count = 0
    for item in pending_notifications:
        subject = _email_subject(item)
        text_body, html_body = _email_body(item)
        provider_response: dict

        try:
            provider_response = email_sender.send_email(
                to=item.email,
                subject=subject,
                text=text_body,
                html=html_body,
            )
            sent_at = _now_utc()
            sent_count += 1
        except Exception as exc:  # pragma: no cover - delivery failure path
            provider_response = {"ok": False, "error": str(exc)}
            sent_at = None

        log = db.get(NotificationLog, item.notification_log_id)
        if log is not None:
            log.provider_response = provider_response
            log.sent_at = sent_at

    db.commit()

    elapsed_ms = int((time.monotonic() - started) * 1000)

    return {
        "processed_groups": len(grouped),
        "processed_watches": len(due_watches),
        "sent_notifications": sent_count,
        "blocked_count": blocked_count,
        "unsupported_count": unsupported_count,
        "elapsed_ms": elapsed_ms,
    }
