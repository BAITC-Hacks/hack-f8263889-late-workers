"""Declarative base and shared column types."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


# A list of short strings (skills, technologies).
#
# JSONB on Postgres so the column stays indexable if tag search is ever needed;
# plain JSON elsewhere, which keeps SQLite usable as an escape hatch. Not ARRAY:
# it does not compile on SQLite at all. MutableList is what makes an in-place
# `student.skills.append(...)` reach the UPDATE — a bare JSON column drops it.
TagList = MutableList.as_mutable(JSON().with_variant(JSONB, "postgresql"))

# For stored structures we replace wholesale (field metadata, assessments, rating
# breakdown). No mutation tracking on purpose: every writer reassigns the value.
JsonColumn = JSON().with_variant(JSONB, "postgresql")
