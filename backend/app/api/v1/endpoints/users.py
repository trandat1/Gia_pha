from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload 
from typing import List

from app.api import dependencies
from app.db.session import get_db
from app.models.user import User
from app.models.member import Member
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.core.security import get_password_hash,verify_password

router = APIRouter()

# API: Lấy danh sách Member CHƯA được liên kết với User nào
@router.get("/unlinked-members")
async def get_unlinked_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(dependencies.get_current_active_superuser) # Chỉ Admin
):
    stmt = select(Member).where(Member.user_id.is_(None))
    result = await db.execute(stmt)
    return result.scalars().all()

# API: Lấy danh sách toàn bộ User
@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(dependencies.get_current_active_superuser) # Chỉ Admin
):
    # SỬA LẠI CÂU TRUY VẤN Ở ĐÂY
    stmt = (
        select(User)
        .options(selectinload(User.member)) # <--- Kéo theo dữ liệu Member
        .options(selectinload(User.role))   # <--- (Tùy chọn) Kéo theo Role nếu Schema của bạn cần
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()

# API: Tạo User mới và liên kết với Member
@router.post("/", response_model=UserResponse)
async def create_new_user(
    user_in: dict, # Nhận dict để xử lý cả thông tin User và member_id
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(dependencies.get_current_active_superuser) # Chỉ Admin
):
    # Kiểm tra SĐT đã tồn tại chưa
    result = await db.execute(select(User).where(User.phone_number == user_in["phone_number"]))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Số điện thoại đã được đăng ký.")

    # 1. Tạo User mới
    new_user = User(
        phone_number=user_in["phone_number"],
        hashed_password=get_password_hash(user_in["password"]),
        full_name=user_in.get("full_name"),
        is_superuser=user_in.get("is_superuser", False)
    )
    db.add(new_user)
    await db.flush() # Để lấy new_user.id ngay lập tức

    # 2. Liên kết với Member (nếu có chọn)
    member_id = user_in.get("member_id")
    if member_id:
        member_result = await db.execute(select(Member).where(Member.id == member_id))
        target_member = member_result.scalar_one_or_none()
        
        if not target_member:
            raise HTTPException(status_code=404, detail="Không tìm thấy Member trong gia phả.")
        if target_member.user_id:
            raise HTTPException(status_code=400, detail="Member này đã có tài khoản.")
            
        target_member.user_id = new_user.id # Liên kết!

    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    # Bắt buộc phải là Admin mới được gọi API này
    current_user: User = Depends(dependencies.get_current_active_superuser) 
):
    # 1. Tìm người dùng cần sửa
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.member), selectinload(User.role))
    )
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng.")

    # 2. Xử lý đổi mật khẩu (Bảo mật 3 lớp)
    if user_in.new_password:
        # Lớp 1: Không ai được đổi pass của người khác (kể cả Admin)
        if current_user.id != target_user.id:
            raise HTTPException(
                status_code=403, 
                detail="Bạn không có quyền đổi mật khẩu của người khác. Hãy yêu cầu họ tự đổi!"
            )
        
        # Lớp 2: Kiểm tra mật khẩu cũ
        if not user_in.old_password or not verify_password(user_in.old_password, target_user.hashed_password):
            raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác.")
        
        # Lớp 3: Check trùng pass cũ
        if verify_password(user_in.new_password, target_user.hashed_password):
            raise HTTPException(status_code=400, detail="Mật khẩu mới không được trùng với mật khẩu cũ.")

        # Mã hóa và lưu mật khẩu mới
        target_user.hashed_password = get_password_hash(user_in.new_password)

    # 3. Kiểm tra nếu đổi số điện thoại -> Có bị trùng với ai khác không?
    if user_in.phone_number and user_in.phone_number != target_user.phone_number:
        check_phone = await db.execute(select(User).where(User.phone_number == user_in.phone_number))
        if check_phone.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Số điện thoại này đã được sử dụng cho tài khoản khác.")
        target_user.phone_number = user_in.phone_number

    # 4. Cập nhật thông tin cơ bản
    if user_in.full_name is not None:
        target_user.full_name = user_in.full_name
    if user_in.email is not None:
        target_user.email = user_in.email
    if user_in.is_active is not None:
        target_user.is_active = user_in.is_active

    # 5. Xử lý Quyền và Vai trò (Chỉ Admin mới có thể đổi, và ta đã lock bằng Depends ở trên)
    if user_in.is_superuser is not None:
        target_user.is_superuser = user_in.is_superuser
    
    # Logic: Nếu là Superadmin thì gỡ Role. Nếu không thì gán Role mới.
    if target_user.is_superuser:
        target_user.role_id = None
    elif user_in.role_id is not None:
        # Nhận vào id rỗng ('') từ frontend thì chuyển thành None trong Database
        target_user.role_id = user_in.role_id if str(user_in.role_id).strip() != "" else None

    # Lưu thay đổi
    await db.commit()
    await db.refresh(target_user)
    
    return target_user