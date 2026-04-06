from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import TokenPayload
from fastapi import Request

# Báo cho Swagger biết API nào dùng JWT Token
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/access-token"
)

async def get_current_user(
    request: Request, # Chuyển sang dùng Request
    db: AsyncSession = Depends(get_db)
) -> User:
    # Đọc token từ cookie
    print(request.cookies)
    token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(status_code=401, detail="Bạn chưa đăng nhập")
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(status_code=403, detail="Token không hợp lệ")

    user = await db.get(User, int(token_data.sub))
    if not user:
        raise HTTPException(status_code=404, detail="Không thấy người dùng")
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Tài khoản đã bị khóa")
    return current_user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="Người dùng không có quyền Admin"
        )
    return current_user