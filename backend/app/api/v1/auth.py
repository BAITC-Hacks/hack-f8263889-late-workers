from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DbSession
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate, UserRead
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: DbSession):
    return await auth_service.register(db, data)


@router.post("/login", response_model=Token, summary="Login (form, used by Swagger Authorize)")
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession):
    user = await auth_service.authenticate(db, form.username, form.password)
    return auth_service.issue_token(user)


@router.post("/login/json", response_model=Token, summary="Login (JSON body, for frontends)")
async def login_json(data: LoginRequest, db: DbSession):
    user = await auth_service.authenticate(db, data.email, data.password)
    return auth_service.issue_token(user)
