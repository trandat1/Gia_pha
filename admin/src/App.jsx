import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import Members from './pages/Members'; // File gia phả của bạn

// Các trang trống tạm thời (Bạn sẽ tạo sau)
const Rules = () => <div className="p-6"><h2>Nội quy gia tộc (Đang xây dựng)</h2></div>;
const Roles = () => <div className="p-6"><h2>Phân quyền (Đang xây dựng)</h2></div>;
const Settings = () => <div className="p-6"><h2>Cài đặt cá nhân (Đang xây dựng)</h2></div>;

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Route tự do */}
                <Route path="/login" element={<Login />} />
                
                {/* Tự động chuyển hướng từ gốc vào dashboard */}
                <Route path="/" element={<Navigate to="/admin/members" replace />} />

                {/* Các Route cần bảo vệ nằm trong Layout */}
                <Route path="/admin" element={
                    <ProtectedRoute>
                        <AdminLayout />
                    </ProtectedRoute>
                }>
                    {/* Đây là các trang sẽ chui vào thẻ <Outlet /> của AdminLayout */}
                    <Route path="members" element={<Members />} />
                    <Route path="rules" element={<Rules />} />
                    <Route path="roles" element={<Roles />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
            </Routes>
        </AuthProvider>
    );
}

export default App;