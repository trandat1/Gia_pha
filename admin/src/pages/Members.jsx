import React, { useState, useEffect } from 'react';
import Tree from 'react-d3-tree';
import api from '../api/axios';
import { UserPlus, Users, Share2, Heart, Trash2 } from 'lucide-react';

const Members = () => {
    const [members, setMembers] = useState([]);
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        full_name: '',
        gender: 'Nam',
        is_heir: false,
        is_alive: true,
        birth_date: '',
        death_date: '',
        address: '',
        bio: '',
        father_id: '',
        mother_id: '',
        spouse_id: ''
    });

    const fetchData = async () => {
        try {
            const [resList, resTree] = await Promise.all([
                api.get('/members/'),
                api.get('/members/tree')
            ]);
            console.log("Dữ liệu từ Backend:", resList.data[0]);
            setMembers(resList.data);
            
            const formatData = (node) => ({
                name: node.full_name,
                attributes: { 
                    GT: node.gender,
                    Status: node.is_alive === true ? "Còn sống" : "Đã mất"
                },
                children: node.children?.map(formatData) || []
            });
            if (resTree.data && resTree.data.length > 0) {
                setTreeData(resTree.data.map(formatData));
            }
        } catch (err) { console.error("Lỗi tải dữ liệu:", err); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                father_id: formData.father_id ? parseInt(formData.father_id) : null,
                mother_id: formData.mother_id ? parseInt(formData.mother_id) : null,
                spouse_id: formData.spouse_id ? parseInt(formData.spouse_id) : null,
                birth_date: formData.birth_date || null,
                death_date: formData.death_date || null,
            };
            await api.post('/members/', payload);
            alert("Thêm thành viên thành công!");
            setFormData({
                full_name: '', gender: 'Nam', is_heir: false, is_alive: true,
                birth_date: '', death_date: '', address: '', bio: '',
                father_id: '', mother_id: '', spouse_id: ''
            });
            fetchData();
        } catch (err) {
            alert("Lỗi: " + (err.response?.data?.detail || "Không thể lưu"));
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4">
            <div className="grid grid-cols-12 gap-4">
                
                {/* 1. FORM NHẬP LIỆU CHI TIẾT (Cột 1-3) */}
                <div className="col-span-12 lg:col-span-3 bg-white p-5 rounded-xl shadow-sm border overflow-y-auto max-h-[90vh]">
                    <h2 className="text-blue-700 font-bold mb-4 flex items-center gap-2"><UserPlus size={18}/> Thêm Thành Viên</h2>
                    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                        <div>
                            <label className="font-semibold">Họ và Tên *</label>
                            <input type="text" className="w-full border p-2 rounded mt-1" required
                                value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="font-semibold">Giới tính</label>
                                <select className="w-full border p-2 rounded mt-1" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <div className="flex items-center mt-6 gap-2">
                                <input type="checkbox" id="is_heir" checked={formData.is_heir} onChange={e => setFormData({...formData, is_heir: e.target.checked})} />
                                <label htmlFor="is_heir">Nối dõi</label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="font-semibold text-green-600">Ngày sinh</label>
                                <input type="date" className="w-full border p-2 rounded mt-1" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
                            </div>
                            <div>
                                <label className="font-semibold text-red-600">Ngày mất</label>
                                <input type="date" className="w-full border p-2 rounded mt-1" disabled={formData.is_alive} value={formData.death_date} onChange={e => setFormData({...formData, death_date: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="is_alive" checked={formData.is_alive} onChange={e => setFormData({...formData, is_alive: e.target.checked})} />
                            <label htmlFor="is_alive">Còn sống</label>
                        </div>

                        <hr />

                        <div>
                            <label className="font-semibold">Cha</label>
                            <select className="w-full border p-2 rounded mt-1" value={formData.father_id} onChange={e => setFormData({...formData, father_id: e.target.value})}>
                                <option value="">-- Không rõ --</option>
                                {members.filter(m => m.gender === 'Nam').map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="font-semibold">Mẹ</label>
                            <select className="w-full border p-2 rounded mt-1" value={formData.mother_id} onChange={e => setFormData({...formData, mother_id: e.target.value})}>
                                <option value="">-- Không rõ --</option>
                                {members.filter(m => m.gender === 'Nữ').map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="font-semibold text-pink-600">Vợ / Chồng</label>
                            <select className="w-full border p-2 rounded mt-1" value={formData.spouse_id} onChange={e => setFormData({...formData, spouse_id: e.target.value})}>
                                <option value="">-- Độc thân --</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="font-semibold">Địa chỉ</label>
                            <input type="text" className="w-full border p-2 rounded mt-1" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>

                        <div>
                            <label className="font-semibold">Tiểu sử</label>
                            <textarea className="w-full border p-2 rounded mt-1 h-20" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})}></textarea>
                        </div>

                        <button disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all">
                            {loading ? "Đang lưu..." : "LƯU THÀNH VIÊN"}
                        </button>
                    </form>
                </div>

                {/* 2. DANH SÁCH (Cột 4-7) */}
                <div className="col-span-12 lg:col-span-4 bg-white p-5 rounded-xl shadow-sm border h-[90vh] flex flex-col">
                    <h2 className="text-slate-700 font-bold mb-4 flex items-center gap-2"><Users size={18}/> Danh sách tộc viên ({members.length})</h2>
                    <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                        {members.map(m => (
                            <div key={m.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center group">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-800">{m.full_name}</p>
                                        {m.is_heir && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Đích tôn</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-400">ID: {m.id} | {m.gender} | {m.is_alive ? 'Còn sống' : 'Đã mất'}</p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. SƠ ĐỒ CÂY (Cột 8-12) */}
                <div className="col-span-12 lg:col-span-5 bg-white p-5 rounded-xl shadow-sm border h-[90vh] flex flex-col relative">
                    <h2 className="text-slate-700 font-bold mb-4 flex items-center gap-2"><Share2 size={18}/> Cấu trúc Trực hệ</h2>
                    <div className="w-full flex-1 border-t rounded-b-xl overflow-hidden bg-slate-50">
                        {treeData ? (
                            <Tree 
                                data={treeData} 
                                orientation="vertical"
                                pathFunc="step"
                                translate={{ x: 200, y: 50 }}
                                nodeSize={{ x: 180, y: 100 }}
                                zoom={0.7}
                            />
                        ) : <div className="flex h-full items-center justify-center text-slate-300">Chưa có dữ liệu sơ đồ</div>}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Members;