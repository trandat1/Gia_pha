from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, members, roles # Thêm roles ở đây

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(members.router, prefix="/members", tags=["members"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"]) # Thêm dòng này