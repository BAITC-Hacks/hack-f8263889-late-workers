"""Account creation: a user plus its role profile, in one transaction."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EmailTakenError
from app.core.security import hash_password
from app.models import Business, Student, User
from app.schemas.account import BusinessRegisterRequest, StudentRegisterRequest
from app.services import users as users_service


async def _create(db: AsyncSession, user: User) -> User:
    """Insert the user and its profile together, or neither.

    Two commits would let a failed profile insert strand a committed user: the
    email is then taken forever and /me reports a role with no profile.
    """
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        # Lost the race on the unique email index. The rollback is mandatory —
        # without it the next statement on this session raises PendingRollbackError.
        await db.rollback()
        raise EmailTakenError() from exc
    await db.refresh(user)
    return user


async def register_business(db: AsyncSession, data: BusinessRegisterRequest) -> User:
    if await users_service.get_user_by_email(db, data.email):
        raise EmailTakenError()
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.contact_name,
        role="business",
        business=Business(
            company_name=data.company_name,
            contact_name=data.contact_name,
            contact_phone=data.contact_phone,
        ),
    )
    return await _create(db, user)


async def register_student(db: AsyncSession, data: StudentRegisterRequest) -> User:
    if await users_service.get_user_by_email(db, data.email):
        raise EmailTakenError()
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.name,
        role="student",
        student=Student(
            name=data.name,
            skills=data.skills,
            technologies=data.technologies,
        ),
    )
    return await _create(db, user)
