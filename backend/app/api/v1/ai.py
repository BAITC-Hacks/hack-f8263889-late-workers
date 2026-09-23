from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUser
from app.api.rate_limit import rate_limit
from app.core.config import settings
from app.schemas.ai import ChatRequest, ChatResponse
from app.services import ai as ai_service

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
    dependencies=[Depends(rate_limit(settings.AI_RATE_LIMIT_PER_MINUTE, 60, "ai"))],
)


@router.post("/chat", response_model=ChatResponse)
async def chat(data: ChatRequest, _: CurrentUser):
    return await ai_service.chat(data)


@router.post(
    "/chat/stream",
    summary="Chat with Server-Sent Events",
    description="Streams `delta` events with text chunks, then a final `done` (or `error`) event.",
    response_class=StreamingResponse,
)
async def chat_stream(data: ChatRequest, _: CurrentUser):
    return StreamingResponse(
        ai_service.chat_stream(data),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
