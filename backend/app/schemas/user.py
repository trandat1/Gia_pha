from typing import Optional
from pydantic import BaseModel, EmailStr
from pydantic import BaseModel, ConfigDict

class MemberForUser(BaseModel):
    id: int
    full_name: str
    father_id: Optional[int] = None
    mother_id: Optional[int] = None
    spouse_id: Optional[int] = None
    is_heir: Optional[bool] = False
    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    phone_number: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    role_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    member: Optional[MemberForUser] = None
    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    role_id: Optional[int] = None
    
    # Các trường phục vụ đổi mật khẩu
    old_password: Optional[str] = None
    new_password: Optional[str] = None
    confirm_password: Optional[str] = None    

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None