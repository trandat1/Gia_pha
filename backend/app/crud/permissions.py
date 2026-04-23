from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.member import Member
from app.models.user import User
from app.models.role import Role
from datetime import date

async def check_update_permission(
    db: AsyncSession, 
    current_user_id: int, 
    target_member: Member, # SỬA LỖI ĐÁNH MÁY Ở ĐÂY: target_member phải là Member chứ không phải User
    update_data: dict,
):

    result = await db.execute(select(Member).where(Member.user_id == current_user_id))
    current_member = result.scalar_one_or_none()

    if not current_member:
        raise HTTPException(status_code=403, detail="Tài khoản của bạn chưa được liên kết với người nào trong gia phả.")


    # Rule Đặc Biệt: Chỉ Bố Mẹ mới được đổi is_heir (Trưởng tộc/Đích tôn)
    if "is_heir" in update_data and update_data["is_heir"] != target_member.is_heir:
        is_parent = (target_member.father_id == current_member.id) or (target_member.mother_id == current_member.id)
        if not is_parent:
            raise HTTPException(status_code=403, detail="Chỉ bố mẹ ruột mới có quyền thay đổi trạng thái nối dõi/trưởng tộc của con.")

    # Rule 3: Bố mẹ cập nhật con cái (TOÀN QUYỀN)
    is_parent = (target_member.father_id == current_member.id) or (target_member.mother_id == current_member.id)
    if is_parent:
        return True

    is_spouse = (target_member.spouse_id == current_member.id) or (current_member.spouse_id == target_member.id)
    if is_spouse:
        return True

    # Rule 1 & 2: Con cái cập nhật bố mẹ (CHỈ CON TRƯỞNG)
    is_child = (current_member.father_id == target_member.id) or (current_member.mother_id == target_member.id)
    if is_child:
        # Tìm tất cả anh chị em (các con của target_member)
        children_req = await db.execute(
            select(Member).where(
                (Member.father_id == target_member.id) | (Member.mother_id == target_member.id)
            )
        )
        children = children_req.scalars().all()
        
        # Hàm sắp xếp theo ngày sinh (người không có ngày sinh cho xuống cuối)
        def sort_by_birth(c):
            return c.birth_date if c.birth_date else date.max

        sons = sorted([c for c in children if c.gender == "Nam"], key=sort_by_birth)
        daughters = sorted([c for c in children if c.gender == "Nữ"], key=sort_by_birth)

        has_permission = False
        if len(sons) > 0:
                    # Nếu có con trai -> Tìm người có is_heir = True
                    for son in sons:
                        # Dùng dấu chấm '.' để gọi thuộc tính của model
                        if son.is_heir: 
                            # Phải so sánh ID với ID
                            if current_member.id == son.id: 
                                has_permission = True
                            break # Tìm thấy đích tôn thì dừng vòng lặp
                    
                    # TRƯỜNG HỢP DỰ PHÒNG: 
                    # Lỡ như trong database chưa có ai được tick is_heir, 
                    # thì ta tạm mặc định con trai lớn tuổi nhất (index 0) là người có quyền.
                    if not has_permission and current_member.id == sons[0].id:
                        has_permission = True
        else:
            # Nếu không có con trai -> Chỉ con gái trưởng (index 0) được sửa
            if len(daughters) > 0 and current_member.id == daughters[0].id:
                has_permission = True

        if has_permission:
            return True
        else:
            raise HTTPException(status_code=403, detail="Bạn là con thứ hoặc gia đình có con trai, bạn không có quyền cập nhật cho bố/mẹ.")

    # Rule 4: Trưởng họ / Trưởng ngành cập nhật (CHỈ ĐƯỢC SỬA TIỂU SỬ, GHI CHÚ)
    if current_member.is_heir:
        allowed_fields = {"bio", "address"} # Bạn có thể thêm trường "ghi_chu" vào đây
        attempted_fields = set(update_data.keys())
        
        # Nếu cố tình sửa các trường cấm (tên, ngày sinh, cha mẹ...)
        if not attempted_fields.issubset(allowed_fields):
            raise HTTPException(
                status_code=403, 
                detail="Trưởng họ/Trưởng ngành chỉ được phép cập nhật Tiểu sử và Địa chỉ/Ghi chú."
            )
        return True

    # Rule Bổ sung: Tự cập nhật chính mình (Tùy bạn quyết định, ở đây cho phép trừ is_heir đã chặn ở trên)
    if current_member.id == target_member.id:
        return True

    # Nếu không lọt vào bất kỳ điều kiện nào ở trên -> Chặn
    raise HTTPException(
        status_code=403, 
        detail="Từ chối truy cập. Chỉ người trực hệ (bố mẹ, con trưởng) hoặc Trưởng họ mới có quyền."
    )