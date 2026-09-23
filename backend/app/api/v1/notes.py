from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import Page
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate
from app.services import notes as notes_service

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=Page[NoteRead])
async def list_notes(
    user: CurrentUser,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items, total = await notes_service.list_notes(db, user.id, limit=limit, offset=offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(data: NoteCreate, user: CurrentUser, db: DbSession):
    return await notes_service.create_note(db, user.id, data)


@router.get("/{note_id}", response_model=NoteRead)
async def get_note(note_id: int, user: CurrentUser, db: DbSession):
    return await notes_service.get_note(db, user.id, note_id)


@router.patch("/{note_id}", response_model=NoteRead)
async def update_note(note_id: int, data: NoteUpdate, user: CurrentUser, db: DbSession):
    return await notes_service.update_note(db, user.id, note_id, data)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: int, user: CurrentUser, db: DbSession) -> None:
    await notes_service.delete_note(db, user.id, note_id)
