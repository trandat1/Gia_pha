import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
    const { user, loading } = useAuth();

    if (loading) return <div>Đang tải...</div>;
    const isAdmin = user?.is_superuser;

    // Nếu không phải admin, đá văng về trang members
    if (!isAdmin) {
        return <Navigate to="/admin/members" replace />;
    }

    // Nếu là admin, cho phép vào (hiển thị nội dung bên trong)
    return <Outlet />;
};

export default AdminRoute;