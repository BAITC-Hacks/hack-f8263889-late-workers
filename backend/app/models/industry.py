from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Industry(Base):
    """Reference table, seeded by the migration from `app.core.catalog.INDUSTRIES`."""

    __tablename__ = "industries"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
