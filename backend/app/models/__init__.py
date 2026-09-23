"""Import every model here so Alembic autogenerate and relationships see them."""

from app.models.note import Note
from app.models.user import User

__all__ = ["Note", "User"]
