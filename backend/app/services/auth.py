from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.models import User
from app.schemas.auth import Token
from app.schemas.user import UserCreate
from app.services import users as users_service


async def register(db: AsyncSession, data: UserCreate) -> User:
    if await users_service.get_user_by_email(db, data.email):
        raise ConflictError("A user with this email already exists")
    return await users_service.create_user(db, data)


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    user = await users_service.get_user_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Incorrect email or password")
    if not user.is_active:
        raise UnauthorizedError("User is inactive")
    return user


def issue_token(user: User) -> Token:
    return Token(access_token=create_access_token(user.id))
