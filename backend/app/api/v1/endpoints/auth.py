from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Response
from app.db.session import get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.crud.crud_user import get_user_by_phone_number, create_user
from app.schemas.user import UserCreate, Token

router = APIRouter()

@router.post("/setup-admin")
async def setup_admin(db: AsyncSession = Depends(get_db)):
    # Lấy thông tin từ file .env thông qua settings
    admin_phone = settings.ADMIN_DEFAULT_PHONE
    admin_password = settings.ADMIN_DEFAULT_PASSWORD
    
    user = await get_user_by_phone_number(db, phone_number=admin_phone)
    if user:
        raise HTTPException(status_code=400, detail="Tài khoản Admin đã tồn tại!")
    
    admin_in = UserCreate(
        phone_number=admin_phone,
        password=admin_password, # Dùng biến, không hardcode nữa
        full_name="Trần Tiến Đạt",
        is_superuser=True
    )
    await create_user(db, obj_in=admin_in)
    return {"message": "Tạo tài khoản Admin thành công!", "phone_number": admin_phone}

@router.post("/login/access-token")
async def login_access_token(
    response: Response, # Thêm tham số response
    db: AsyncSession = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = await get_user_by_phone_number(db, phone_number=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Sai số điện thoại hoặc mật khẩu")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=user.id, expires_delta=access_token_expires)

    # Đặt token vào Cookie thay vì trả về body
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,   # Quan trọng: Chặn JavaScript đọc trộm
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",  # Chống CSRF
        secure=False,    # Đổi thành True khi bạn chạy thực tế có HTTPS
    )
    
    return {"message": "Đăng nhập thành công"}