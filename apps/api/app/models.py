from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, JSON, String, Text, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def uuid4() -> uuid.UUID:
    return uuid.uuid4()


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    google_sub: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    watches: Mapped[list["Watch"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Watch(Base):
    __tablename__ = "watches"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    section_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    term_ref: Mapped[str] = mapped_column(String(64), nullable=False)
    fetch_key: Mapped[str] = mapped_column(String(512), nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    campus_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notify_on_waitlist: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_open_seats: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_waitlist_open_seats: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_status: Mapped[str] = mapped_column(String(32), nullable=False, default="UNKNOWN")
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    cadence_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    report_hmac_salt: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    user: Mapped[User] = relationship(back_populates="watches")
    seat_snapshots: Mapped[list["SeatSnapshot"]] = relationship(back_populates="watch", cascade="all, delete-orphan")
    notification_logs: Mapped[list["NotificationLog"]] = relationship(back_populates="watch", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("cadence_seconds >= 120", name="ck_watches_cadence_seconds_min"),
        Index("ix_watches_next_run_active", "next_run_at", "is_active"),
        Index("ix_watches_user_active", "user_id", "is_active"),
        Index(
            "uq_watches_active_user_provider_section_term",
            "user_id",
            "provider",
            "section_ref",
            "term_ref",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )


class SeatSnapshot(Base):
    __tablename__ = "seat_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    watch_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("watches.id", ondelete="CASCADE"), nullable=False)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    open_seats: Mapped[int | None] = mapped_column(Integer, nullable=True)
    waitlist_open_seats: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    raw_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    raw_excerpt: Mapped[str | None] = mapped_column(String(512), nullable=True)

    watch: Mapped[Watch] = relationship(back_populates="seat_snapshots")

    __table_args__ = (Index("ix_seat_snapshots_watch_checked", "watch_id", "checked_at"),)


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    watch_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("watches.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String(16), nullable=False, default="email")
    trigger_type: Mapped[str] = mapped_column(String(32), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dedupe_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    provider_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, server_default=func.now())

    watch: Mapped[Watch] = relationship(back_populates="notification_logs")

    __table_args__ = (Index("ix_notification_logs_watch_sent", "watch_id", "sent_at"),)
