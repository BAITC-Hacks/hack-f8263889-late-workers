"""add card builder

Revision ID: f48093ef2675
Revises: 18fc904f124b
Create Date: 2026-09-23 15:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f48093ef2675"
down_revision: str | None = "18fc904f124b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Mirrors app.db.base.JsonColumn.
JSON_COLUMN = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.add_column("tasks", sa.Column("draft_text", sa.Text(), nullable=True))
    op.add_column(
        "tasks",
        sa.Column("field_meta", JSON_COLUMN, server_default=sa.text("'{}'"), nullable=False),
    )
    op.add_column("tasks", sa.Column("rating_breakdown", JSON_COLUMN, nullable=True))
    op.add_column("tasks", sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "clarification_rounds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("mode", sa.String(length=16), nullable=False),
        sa.Column("assessment", JSON_COLUMN, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("task_id", "number", name="uq_rounds_task_number"),
    )
    op.create_index("ix_clarification_rounds_task_id", "clarification_rounds", ["task_id"])

    op.create_table(
        "round_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "round_id",
            sa.Integer(),
            sa.ForeignKey("clarification_rounds.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("block", sa.String(length=32), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("skipped", sa.Boolean(), server_default="false", nullable=False),
    )
    op.create_index("ix_round_questions_round_id", "round_questions", ["round_id"])

    op.create_table(
        "ai_calls",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("operation", sa.String(length=32), nullable=False),
        sa.Column("prompt_version", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=64), nullable=False),
        sa.Column("input", JSON_COLUMN, nullable=False),
        sa.Column("raw_output", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False),
        sa.Column("completion_tokens", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_ai_calls_task_id", "ai_calls", ["task_id"])
    op.create_index("ix_ai_calls_status", "ai_calls", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_calls_status", table_name="ai_calls")
    op.drop_index("ix_ai_calls_task_id", table_name="ai_calls")
    op.drop_table("ai_calls")
    op.drop_index("ix_round_questions_round_id", table_name="round_questions")
    op.drop_table("round_questions")
    op.drop_index("ix_clarification_rounds_task_id", table_name="clarification_rounds")
    op.drop_table("clarification_rounds")
    for column in ("confirmed_at", "rating_breakdown", "field_meta", "draft_text"):
        op.drop_column("tasks", column)
