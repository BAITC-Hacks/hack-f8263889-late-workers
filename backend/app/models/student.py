from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TagList, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Student(TimestampMixin, Base):
    """Profile of a user whose role is `student`."""

    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    skills: Mapped[list[str]] = mapped_column(TagList, default=list)
    technologies: Mapped[list[str]] = mapped_column(TagList, default=list)

    user: Mapped["User"] = relationship(back_populates="student")
