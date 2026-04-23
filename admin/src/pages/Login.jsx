import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Lock, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
const Login = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { checkAuth } = useAuth();
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        
        // Sử dụng URLSearchParams là cách an toàn nhất để gửi Form Data cho OAuth2 FastAPI
        const params = new URLSearchParams();
        params.append('username', phone); // FastAPI mặc định coi field này là username
        params.append('password', password);

        try {
            await api.post('/auth/login/access-token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            await checkAuth();
            navigate('/admin/members');
        } catch (err) {
            const message = err.response?.data?.detail || 'Số điện thoại hoặc mật khẩu không đúng!';
            setError(message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-extrabold mb-2 text-center text-slate-900">Họ Trần Gia Phả</h2>
                <p className="text-center text-slate-500 mb-8">Trang quản trị trực hệ</p>
                
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center border border-red-100">{error}</div>}
                
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Số điện thoại</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-slate-400 size-5" />
                            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                className="pl-10 block w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="Nhập số điện thoại Admin" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-slate-400 size-5" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 block w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="••••••••" required />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 cursor-pointer">
                        Đăng nhập hệ thống
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;