import React, { useState, useEffect } from 'react';
import { X, Save, User, Calendar, MapPin, FileText, Activity } from 'lucide-react';
import api from '../api/axios';

const EditMemberModal = ({ member, allMembers, currentUser, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ ...member });

    // Kiểm tra quyền sửa is_heir (Chỉ bố hoặc mẹ mới được sửa cho con)

    const canEditHeirStatus = currentUser && (
        member.father_id === currentUser.member?.id || 
        member.mother_id === currentUser.member?.id
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.put(`/members/${member.id}`, formData);
            onUpdate(response.data);
            onClose();
        } catch (err) {
            alert(err.response?.data?.detail || "Lỗi cập nhật thông tin");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Save size={20} className="text-blue-600" /> Chỉnh sửa thành viên
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form id="edit-member-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Họ và tên */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={16} /> Họ và tên *
                            </label>
                            <input
                                type="text" required
                                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>

                        {/* Giới tính */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Giới tính</label>
                            <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                                {['Nam', 'Nữ'].map(g => (
                                    <button
                                        key={g} type="button"
                                        onClick={() => setFormData({ ...formData, gender: g })}
                                        className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${formData.gender === g ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tình trạng & Quyền hạn */}
                        <div className="col-span-full grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition">
                                <input
                                    type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                    checked={formData.is_alive}
                                    onChange={(e) => setFormData({ ...formData, is_alive: e.target.checked })}
                                />
                                <span className="text-sm font-medium text-slate-700">Còn sống</span>
                            </label>

                            <label className={`flex items-center gap-3 p-3 border rounded-xl transition ${!canEditHeirStatus ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer hover:bg-slate-50'}`}>
                                <input
                                    type="checkbox" className="w-4 h-4 rounded text-amber-600"
                                    disabled={!canEditHeirStatus}
                                    checked={formData.is_heir}
                                    onChange={(e) => setFormData({ ...formData, is_heir: e.target.checked })}
                                />
                                <span className="text-sm font-medium text-slate-700">Trưởng tộc / Nối dõi</span>
                            </label>
                        </div>

                        {/* Ngày sinh & Ngày mất */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Calendar size={16} /> Ngày sinh
                            </label>
                            <input
                                type="date"
                                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.birth_date || ''}
                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                            />
                        </div>

                        {!formData.is_alive && (
                            <div className="space-y-1 animate-in slide-in-from-top-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Activity size={16} className="text-red-500" /> Ngày mất
                                </label>
                                <input
                                    type="date"
                                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none"
                                    value={formData.death_date || ''}
                                    onChange={(e) => setFormData({ ...formData, death_date: e.target.value })}
                                />
                            </div>
                        )}

                        {/* Địa chỉ */}
                        <div className="col-span-full space-y-1">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <MapPin size={16} /> Địa chỉ thường trú
                            </label>
                            <input
                                type="text"
                                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.address || ''}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        {/* Tiểu sử */}
                        <div className="col-span-full space-y-1">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <FileText size={16} /> Tiểu sử / Ghi chú
                            </label>
                            <textarea
                                rows={4}
                                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                value={formData.bio || ''}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            ></textarea>
                        </div>
                    </div>
                </form>

                {/* Footer Buttons */}
                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg border bg-white hover:bg-slate-100 font-medium transition"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        form="edit-member-form"
                        disabled={loading}
                        className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition disabled:opacity-50"
                    >
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditMemberModal;