import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Network, // Icon cho Gia phả
    BookOpen, // Icon cho Nội quy
    ShieldCheck, // Icon cho Phân quyền
    Settings,
    LogOut,
    UserCircle
} from 'lucide-react';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);

    // Menu Sidebar (Bạn có thể thêm bớt ở đây)
    const menuItems = [
        { path: '/admin/members', name: 'Sơ đồ Gia phả', icon: <Network size={20} /> },
        { path: '/admin/rules', name: 'Nội quy', icon: <BookOpen size={20} /> },
        { path: '/admin/roles', name: 'Phân quyền', icon: <ShieldCheck size={20} /> },
    ];

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
            
            {/* SIDEBAR (Cột trái) */}
            <aside className="w-64 bg-white border-r shadow-sm flex flex-col z-20">
                <div className="h-16 flex items-center justify-center border-b">
                    <h1 className="text-xl font-bold text-blue-700">GIA TỘC HỌ TRẦN</h1>
                </div>
                
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                                    isActive 
                                        ? 'bg-blue-50 text-blue-700 font-semibold' 
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                                }`
                            }
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* PHẦN BÊN PHẢI (Header + Nội dung) */}
            <div className="flex-1 flex flex-col relative">
                
                {/* HEADER (Thanh trên) */}
                <header className="h-16 bg-white border-b shadow-sm flex items-center justify-end px-6 z-10">
                    <div className="relative">
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-2 hover:bg-slate-50 p-2 rounded-lg transition"
                        >
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-slate-700">{user?.full_name || 'Admin'}</p>
                                <p className="text-[10px] text-slate-400">Quản trị viên</p>
                            </div>
                            {/* Avatar Tạm thời */}
                            <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <UserCircle size={24} />
                            </div>
                        </button>

                        {/* Dropdown Menu (Logout, Settings) */}
                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-lg py-2">
                                <button 
                                    onClick={() => { setShowDropdown(false); navigate('/admin/settings'); }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <Settings size={16} /> Cài đặt tài khoản
                                </button>
                                <div className="border-t my-1"></div>
                                <button 
                                    onClick={logout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <LogOut size={16} /> Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* MAIN CONTENT (Phần nội dung thay đổi) */}
                <main className="flex-1 overflow-auto relative">
                    {/* Thẻ Outlet sẽ được thay thế bằng các component con (Members, Rules...) */}
                    <Outlet /> 
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;