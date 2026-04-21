"""phase 4 review engine metadata

Revision ID: 20260420_000002
Revises: 20260420_000001
Create Date: 2026-04-20
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260420_000002"
down_revision = "20260420_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("findings", sa.Column("issue_type", sa.String(length=128), nullable=True))
    op.add_column("findings", sa.Column("clause_type", sa.String(length=128), nullable=True))
    op.add_column("findings", sa.Column("comment_text", sa.Text(), nullable=True))
    op.add_column("findings", sa.Column("redline_text", sa.Text(), nullable=True))
    op.add_column("findings", sa.Column("rank_score", sa.Float(), nullable=True))
    op.add_column("findings", sa.Column("metadata_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("findings", "metadata_json")
    op.drop_column("findings", "rank_score")
    op.drop_column("findings", "redline_text")
    op.drop_column("findings", "comment_text")
    op.drop_column("findings", "clause_type")
    op.drop_column("findings", "issue_type")
