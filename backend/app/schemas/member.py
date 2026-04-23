from typing import Optional
from datetime import date
from pydantic import BaseModel
from app.schemas.role import RoleResponse

# Các trường chung
class MemberBase(BaseModel):
    full_name: str
    gender: str
    is_heir: bool = False
    birth_date: Optional[date] = None
    death_date: Optional[date] = None
    is_alive: bool = True
    address: Optional[str] = None
    bio: Optional[str] = None
    
    # Quan hệ
    father_id: Optional[int] = None
    mother_id: Optional[int] = None
    spouse_id: Optional[int] = None
    user_id: Optional[int] = None

# Dùng khi tạo mới (kế thừa toàn bộ MemberBase)
class MemberCreate(MemberBase):
    pass

class MemberUpdate(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[str] = None
    is_heir: Optional[bool] = None
    is_alive: Optional[bool] = None
    birth_date: Optional[date] = None
    death_date: Optional[date] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    father_id: Optional[int] = None
    mother_id: Optional[int] = None
    spouse_id: Optional[int] = None

# Dùng khi trả dữ liệu ra (có thêm ID thực tế từ database)
class MemberResponse(MemberBase):
    id: int
    role_id: Optional[int] = None
    role: Optional[RoleResponse] = None
    class Config:
        from_attributes = True