"""Import every model here so Alembic autogenerate and relationships see them."""

from app.models.business import Business
from app.models.note import Note
from app.models.student import Student
from app.models.user import User

__all__ = ["Business", "Note", "Student", "User"]
