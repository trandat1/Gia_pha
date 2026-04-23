import React, { useState } from 'react';
import { X, Calendar, Users, Clock, ChevronDown, ChevronRight, Pencil } from 'lucide-react';

// ─── CÁC HÀM TÍNH TOÁN ─────────────────────────────────────
const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return "?";
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const calculateAnniversary = (deathDateStr) => {
    if (!deathDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deathDate = new Date(deathDateStr);
    let nextAnniv = new Date(today.getFullYear(), deathDate.getMonth(), deathDate.getDate());
    
    if (nextAnniv < today) {
        nextAnniv.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = nextAnniv.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
        dateStr: `${deathDate.getDate()}/${deathDate.getMonth() + 1}`,
        daysLeft: diffDays === 0 ? "Hôm nay" : diffDays
    };
};

// Lấy tất cả hậu duệ (con, cháu, chắt...)
const getAllDescendants = (memberId, allMembers, level = 0) => {
    const directChildren = allMembers.filter(
        m => m.father_id === memberId || m.mother_id === memberId
    );
    
    const result = [];
    directChildren.forEach(child => {
        result.push({ ...child, level: 0 });
        const grandChildren = getAllDescendants(child.id, allMembers, 1);
        result.push(...grandChildren.map(g => ({ ...g, level: g.level + 1 })));
    });
    
    return result;
};

// Tính số cháu
const countGrandchildren = (memberId, allMembers) => {
    const children = allMembers.filter(m => m.father_id === memberId || m.mother_id === memberId);
    let count = 0;
    children.forEach(child => {
        count += allMembers.filter(m => m.father_id === child.id || m.mother_id === child.id).length;
    });
    return count;
};

// Tìm người nối dõi
const findSuccessor = (memberId, allMembers) => {
    const children = allMembers.filter(m => m.father_id === memberId || m.mother_id === memberId);
    // Tìm con trai đầu tiên là người nối dõi
    const firstSon = children
        .filter(c => c.gender === 'Nam').filter(c => c.is_heir)
        .sort((a, b) => (a.birth_date || '').localeCompare(b.birth_date || ''))[0];
    
    return firstSon || null;
};

// Tìm vợ/chồng (phối ngẫu)
const findSpouse = (memberId, allMembers) => {
    return allMembers.find(m => m.id === memberId)?.spouse_id 
        ? allMembers.find(m => m.id === allMembers.find(x => x.id === memberId)?.spouse_id)
        : null;
};

// ─── COMPONENT CHÍNH ────────────────────────────────────────
const MemberDetailModal = ({ member, allMembers, onClose, onEdit }) => {
    const [expandedSections, setExpandedSections] = useState({
        children: false,
        descendants: false,
        relationship: false
    });

    if (!member) return null;

    const isAlive = member.is_alive;
    const age = calculateAge(member.birth_date);
    const anniv = !isAlive ? calculateAnniversary(member.death_date) : null;
    
    // Lấy dữ liệu quan hệ
    const children = allMembers.filter(m => m.father_id === member.id || m.mother_id === member.id);
    const boys = children.filter(c => c.gender === 'Nam').length;
    const girls = children.filter(c => c.gender === 'Nữ').length;
    const grandchildrenCount = countGrandchildren(member.id, allMembers);
    const successor = findSuccessor(member.id, allMembers);

    const spouse = findSpouse(member.id, allMembers);
    
    // Lấy tất cả hậu duệ
    const allDescendants = getAllDescendants(member.id, allMembers);

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                
                {/* ─── HEADER ─── */}
                <div className={`sticky top-0 p-6 pb-8 ${member.gender === 'Nam' ? 'bg-blue-50' : 'bg-pink-50'} relative`}>
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full text-slate-500 transition"
                    >
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-sm border-2 border-white
                            ${member.gender === 'Nam' ? 'bg-blue-200' : 'bg-pink-200'}`}>
                            {member.gender === 'Nam' ? '👨' : '👩'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{member.full_name}</h2>
                            <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
                                {isAlive ? <span className="text-green-600">● Đang sống</span> : <span className="text-slate-500">● Đã khuất</span>}
                                {member.is_heir && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-xs">👑 Trưởng/Đích</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ─── NỘI DUNG ─── */}
                <div className="p-6 space-y-4">
                    
                    {/* ─── PHẦN CƠ BẢN ─── */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        
                        {/* Tuổi */}
                        <div className="flex items-start gap-3">
                            <Clock size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-semibold">Tuổi / Mốc thời gian</p>
                                <p className="text-sm font-medium text-slate-700 mt-1">
                                    {isAlive ? `Hiện tại ${age} tuổi` : `Hưởng thọ ${age} tuổi`} 
                                </p>
                                {member.birth_date && (
                                    <p className="text-xs text-slate-600 mt-1">📅 Sinh: {member.birth_date}</p>
                                )}
                                {member.death_date && (
                                    <p className="text-xs text-slate-600">📅 Mất: {member.death_date}</p>
                                )}
                            </div>
                        </div>

                        {/* Con cái - Số lượng */}
                        <div className="flex items-start gap-3 pt-2 border-t border-white">
                            <Users size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-semibold">Hậu duệ</p>
                                <p className="text-sm font-medium text-slate-700 mt-1">
                                    {children.length === 0 ? "Chưa có con cái" : 
                                     `Con: ${children.length} người (Trai: ${boys}, Gái: ${girls})`}
                                </p>
                                {grandchildrenCount > 0 && (
                                    <p className="text-sm text-blue-600 mt-1">👶 Cháu: {grandchildrenCount} người</p>
                                )}
                            </div>
                        </div>

                        {/* Ngày giỗ */}
                        {!isAlive && anniv && (
                            <div className="pt-2 border-t border-white">
                                <p className="text-xs text-indigo-600 font-semibold mb-1">📅 Kỷ niệm ngày giỗ</p>
                                <p className="text-sm font-medium text-slate-700">Ngày {anniv.dateStr} hàng năm</p>
                                <p className="text-sm text-indigo-600 font-bold mt-1">
                                    {anniv.daysLeft === "Hôm nay" ? "🙏 Hôm nay là ngày giỗ!" : `Còn ${anniv.daysLeft} ngày nữa`}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ─── PHẦN QUAN HỆ ─── */}
                    <div className="border rounded-xl overflow-hidden">
                        <button
                            onClick={() => toggleSection('relationship')}
                            className="w-full px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between transition"
                        >
                            <span className="font-semibold text-slate-700">👥 Quan hệ gia đình</span>
                            {expandedSections.relationship ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                        {expandedSections.relationship && (
                            <div className="p-4 space-y-3 bg-slate-50 border-t">
                                
                                {/* Vợ/Chồng */}
                                {spouse && (
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg">💑</span>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500 font-semibold">Vợ/Chồng</p>
                                            <p className="text-sm text-slate-700 font-medium">{spouse.full_name}</p>
                                        </div>
                                    </div>
                                )}
                                {!spouse && (
                                    <div className="text-xs text-slate-400 italic">Chưa có thông tin về Vợ/Chồng</div>
                                )}

                                {/* Nối dõi */}
                               
                                {successor && (
                                   
                                    <div className="flex items-start gap-2 pt-2 border-t border-white">
                                        <span className="text-lg">🔗</span>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500 font-semibold">Người nối dõi</p>
                                            <p className="text-sm text-slate-700 font-medium">{successor.full_name}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                (Con trai đầu tiên - sinh {successor.birth_date || 'không rõ'})
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {!successor && member.gender === 'Nam' && (
                                    <div className="text-xs text-slate-400 italic pt-2 border-t border-white">Chưa có người nối dõi</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ─── PHẦN DANH SÁCH CON ─── */}
                    {children.length > 0 && (
                        <div className="border rounded-xl overflow-hidden">
                            <button
                                onClick={() => toggleSection('children')}
                                className="w-full px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between transition"
                            >
                                <span className="font-semibold text-slate-700">
                                    👶 Con cái ({children.length})
                                </span>
                                {expandedSections.children ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            {expandedSections.children && (
                                <div className="p-4 space-y-2 bg-slate-50 border-t max-h-48 overflow-y-auto">
                                    {children.map((child, idx) => (
                                        <div 
                                            key={child.id}
                                            className="flex items-start gap-2 p-2 bg-white rounded hover:bg-blue-50 transition"
                                        >
                                            <span className="text-sm flex-shrink-0">{child.gender === 'Nam' ? '👦' : '👧'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{child.full_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {child.birth_date && `Sinh ${child.birth_date}`}
                                                    {child.death_date && ` - Mất ${child.death_date}`}
                                                </p>
                                            </div>
                                            {child.is_heir && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded flex-shrink-0">👑</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── PHẦN TẤT CẢ HẬU DUỆ ─── */}
                    {allDescendants.length > 0 && (
                        <div className="border rounded-xl overflow-hidden">
                            <button
                                onClick={() => toggleSection('descendants')}
                                className="w-full px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between transition"
                            >
                                <span className="font-semibold text-slate-700">
                                    🌳 Tất cả hậu duệ ({allDescendants.length})
                                </span>
                                {expandedSections.descendants ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            {expandedSections.descendants && (
                                <div className="p-4 space-y-1 bg-slate-50 border-t max-h-60 overflow-y-auto">
                                    {allDescendants.map((desc) => {
                                        const levelNames = ['Con', 'Cháu', 'Chắt', 'Chít'];
                                        const levelName = levelNames[desc.level] || `Cõi lần ${desc.level + 1}`;
                                        return (
                                            <div 
                                                key={desc.id}
                                                className="flex items-start gap-2 p-2 bg-white rounded hover:bg-blue-50 transition"
                                                style={{ paddingLeft: `${12 + desc.level * 16}px` }}
                                            >
                                                <span className="text-xs flex-shrink-0">{desc.gender === 'Nam' ? '👨' : '👩'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-slate-700">
                                                        <span className="text-slate-500">[{levelName}]</span> {desc.full_name}
                                                    </p>
                                                    {desc.birth_date && (
                                                        <p className="text-xs text-slate-500">
                                                            {desc.birth_date}{desc.death_date && ` - ${desc.death_date}`}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── PHẦN THÊM THÔNG TIN ─── */}
                    {(member.address || member.bio) && (
                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                            {member.address && (
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold mb-1">📍 Địa chỉ</p>
                                    <p className="text-sm text-slate-700">{member.address}</p>
                                </div>
                            )}
                            {member.bio && (
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold mb-1">📖 Tiểu sử</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{member.bio}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── FOOTER ─── */}
                <div className="sticky bottom-0 px-6 py-4 bg-white border-t flex justify-end gap-2">
                    {/* Nút Chỉnh sửa */}
                    <button
                        onClick={() => onEdit(member)} // onEdit là prop mới truyền từ Members.jsx
                        className="px-4 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-2"
                    >
                        <Pencil size={14} /> Chỉnh sửa
                    </button>
                    
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MemberDetailModal;
