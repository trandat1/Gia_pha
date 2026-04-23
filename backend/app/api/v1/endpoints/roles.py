from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.role import Role
from app.schemas.role import RoleResponse
from app.api import dependencies

router = APIRouter()

@router.get("/", response_model=List[RoleResponse])
async def read_roles(
    db: AsyncSession = Depends(get_db),
    # Bảo mật: Chỉ những người đã đăng nhập mới được lấy danh sách Role
    current_user = Depends(dependencies.get_current_user) 
):
    """
    Lấy danh sách tất cả các vai trò (admin, member, ke_toan...)
    """
    result = await db.execute(select(Role))
    roles = result.scalars().all()
    return roles