from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.member import Member
from app.schemas.member import MemberCreate,MemberUpdate
from sqlalchemy import update

async def get_members(db: AsyncSession, skip: int = 0, limit: int = 100):
    # Lấy danh sách thành viên
    result = await db.execute(select(Member).offset(skip).limit(limit))
    return result.scalars().all()

async def create_member(db: AsyncSession, obj_in: MemberCreate):
    # 1. Tạo member mới từ dữ liệu gửi lên
    new_member = Member(**obj_in.model_dump())
    db.add(new_member)
    await db.flush()  # Flush để lấy được ID của new_member vừa tạo mà chưa cần commit hẳn
    
    # 2. Logic Tự động cập nhật hai chiều cho Vợ/Chồng
    if new_member.spouse_id:
        # Tìm người vợ/chồng cũ (người đã có trong hệ thống)
        result = await db.execute(
            select(Member).where(Member.id == new_member.spouse_id)
        )
        spouse_member = result.scalar_one_or_none()
        
        if spouse_member:
            # Cập nhật spouse_id của người cũ bằng ID của người mới tạo
            spouse_member.spouse_id = new_member.id
            # Lưu ý: Không cần db.add(spouse_member) vì nó đã nằm trong session
            
    # 3. Commit toàn bộ thay đổi
    await db.commit()
    await db.refresh(new_member)
    return new_member


async def get_member(db: AsyncSession, member_id: int):
    result = await db.execute(select(Member).where(Member.id == member_id))
    return result.scalar_one_or_none()

# 2. Cập nhật thông tin thành viên
async def update_member(db: AsyncSession, db_obj: Member, obj_in: MemberUpdate):
    # Chuyển Schema thành dict, loại bỏ các trường không truyền (None)
    update_data = obj_in.model_dump(exclude_unset=True)
    
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_family_tree(db: AsyncSession):
    # Lấy danh sách phẳng, đơn giản và hiệu quả nhất cho thư viện này
    result = await db.execute(select(Member))
    members = result.scalars().all()
    return members # FastAPI sẽ tự convert sang JSON