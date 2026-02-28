"""catalog cache table

Revision ID: 0002_catalog_cache
Revises: 0001_initial
Create Date: 2026-02-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0002_catalog_cache"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "catalog_cache",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("school_id", sa.String(length=64), nullable=False),
        sa.Column("term_ref", sa.String(length=64), nullable=False),
        sa.Column("subject_code", sa.String(length=128), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("school_id", "term_ref", "subject_code", name="uq_catalog_cache_key"),
    )
    op.create_index("ix_catalog_cache_lookup", "catalog_cache", ["school_id", "term_ref", "subject_code"])


def downgrade() -> None:
    op.drop_index("ix_catalog_cache_lookup", table_name="catalog_cache")
    op.drop_table("catalog_cache")
