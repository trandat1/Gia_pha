from fastapi import APIRouter
from app.api.v1.endpoints import auth, members # Nhớ import thêm members

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
# Thêm dòng này để nhúng API thành viên
api_router.include_router(members.router, prefix="/members", tags=["Members"])