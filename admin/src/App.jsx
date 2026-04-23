import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import Members from './pages/Members'; // File gia phả của bạn
import UserManagement from './pages/UserManagement';
// Các trang trống tạm thời (Bạn sẽ tạo sau)
const Rules = () => <div className="p-6"><h2>Nội quy gia tộc (Đang xây dựng)</h2></div>;
// const Roles = () => <div className="p-6"><h2>Phân quyền (Đang xây dựng)</h2></div>;
const Settings = () => <div className="p-6"><h2>Cài đặt cá nhân (Đang xây dựng)</h2></div>;

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Route tự do */}
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={<Navigate to="/admin/members" replace />} />
                {/* <Route path="/dashboard" element={<Navigate to="/admin/members" replace />} /> */}
                <Route path="/admin" element={
                    <ProtectedRoute>
                        <AdminLayout />
                    </ProtectedRoute>
                }>
                <Route element={<AdminRoute />}>
                        <Route path="users" element={<UserManagement />} />
                </Route>                    
                <Route path="members" element={<Members />} />
                <Route path="rules" element={<Rules />} />
                {/* <Route path="roles" element={<Roles />} /> */}
                <Route path="settings" element={<Settings />} />
                </Route>
            </Routes>
        </AuthProvider>
    );
}

export default App;