from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InvalidCredentialsError
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas.auth import Token
from app.services import users as users_service

# Verified against this when no user matches, so an unknown email costs the same
# time as a wrong password and login can't be used to probe for registered ones.
_DUMMY_HASH = hash_password("not-a-real-password-0")


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    """Raise InvalidCredentialsError for any failure, with one identical body."""
    user = await users_service.get_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        raise InvalidCredentialsError()
    if not verify_password(password, user.hashed_password) or not user.is_active:
        raise InvalidCredentialsError()
    return user


def issue_token(user: User) -> Token:
    return Token(access_token=create_access_token(user.id, role=user.role))
