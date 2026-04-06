from fastapi import FastAPI
from app.core.config import settings
from app.api.v1.router import api_router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Dòng này rất quan trọng để hệ thống nhận diện các API v1
app.include_router(api_router, prefix=settings.API_V1_STR)

app.add_middleware(
    CORSMiddleware,
    # Ghi cả 2 địa chỉ cho chắc chắn, KHÔNG có dấu gạch chéo / ở cuối
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True, # Bắt buộc
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Hệ thống Quản lý Gia Phả họ Trần đã sẵn sàng!",
        "docs_url": "/docs"
    }