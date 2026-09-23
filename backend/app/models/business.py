from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Business(TimestampMixin, Base):
    """Profile of a user whose role is `business`."""

    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    company_name: Mapped[str] = mapped_column(String(200))
    contact_name: Mapped[str] = mapped_column(String(100))
    # Stored normalised: digits with an optional leading "+", no spaces or separators.
    contact_phone: Mapped[str] = mapped_column(String(16))

    user: Mapped["User"] = relationship(back_populates="business")
