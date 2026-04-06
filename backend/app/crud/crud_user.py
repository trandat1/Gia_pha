from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash

async def get_user_by_phone_number(db: AsyncSession, phone_number: str):
    result = await db.execute(select(User).filter(User.phone_number == phone_number))
    return result.scalars().first()

async def create_user(db: AsyncSession, obj_in: UserCreate):
    db_obj = User(
        phone_number=obj_in.phone_number,
        email=obj_in.email,
        hashed_password=get_password_hash(obj_in.password),
        full_name=obj_in.full_name,
        is_superuser=obj_in.is_superuser,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj