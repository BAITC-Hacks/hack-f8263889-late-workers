"""Application settings loaded from environment variables and `.env`."""

from typing import Annotated, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

ReasoningEffort = Literal["none", "minimal", "low", "medium", "high", "xhigh", "max"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    APP_NAME: str = "FastAPI Starter Kit"
    APP_VERSION: str = "0.1.0"
    ENV: Literal["dev", "test", "prod"] = "dev"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api/v1"
    # Comma-separated list in env: CORS_ORIGINS=http://localhost:3000,https://app.example.com
    CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app"
    DB_ECHO: bool = False
    # Run `alembic upgrade head` automatically on startup.
    AUTO_MIGRATE: bool = True

    # --- Redis (optional: leave unset to disable rate limiting) ---
    REDIS_URL: str | None = None
    AI_RATE_LIMIT_PER_MINUTE: int = 20

    # --- Auth ---
    SECRET_KEY: str = "change-me-to-a-random-64-char-hex-string-see-env-example"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # --- AI (OpenAI Responses API) ---
    OPENAI_API_KEY: str | None = None
    # Optional: proxy or OpenAI-compatible endpoint. Unset = api.openai.com.
    OPENAI_BASE_URL: str | None = None
    OPENAI_MODEL: str = "gpt-5.5"
    OPENAI_MAX_OUTPUT_TOKENS: int = 4096
    # Unset = provider default. Lower values answer faster; not every model accepts every level.
    OPENAI_REASONING_EFFORT: ReasoningEffort | None = None
    AI_SYSTEM_PROMPT: str = "You are a helpful assistant. Answer concisely."

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def _empty_redis_url_is_none(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def _check_prod_secrets(self) -> "Settings":
        if self.ENV == "prod" and self.SECRET_KEY.startswith("change-me"):
            raise ValueError("SECRET_KEY must be set to a strong random value when ENV=prod")
        return self

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()
