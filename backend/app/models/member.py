from typing import Optional, TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Date, Boolean, ForeignKey, Text
from app.db.session import Base
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.user import User
class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    gender: Mapped[str] = mapped_column(String(10)) # Nam, Nữ, Khác
    
    # Trường mới: Đánh dấu người nối dõi (Đích tôn / Trưởng nam)
    is_heir: Mapped[bool] = mapped_column(Boolean, default=False)
    
    birth_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    death_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    is_alive: Mapped[bool] = mapped_column(Boolean, default=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Các khóa ngoại để tạo cấu trúc cây
    father_id: Mapped[Optional[int]] = mapped_column(ForeignKey("members.id"), nullable=True)
    mother_id: Mapped[Optional[int]] = mapped_column(ForeignKey("members.id"), nullable=True)
    spouse_id: Mapped[Optional[int]] = mapped_column(ForeignKey("members.id"), nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    user: Mapped[Optional["User"]] = relationship("User", back_populates="member")

