from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import dependencies
from app.db.session import get_db
from app.api.dependencies import get_current_active_user, get_current_active_superuser, get_current_user
from app.schemas.member import MemberCreate, MemberResponse, MemberUpdate
from app.crud import crud_member,permissions
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

@router.get("/{member_id}", response_model=MemberResponse)
async def read_member(
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(dependencies.get_current_user) # Bảo mật: phải đăng nhập mới xem được
):
    member = await crud_member.get_member(db, member_id=member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên")
    return member

# API Cập nhật thành viên
@router.put("/{member_id}", response_model=MemberResponse)
async def update_member_info(
    member_id: int,
    member_in: MemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(dependencies.get_current_user)
):
    # 2. Tìm người bị cập nhật (target_member)
    target_member = await crud_member.get_member(db, member_id=member_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên cần cập nhật.")
    
    update_data = member_in.model_dump(exclude_unset=True)
    if not update_data:
        return target_member

    # 4. TRUYỀN ID CỦA USER ĐANG ĐĂNG NHẬP VÀO
    await permissions.check_update_permission(
        db=db,
        current_user_id=current_user.id, # <--- Truyền current_user.id thay vì current_user.member_id
        target_member=target_member,
        update_data=update_data
    )
    
    # 5. Lưu DB
    updated_member = await crud_member.update_member(db, db_obj=target_member, obj_in=member_in)
    return updated_member