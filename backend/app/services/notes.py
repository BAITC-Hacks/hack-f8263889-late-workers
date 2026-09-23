from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models import Note
from app.schemas.note import NoteCreate, NoteUpdate


async def list_notes(
    db: AsyncSession, owner_id: int, *, limit: int, offset: int
) -> tuple[list[Note], int]:
    base = select(Note).where(Note.owner_id == owner_id)
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.scalars(base.order_by(Note.id.desc()).limit(limit).offset(offset))
    return list(result), total


async def get_note(db: AsyncSession, owner_id: int, note_id: int) -> Note:
    note = await db.scalar(select(Note).where(Note.id == note_id, Note.owner_id == owner_id))
    if note is None:
        raise NotFoundError("Note not found")
    return note


async def create_note(db: AsyncSession, owner_id: int, data: NoteCreate) -> Note:
    note = Note(owner_id=owner_id, **data.model_dump())
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def update_note(db: AsyncSession, owner_id: int, note_id: int, data: NoteUpdate) -> Note:
    note = await get_note(db, owner_id, note_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(db: AsyncSession, owner_id: int, note_id: int) -> None:
    note = await get_note(db, owner_id, note_id)
    await db.delete(note)
    await db.commit()
