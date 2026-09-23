"""add badges and task views

Revision ID: 50bbcf115e3a
Revises: 2ebe6405f1b3
Create Date: 2026-09-23 16:45:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "50bbcf115e3a"
down_revision: str | None = "2ebe6405f1b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TAG_LIST = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("badges", TAG_LIST, server_default=sa.text("'[]'"), nullable=False),
    )
    op.create_table(
        "task_views",
        sa.Column(
            "task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "first_viewed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_task_views_student_id", "task_views", ["student_id"])


def downgrade() -> None:
    op.drop_index("ix_task_views_student_id", table_name="task_views")
    op.drop_table("task_views")
    op.drop_column("tasks", "badges")
