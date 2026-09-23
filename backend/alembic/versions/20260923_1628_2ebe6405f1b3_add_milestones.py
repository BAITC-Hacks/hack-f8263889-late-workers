"""add milestones

Revision ID: 2ebe6405f1b3
Revises: e03e652c01d0
Create Date: 2026-09-23 16:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "2ebe6405f1b3"
down_revision: str | None = "e03e652c01d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "milestones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "proposal_id",
            sa.Integer(),
            sa.ForeignKey("proposals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("confirmed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("points", sa.Integer(), server_default="10", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_milestones_proposal_id", "milestones", ["proposal_id"])


def downgrade() -> None:
    op.drop_index("ix_milestones_proposal_id", table_name="milestones")
    op.drop_table("milestones")
