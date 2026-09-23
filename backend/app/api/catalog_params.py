"""Query-parameter parsing for the catalogue.

Every parameter arrives as a raw string so FastAPI cannot answer with its own 422
before we do: the contract wants every bad parameter reported at once, each with
its own Russian message.
"""

from dataclasses import dataclass, field
from typing import Annotated

from fastapi import Depends, Query
from sqlalchemy import select

from app.api.deps import DbSession
from app.core import messages
from app.core.badges import BADGE_CODES
from app.core.catalog import LEVEL_CODES, SORT_OPTIONS
from app.core.exceptions import ValidationError
from app.models import Industry

# Longest code we will ever echo back in an error message.
_MAX_CODE_LENGTH = 64


@dataclass(slots=True)
class CatalogueQuery:
    sort: str = "rating"
    industries: list[str] = field(default_factory=list)
    levels: list[str] = field(default_factory=list)
    badges: list[str] = field(default_factory=list)
    page: int = 1


def split_codes(raw: str | None) -> list[str]:
    """Comma-separated codes: trimmed, lowercased, empties dropped, order kept."""
    if not raw:
        return []
    codes: list[str] = []
    for part in raw.split(","):
        code = part.strip().lower()
        if code and code not in codes:
            codes.append(code)
    return codes


def _clip(code: str) -> str:
    return code if len(code) <= _MAX_CODE_LENGTH else code[:_MAX_CODE_LENGTH] + "…"


def parse_page(raw: str | None) -> int | None:
    """A whole number from 1 up, or None when the value is unusable."""
    if raw is None:
        return 1
    try:
        page = int(raw.strip())
    except (ValueError, AttributeError):
        return None
    return page if page >= 1 else None


async def catalogue_query(
    db: DbSession,
    sort: Annotated[str | None, Query()] = None,
    industry: Annotated[str | None, Query()] = None,
    level: Annotated[str | None, Query()] = None,
    badge: Annotated[str | None, Query()] = None,
    page: Annotated[str | None, Query()] = None,
) -> CatalogueQuery:
    fields: dict[str, str] = {}

    resolved_sort = (sort or "rating").strip().lower()
    if resolved_sort not in SORT_OPTIONS:
        fields["sort"] = messages.SORT

    industries = split_codes(industry)
    if industries:
        known = set(await db.scalars(select(Industry.code)))
        unknown = [code for code in industries if code not in known]
        if unknown:
            fields["industry"] = messages.unknown_industry(_clip(unknown[0]))

    levels = split_codes(level)
    unknown_levels = [code for code in levels if code not in LEVEL_CODES]
    if unknown_levels:
        fields["level"] = messages.unknown_level(_clip(unknown_levels[0]))

    badges = split_codes(badge)
    unknown_badges = [code for code in badges if code not in BADGE_CODES]
    if unknown_badges:
        fields["badge"] = messages.unknown_badge(_clip(unknown_badges[0]))

    resolved_page = parse_page(page)
    if resolved_page is None:
        fields["page"] = messages.PAGE

    if fields:
        raise ValidationError(fields, message=messages.VALIDATION_QUERY)

    return CatalogueQuery(
        sort=resolved_sort,
        industries=industries,
        levels=levels,
        badges=badges,
        page=resolved_page or 1,
    )


CatalogueQueryDep = Annotated[CatalogueQuery, Depends(catalogue_query)]
