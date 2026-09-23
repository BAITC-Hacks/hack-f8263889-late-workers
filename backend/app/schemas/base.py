"""Base model for schemas on the public `/api` contract."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ContractModel(BaseModel):
    """camelCase on the wire, snake_case in Python.

    Only for the `/api` contract. The `/api/v1` schemas (notes, ai, users) stay
    on plain BaseModel and keep their snake_case field names.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
