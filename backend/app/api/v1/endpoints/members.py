from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.dependencies import get_current_active_user, get_current_active_superuser, get_current_user
from app.schemas.member import MemberCreate, MemberResponse
from app.crud import crud_member
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=MemberResponse)
async def create_member(
    *,
    db: AsyncSession = Depends(get_db),
    member_in: MemberCreate,
    # Chỉ Admin mới có quyền tạo (Yêu cầu 1)
    current_user = Depends(get_current_active_superuser) 
):
    """
    Thêm một thành viên mới vào gia phả (Quyền Admin).
    """
    return await crud_member.create_member(db=db, obj_in=member_in)

@router.get("/", response_model=List[MemberResponse])
async def read_members(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    # Bất kỳ ai có tài khoản đang active đều xem được danh sách
    current_user = Depends(get_current_active_user) 
):
    """
    Lấy danh sách các thành viên trong gia phả.
    """
    return await crud_member.get_members(db, skip=skip, limit=limit)


@router.get("/tree")
async def read_member_tree(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tree = await crud_member.get_family_tree(db)
    return tree