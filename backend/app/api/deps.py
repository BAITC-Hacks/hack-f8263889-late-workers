"""Shared FastAPI dependencies: DB session, current user, role guard."""

from collections.abc import Awaitable, Callable
from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import APIKeyCookie, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User
from app.services import users as users_service

# auto_error=False on both: a missing credential yields None so endpoints can be
# optionally authenticated and we own the 401 body.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=False
)
cookie_scheme = APIKeyCookie(name=settings.AUTH_COOKIE_NAME, auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_optional_user(
    db: DbSession,
    cookie_token: Annotated[str | None, Depends(cookie_scheme)],
    header_token: Annotated[str | None, Depends(oauth2_scheme)],
) -> User | None:
    """None when no token is sent. A token that is present but invalid is still a 401.

    The cookie wins over the header: a stale token left in a browser's localStorage
    must never override the session the user just signed into.
    """
    token = cookie_token or header_token
    if not token:
        return None
    try:
        user_id = int(decode_access_token(token)["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise UnauthorizedError() from exc  # bad signature, expired, or malformed

    user = await users_service.get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError()  # deleted or deactivated since the token was issued
    return user


async def get_current_user(user: Annotated[User | None, Depends(get_optional_user)]) -> User:
    if user is None:
        raise UnauthorizedError()
    return user


OptionalUser = Annotated[User | None, Depends(get_optional_user)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(role: str) -> Callable[[User], Awaitable[User]]:
    """Guard an endpoint by role. No credentials is still a 401, wrong role is a 403.

    The role comes from the database row, never from the token's claim, so a role
    change takes effect without waiting for the cookie to expire.
    """

    async def dependency(user: CurrentUser) -> User:
        if user.role != role:
            raise ForbiddenError()
        return user

    return dependency


BusinessUser = Annotated[User, Depends(require_role("business"))]
StudentUser = Annotated[User, Depends(require_role("student"))]
