from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email.strip().lower()))


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    # select(), not db.get(): db.get can return an instance straight from the
    # identity map with its profile relationships unloaded.
    return await db.scalar(select(User).where(User.id == user_id))
