"""Password hashing, JWT helpers and the auth cookie."""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher
from starlette.responses import Response

from app.core.config import settings

# bcrypt cost 10 per the accounts spec. Argon2 stays in the chain so hashes written
# before the switch still verify; new hashes are always bcrypt (the first hasher).
_password_hash = PasswordHash((BcryptHasher(rounds=10), Argon2Hasher()))


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _password_hash.verify(password, hashed)


def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
    *,
    role: str | None = None,
) -> str:
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    # `sub` must be a string: PyJWT encodes an int fine but refuses to decode it
    # (InvalidSubjectError). The role claim is informational — authorization reads
    # the database row, so a role change takes effect without a re-login.
    payload: dict[str, Any] = {"sub": str(subject), "iat": now, "exp": expire, "type": "access"}
    if role is not None:
        payload["role"] = role
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a token. Raises `jwt.PyJWTError` on any problem."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Not an access token")
    return payload


def set_auth_cookie(response: Response, token: str) -> None:
    """Set the HttpOnly auth cookie described by the accounts contract."""
    response.set_cookie(
        settings.AUTH_COOKIE_NAME,
        token,
        max_age=settings.auth_cookie_max_age,
        path="/",
        httponly=True,
        # Starlette writes this value verbatim, so pass it capitalised as the contract does.
        samesite=settings.AUTH_COOKIE_SAMESITE,
        secure=settings.auth_cookie_secure,
    )


def clear_auth_cookie(response: Response) -> None:
    """Expire the auth cookie.

    Not `delete_cookie`: that one drops HttpOnly, which makes the logout header
    disagree with the login header for no reason.
    """
    response.set_cookie(
        settings.AUTH_COOKIE_NAME,
        "",
        max_age=0,
        path="/",
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        secure=settings.auth_cookie_secure,
    )
