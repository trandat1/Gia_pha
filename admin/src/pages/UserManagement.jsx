import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { UserPlus, Shield, Users, Key, Phone, UserCircle, Edit } from 'lucide-react';
import EditUserModal from '../components/EditUserModal';
import { useAuth } from '../context/AuthContext';
const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [unlinkedMembers, setUnlinkedMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const { user, logout } = useAuth();

    // 2. Hàm xử lý cập nhật danh sách sau khi sửa xong
    const handleUserUpdated = (updatedUser) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        setEditingUser(null);
    };
    const [formData, setFormData] = useState({
        phone_number: '',
        password: '',
        full_name: '',
        is_superuser: false,
        member_id: ''
    });

    // Lấy dữ liệu lúc mới vào trang
    const fetchData = async () => {
        try {
            const [usersRes, membersRes] = await Promise.all([
                api.get('/users/'), 
                api.get('/users/unlinked-members')
            ]);
            setUsers(usersRes.data);
            setUnlinkedMembers(membersRes.data);
            const rolesRes = await api.get('/roles');
            setRoles(rolesRes.data);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                member_id: formData.member_id ? parseInt(formData.member_id) : null
            };

            await api.post('/users/', payload);
            alert("Tạo tài khoản thành công!");
            
            // Reset form
            setFormData({
                phone_number: '', password: '', full_name: '', 
                is_superuser: false, member_id: ''
            });
            // Load lại danh sách
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "Lỗi khi tạo tài khoản");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 grid grid-cols-12 gap-6 h-full">
            
            {/* 1. FORM TẠO USER (Bên Trái) */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-blue-700 font-bold mb-4 flex items-center gap-2 text-lg">
                    <UserPlus size={20}/> Cấp tài khoản mới
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1"><Phone size={14}/> Số điện thoại (Tài khoản) *</label>
                        <input type="text" required
                            className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.phone_number} 
                            onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1"><Key size={14}/> Mật khẩu *</label>
                        <input type="password" required minLength={6}
                            className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1"><UserCircle size={14}/> Tên hiển thị</label>
                        <input type="text" placeholder="Tùy chọn (Thường lấy theo Member)"
                            className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.full_name} 
                            onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    </div>

                    {/* LIÊN KẾT VỚI GIA PHẢ */}
                    <div className="pt-3 border-t">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                            <Users size={16}/> Liên kết Gia Phả
                        </label>
                        <select 
                            className="w-full border p-2.5 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.member_id}
                            onChange={e => {
                                const selectedId = e.target.value;
                                setFormData({...formData, member_id: selectedId});
                                // Mẹo UX: Tự động điền Tên nếu người dùng chọn Member
                                if (selectedId) {
                                    const member = unlinkedMembers.find(m => String(m.id) === selectedId);
                                    if (member && !formData.full_name) {
                                        setFormData(prev => ({...prev, full_name: member.full_name}));
                                    }
                                }
                            }}
                        >
                            <option value="">-- Không liên kết (Tài khoản độc lập) --</option>
                            {unlinkedMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.full_name} (ID: {m.id})</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">Chỉ hiện những người chưa có tài khoản.</p>
                    </div>

                    {/* QUYỀN ADMIN */}
                    <div className="pt-3 border-t">
                        <label className="block text-sm text-slate-600 mb-1">Vai trò hệ thống</label>
                            <select 
                                className="w-full border p-2.5 rounded-lg bg-white"
                                value={formData.role_id}
                                onChange={e => setFormData({...formData, role_id: e.target.value})}
                            >
                                <option value="">-- Chọn vai trò --</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
                                ))}
                            </select>
                    </div>

                    <button disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-md mt-4">
                        {loading ? "Đang xử lý..." : "TẠO TÀI KHOẢN"}
                    </button>
                </form>
            </div>

            {/* 2. DANH SÁCH USER (Bên Phải) */}
            <div className="col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
                <div className="p-5 border-b bg-slate-50">
                    <h2 className="font-bold flex items-center gap-2 text-slate-700 text-lg">
                        <Users size={20}/> Danh sách Tài khoản ({users.length})
                    </h2>
                </div>
                
                <div className="overflow-auto p-5 flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">SĐT / Tài khoản</th>
                                <th className="px-4 py-3">Tên hiển thị</th>
                                <th className="px-4 py-3">Vai trò</th>
                                <th className="px-4 py-3 rounded-tr-lg">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 font-medium text-slate-700">{u.phone_number}</td>
                                    <td className="px-4 py-3">{u.full_name || '-'}</td>
                                    <td className="px-4 py-3">
                                        {u.is_superuser ? (
                                            // Ưu tiên hiển thị Admin nếu là Superuser
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200 flex items-center w-max gap-1">
                                                <Shield size={12}/> Admin
                                            </span>
                                        ) : (
                                            // Tìm tên role từ mảng roles dựa trên role_id
                                            (() => {
                                                const role = roles.find(r => r.id === u.role_id);
                                                const roleName = role ? role.name: "Thành Viên";
                                                
                                                return (
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-200">
                                                        {roleName}
                                                    </span>
                                                );
                                            })()
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.is_active ? 
                                            <span className="text-green-600 font-medium">● Hoạt động</span> : 
                                            <span className="text-slate-400">● Đã khóa</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <button 
                                            onClick={() => setEditingUser(u)}
                                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                                        >
                                            <Edit size={16} /> {/* Nhớ import Edit từ lucide-react */}
                                        </button>
                                    </td>                                    
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {editingUser && (
                <EditUserModal 
                    user={editingUser}
                    roles={roles}
                    currentUser={user}
                    onClose={() => setEditingUser(null)}
                    onUpdate={handleUserUpdated}
                />
            )}
        </div>
    );
};

export default UserManagement;