from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, description="Full conversation history")
    system: str | None = Field(default=None, description="Overrides the default system prompt")
    max_tokens: int | None = Field(default=None, ge=1, le=128_000)


class Usage(BaseModel):
    input_tokens: int
    output_tokens: int


class ChatResponse(BaseModel):
    content: str
    model: str
    stop_reason: str | None
    usage: Usage
