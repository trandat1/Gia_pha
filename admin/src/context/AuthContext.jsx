import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const res = await api.get('/auth/login/me');
            setUser(res.data);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        checkAuth();
    }, []);

    const logout = async () => {
        try {
            // 1. Gọi API xuống Backend để trình duyệt tự động xóa HttpOnly Cookie
            // (Đường dẫn có thể là /auth/logout tùy thuộc vào prefix router của bạn)
            await api.post('/auth/logout'); 
        } catch (error) {
            console.error("Lỗi khi gọi API đăng xuất:", error);
        } finally {
            // 2. Dù API có lỗi mạng hay không, vẫn xóa state ở máy khách và chuyển trang
            setUser(null);
            window.location.href = '/login';
        }
    };
    return (
        <AuthContext.Provider value={{ user, setUser, loading, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);