from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["legacy"])


@router.get("/me", response_model=UserRead)
async def read_me(user: CurrentUser):
    return user
