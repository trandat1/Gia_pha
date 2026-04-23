import React, { useState, useMemo } from 'react';
import { X, Save, Shield, Phone, Mail, User, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const EditUserModal = ({ user, roles, currentUser, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Kiểm tra xem có đang tự sửa chính mình không
    const isSelf = currentUser?.id === user.id;

    const [formData, setFormData] = useState({
        phone_number: user.phone_number || '',
        full_name: user.full_name || '',
        email: user.email || '',
        role_id: user.role_id || '',
        is_superuser: user.is_superuser || false,
        is_active: user.is_active ?? true,
        // Phần mật khẩu
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    // Logic kiểm tra độ mạnh mật khẩu (Frontend validation)
    const passwordValidation = useMemo(() => {
        const p = formData.new_password;
        if (!p) return null;
        return {
            hasUpper: /[A-Z]/.test(p),
            hasLower: /[a-z]/.test(p),
            hasNumber: /[0-9]/.test(p),
            notOld: p !== formData.old_password,
            matches: p === formData.confirm_password && p.length > 0
        };
    }, [formData.new_password, formData.old_password, formData.confirm_password]);

    const handleSubmit = async (e) => {
            e.preventDefault();
            setError('');

            // 1. Kiểm tra Mật khẩu (Giữ nguyên đoạn này của bạn)
            if (isSelf && formData.new_password) {
                if (!passwordValidation.hasUpper || !passwordValidation.hasLower || !passwordValidation.hasNumber) {
                    setError("Mật khẩu mới chưa đủ độ mạnh (cần chữ hoa, thường và số).");
                    return;
                }
                if (!passwordValidation.notOld) {
                    setError("Mật khẩu mới không được trùng với mật khẩu cũ.");
                    return;
                }
                if (!passwordValidation.matches) {
                    setError("Xác nhận mật khẩu mới không khớp.");
                    return;
                }
            }

            setLoading(true);
            try {
                const submitData = { ...formData };
                
                // 2. CHUẨN HÓA DỮ LIỆU TRƯỚC KHI GỬI (Sửa lỗi 422)
                // Đổi chuỗi rỗng ("") thành null để FastAPI/Pydantic không bị phàn nàn
                if (submitData.email === "") {
                    submitData.email = null;
                }
                if (submitData.role_id === "") {
                    submitData.role_id = null;
                }

                // Nếu không đổi pass thì xóa các trường này đi
                if (!formData.new_password) {
                    delete submitData.old_password;
                    delete submitData.new_password;
                    delete submitData.confirm_password;
                }

                const response = await api.put(`/users/${user.id}`, submitData);
                onUpdate(response.data);
                onClose();
            } catch (err) {
                // 3. XỬ LÝ LỖI TRẢ VỀ ĐỂ REACT KHÔNG BỊ CRASH
                if (err.response?.status === 422) {
                    // Lỗi do FastAPI Validation (trả về dạng Mảng Object)
                    const errorDetails = err.response.data.detail;
                    if (Array.isArray(errorDetails)) {
                        // Lọc mảng lỗi và chuyển thành 1 câu String duy nhất
                        const errorMsgs = errorDetails.map(d => {
                            if (d.loc.includes('email')) return "Email không hợp lệ (cần có @).";
                            if (d.loc.includes('role_id')) return "Vai trò không hợp lệ.";
                            return d.msg;
                        }).join(" | ");
                        setError(`Dữ liệu chưa đúng: ${errorMsgs}`);
                    } else {
                        setError(String(errorDetails));
                    }
                } else {
                    // Lỗi logic do mình tự raise (trả về String)
                    setError(err.response?.data?.detail || "Lỗi cập nhật tài khoản");
                }
            } finally {
                setLoading(false);
            }
        };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Shield size={20} className="text-indigo-600" /> Cập nhật người dùng
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Họ tên */}
                        <div className="col-span-full space-y-1">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2"><User size={16} /> Họ và tên</label>
                            <input type="text" required className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
                        </div>

                        {/* Số điện thoại */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Phone size={16} /> Số điện thoại</label>
                            <input type="text" required className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Mail size={16} /> Email</label>
                            <input type="email" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                        </div>
                    </div>

                    {/* Quyền hạn & Trạng thái */}
                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">Quyền Superadmin</span>
                            <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={formData.is_superuser}
                                onChange={(e) => setFormData({...formData, is_superuser: e.target.checked, role_id: e.target.checked ? '' : formData.role_id})} />
                        </div>

                        <div className={`space-y-1 ${formData.is_superuser ? 'opacity-50' : ''}`}>
                            <label className="text-sm font-semibold text-slate-700">Vai trò hệ thống</label>
                            <select disabled={formData.is_superuser} className="w-full border rounded-lg p-2 bg-white"
                                value={formData.role_id || ''} onChange={(e) => setFormData({...formData, role_id: e.target.value})}>
                                <option value="">-- Chọn vai trò --</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* PHẦN ĐỔI MẬT KHẨU (Chỉ hiện khi là chính chủ) */}
                    {isSelf && (
                        <div className="space-y-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2"><Lock size={16}/> Đổi mật khẩu bảo mật</h3>
                            
                            <div className="space-y-3">
                                <input type="password" placeholder="Mật khẩu hiện tại" className="w-full border rounded-lg p-2 text-sm outline-none"
                                    value={formData.old_password} onChange={(e) => setFormData({...formData, old_password: e.target.value})} />
                                
                                <input type="password" placeholder="Mật khẩu mới" className="w-full border rounded-lg p-2 text-sm outline-none"
                                    value={formData.new_password} onChange={(e) => setFormData({...formData, new_password: e.target.value})} />
                                
                                <input type="password" placeholder="Xác nhận mật khẩu mới" className="w-full border rounded-lg p-2 text-sm outline-none"
                                    value={formData.confirm_password} onChange={(e) => setFormData({...formData, confirm_password: e.target.value})} />
                            </div>

                            {/* Checklist độ mạnh mật khẩu */}
                            {formData.new_password && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <PasswordCheck label="Chữ hoa" met={passwordValidation.hasUpper} />
                                    <PasswordCheck label="Chữ thường" met={passwordValidation.hasLower} />
                                    <PasswordCheck label="Chữ số" met={passwordValidation.hasNumber} />
                                    <PasswordCheck label="Khác mật khẩu cũ" met={passwordValidation.notOld} />
                                    <PasswordCheck label="Khớp xác nhận" met={passwordValidation.matches} />
                                </div>
                            )}
                        </div>
                    )}
                    {/* PHẦN TRẠNG THÁI TÀI KHOẢN */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                <span className="text-sm font-bold text-slate-700">Trạng thái tài khoản</span>
                            </div>
                            
                            {/* Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>
                        
                        <p className="text-[11px] text-slate-500 italic">
                            {formData.is_active 
                                ? "● Tài khoản có thể đăng nhập và thao tác bình thường." 
                                : "● Tài khoản bị khóa. Người dùng sẽ không thể đăng nhập vào hệ thống."}
                        </p>
                    </div>                    
                </form>

                <div className="p-4 border-t bg-slate-50 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border bg-white hover:bg-slate-100 font-medium">Hủy</button>
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PasswordCheck = ({ label, met }) => (
    <div className={`flex items-center gap-1.5 text-[10px] ${met ? 'text-green-600' : 'text-slate-400'}`}>
        {met ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
        {label}
    </div>
);

export default EditUserModal;