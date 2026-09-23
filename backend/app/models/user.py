from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.business import Business
    from app.models.note import Note
    from app.models.student import Student


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    is_superuser: Mapped[bool] = mapped_column(default=False)
    # server_default backfills rows that predate the column; String, not Enum,
    # because adding a value to a native Postgres enum needs its own migration.
    role: Mapped[str] = mapped_column(String(20), server_default="student", index=True)

    notes: Mapped[list["Note"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    # lazy="selectin" is load-bearing: serialising these in a response would
    # otherwise trigger a lazy load outside the greenlet context (MissingGreenlet).
    business: Mapped["Business | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    student: Mapped["Student | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
