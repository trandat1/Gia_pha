from typing import List, TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from app.db.session import Base

# Dòng này cực kỳ quan trọng:
# Chỉ import Member khi trình soạn thảo (linter) kiểm tra lỗi.
# Khi code chạy thật, nó sẽ bỏ qua để tránh lỗi vòng lặp import.
if TYPE_CHECKING:
    from app.models.member import Member

class Role(Base):
    __tablename__ = "roles"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    
    # Mối quan hệ 1-N: 1 Role có nhiều Member
    members: Mapped[List["Member"]] = relationship("Member", back_populates="role")