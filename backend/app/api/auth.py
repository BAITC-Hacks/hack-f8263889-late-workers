"""The accounts contract: `/api/auth/*`.

Unversioned on purpose — the contract the frontend codes against has no version
segment. Authentication is an HttpOnly cookie; the browser never reads the token.
"""

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUser, DbSession
from app.core.security import clear_auth_cookie, set_auth_cookie
from app.models import User
from app.schemas.account import (
    AuthResponse,
    BusinessRegisterRequest,
    LoginRequest,
    StudentRegisterRequest,
)
from app.services import accounts as accounts_service
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _authenticated(response: Response, user: User) -> dict[str, User]:
    """Sign the user in: set the auth cookie and return the contract envelope."""
    set_auth_cookie(response, auth_service.issue_token(user).access_token)
    return {"user": user}


@router.post("/register/business", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_business(data: BusinessRegisterRequest, db: DbSession, response: Response):
    user = await accounts_service.register_business(db, data)
    return _authenticated(response, user)


@router.post("/register/student", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_student(data: StudentRegisterRequest, db: DbSession, response: Response):
    user = await accounts_service.register_student(db, data)
    return _authenticated(response, user)


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: DbSession, response: Response):
    user = await auth_service.authenticate(db, data.email, data.password)
    return _authenticated(response, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def logout(response: Response) -> None:
    """Unauthenticated by contract: always clears the cookie, always 204."""
    clear_auth_cookie(response)


@router.get("/me", response_model=AuthResponse)
async def me(user: CurrentUser):
    return {"user": user}
