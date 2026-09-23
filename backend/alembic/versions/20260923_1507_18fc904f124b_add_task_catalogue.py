"""add task catalogue

Revision ID: 18fc904f124b
Revises: a22ff0986288
Create Date: 2026-09-23 15:07:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from app.core.catalog import INDUSTRIES

revision: str = "18fc904f124b"
down_revision: str | None = "a22ff0986288"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    industries = op.create_table(
        "industries",
        sa.Column("code", sa.String(length=32), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
    )
    # Seeded from app.core.catalog so the reference data has one definition.
    op.bulk_insert(industries, [{"code": code, "name": name} for code, name in INDUSTRIES])

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "business_id",
            sa.Integer(),
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "industry_code",
            sa.String(length=32),
            sa.ForeignKey("industries.code"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("context", sa.Text(), nullable=True),
        sa.Column("need", sa.Text(), nullable=True),
        sa.Column("target_users", sa.Text(), nullable=True),
        sa.Column("data_materials", sa.Text(), nullable=True),
        sa.Column("constraints", sa.Text(), nullable=True),
        sa.Column("expected_result", sa.Text(), nullable=True),
        sa.Column("success_criteria", sa.Text(), nullable=True),
        sa.Column("contact", sa.Text(), nullable=True),
        sa.Column("interaction_format", sa.Text(), nullable=True),
        sa.Column("rating", sa.Integer(), server_default="0", nullable=False),
        sa.Column("responses_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_tasks_business_id", "tasks", ["business_id"])
    op.create_index("ix_tasks_industry_code", "tasks", ["industry_code"])
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_rating", "tasks", ["rating"])

    op.create_table(
        "saved_tasks",
        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "task_id",
            sa.Integer(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_saved_tasks_student_created", "saved_tasks", ["student_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_saved_tasks_student_created", table_name="saved_tasks")
    op.drop_table("saved_tasks")
    for index in (
        "ix_tasks_rating",
        "ix_tasks_status",
        "ix_tasks_industry_code",
        "ix_tasks_business_id",
    ):
        op.drop_index(index, table_name="tasks")
    op.drop_table("tasks")
    op.drop_table("industries")
