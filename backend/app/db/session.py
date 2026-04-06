from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# 1. Khởi tạo Base Model để các bảng (models) sau này kế thừa
class Base(DeclarativeBase):
    pass

# 2. Tạo Engine kết nối (kết nối trực tiếp tới MySQL)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False, # Bật True để in câu lệnh SQL ra terminal (rất tốt để debug khi đang dev)
    pool_pre_ping=True
)

# 3. Tạo Session Factory (Nơi cấp phát các phiên làm việc với CSDL)
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# 4. Dependency: Hàm này sẽ cung cấp session cho các API, sau khi API chạy xong sẽ tự động đóng kết nối
async def get_db():
    async with SessionLocal() as session:
        yield session