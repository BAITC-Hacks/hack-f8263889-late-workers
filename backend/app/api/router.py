from fastapi import APIRouter

from app.api.v1 import ai, auth, notes, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(notes.router)
api_router.include_router(ai.router)
