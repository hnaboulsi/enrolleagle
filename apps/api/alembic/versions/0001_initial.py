"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-02-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("google_sub", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("google_sub"),
    )

    op.create_table(
        "watches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("section_ref", sa.String(length=255), nullable=False),
        sa.Column("term_ref", sa.String(length=64), nullable=False),
        sa.Column("fetch_key", sa.String(length=512), nullable=False),
        sa.Column("source_url", sa.String(length=2048), nullable=True),
        sa.Column("campus_code", sa.String(length=32), nullable=True),
        sa.Column("notify_on_waitlist", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_open_seats", sa.Integer(), nullable=True),
        sa.Column("last_waitlist_open_seats", sa.Integer(), nullable=True),
        sa.Column("last_status", sa.String(length=32), nullable=False, server_default=sa.text("'UNKNOWN'")),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("cadence_seconds", sa.Integer(), nullable=False, server_default=sa.text("120")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("report_hmac_salt", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("cadence_seconds >= 120", name="ck_watches_cadence_seconds_min"),
    )

    op.create_index("ix_watches_next_run_active", "watches", ["next_run_at", "is_active"])
    op.create_index("ix_watches_user_active", "watches", ["user_id", "is_active"])
    op.create_index(
        "uq_watches_active_user_provider_section_term",
        "watches",
        ["user_id", "provider", "section_ref", "term_ref"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )

    op.create_table(
        "seat_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("watch_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("watches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("open_seats", sa.Integer(), nullable=True),
        sa.Column("waitlist_open_seats", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("raw_hash", sa.String(length=64), nullable=True),
        sa.Column("raw_excerpt", sa.String(length=512), nullable=True),
    )
    op.create_index("ix_seat_snapshots_watch_checked", "seat_snapshots", ["watch_id", "checked_at"])

    op.create_table(
        "notification_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("watch_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("watches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(length=16), nullable=False, server_default=sa.text("'email'")),
        sa.Column("trigger_type", sa.String(length=32), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dedupe_key", sa.String(length=255), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("provider_response", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("dedupe_key"),
    )
    op.create_index("ix_notification_logs_watch_sent", "notification_logs", ["watch_id", "sent_at"])


def downgrade() -> None:
    op.drop_index("ix_notification_logs_watch_sent", table_name="notification_logs")
    op.drop_table("notification_logs")
    op.drop_index("ix_seat_snapshots_watch_checked", table_name="seat_snapshots")
    op.drop_table("seat_snapshots")
    op.drop_index("uq_watches_active_user_provider_section_term", table_name="watches")
    op.drop_index("ix_watches_user_active", table_name="watches")
    op.drop_index("ix_watches_next_run_active", table_name="watches")
    op.drop_table("watches")
    op.drop_table("users")
