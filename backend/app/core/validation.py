"""Pure validation and normalisation rules for the accounts contract.

No FastAPI, no database. Every function returns the normalised value, or `None`
when the input is invalid — so a caller can collect *all* failing fields before
raising, which is what the contract requires.
"""

import re
from typing import Any

from pydantic import EmailStr, TypeAdapter
from pydantic import ValidationError as PydanticValidationError

MAX_TAGS = 20
MAX_TAG_LENGTH = 50

_email_adapter: TypeAdapter[str] = TypeAdapter(EmailStr)
# The contract's phone rule: digits with an optional leading "+", after the
# separators people actually type are removed.
_PHONE_SEPARATORS = re.compile(r"[\s\-()]")
_PHONE = re.compile(r"^\+?\d{10,15}$")


def as_text(value: Any) -> str | None:
    """A str, or None for anything else — including None and numbers."""
    return value if isinstance(value, str) else None


def normalize_email(value: Any) -> str | None:
    """Trimmed and lowercased.

    EmailStr alone is not enough: it lowercases only the domain, so an address
    typed as "  OWNER@Zerno.KZ  " would be stored with an uppercase local part
    and never match a lookup by `email.lower()`.
    """
    raw = as_text(value)
    if raw is None:
        return None
    raw = raw.strip()
    try:
        _email_adapter.validate_python(raw)
    except PydanticValidationError:
        return None
    return raw.lower()


def is_valid_password(value: Any) -> bool:
    """At least 8 characters, at least one letter and one digit.

    `isalpha`, not [A-Za-z]: this is a Russian-facing product, and a Cyrillic
    password is a perfectly good one.
    """
    raw = as_text(value)
    if raw is None or len(raw) < 8:
        return False
    return any(c.isalpha() for c in raw) and any(c.isdigit() for c in raw)


def normalize_text(value: Any, *, min_length: int, max_length: int) -> str | None:
    """Trimmed, then length-checked — so a whitespace-only value is invalid."""
    raw = as_text(value)
    if raw is None:
        return None
    text = raw.strip()
    return text if min_length <= len(text) <= max_length else None


def normalize_phone(value: Any) -> str | None:
    raw = as_text(value)
    if raw is None:
        return None
    phone = _PHONE_SEPARATORS.sub("", raw.strip())
    return phone if _PHONE.match(phone) else None


def normalize_tags(value: Any) -> list[str] | None:
    """Trim each tag, then drop case-insensitive duplicates keeping the first one.

    Missing (None) means "no tags". The count limit applies after de-duplication:
    the user is only asked to shorten a list that is genuinely too long.
    """
    if value is None:
        return []
    if not isinstance(value, list):
        return None
    tags: list[str] = []
    seen: set[str] = set()
    for item in value:
        tag = as_text(item)
        if tag is None:
            return None
        tag = tag.strip()
        if not 1 <= len(tag) <= MAX_TAG_LENGTH:
            return None
        key = tag.casefold()
        if key not in seen:
            seen.add(key)
            tags.append(tag)
    return tags if len(tags) <= MAX_TAGS else None
