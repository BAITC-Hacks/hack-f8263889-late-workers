"""Legacy auth kept only for Swagger's Authorize button.

The real contract lives in `app/api/auth.py` (`/api/auth/*`). Registration moved
there: an account must be created with a role and a profile, which this endpoint
cannot do.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DbSession
from app.schemas.auth import Token
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["legacy"])


@router.post("/login", response_model=Token, summary="Login (form, used by Swagger Authorize)")
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession):
    user = await auth_service.authenticate(db, form.username, form.password)
    return auth_service.issue_token(user)
