"""Check that OPENAI_API_KEY and OPENAI_MODEL work with Structured Outputs.

    uv run python scripts/check_openai.py

Prints the model, latency and token counts, or the error and a non-zero exit code.
"""

import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import openai  # noqa: E402
from app.core.config import settings  # noqa: E402
from pydantic import BaseModel  # noqa: E402


class Probe(BaseModel):
    ok: bool


async def main() -> int:
    if not settings.ai_enabled:
        print("OPENAI_API_KEY is not set", file=sys.stderr)
        return 1

    client = openai.AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL,
        timeout=settings.AI_TIMEOUT_SECONDS,
        max_retries=0,
    )
    started = time.perf_counter()
    try:
        response = await client.responses.parse(
            model=settings.OPENAI_MODEL,
            instructions="Answer with ok = true.",
            input=[{"role": "user", "content": "Are you reachable?"}],
            text_format=Probe,
        )
    except openai.OpenAIError as exc:
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    finally:
        await client.close()

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    usage = response.usage
    print(f"model:   {response.model}")
    print(f"parsed:  {response.output_parsed}")
    print(f"latency: {elapsed_ms} ms")
    print(
        "tokens:  in="
        f"{usage.input_tokens if usage else 0} out={usage.output_tokens if usage else 0}"
    )
    return 0 if response.output_parsed is not None else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
