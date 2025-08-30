import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ToolboxPage from '../pages/toolbox/ToolboxPage';
import LoginPage from '../pages/auth/LoginPage';
import PendingApprovalPage from '../pages/auth/PendingApprovalPage';
import AdminPage from '../pages/admin/AdminPage'; // 새로 만든 AdminPage를 import 합니다.
import { useAuth } from '../context/AuthProvider';

const AppRoutes = () => {
    const { session, profile, loading } = useAuth();

    if (loading) {
        return <div>Loading Application...</div>;
    }

    // --- 사용자가 로그인한 경우의 로직 ---
    if (session) {
        // 1. 관리자(admin)인 경우
        if (profile?.role === 'admin') {
            return (
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<Navigate to="/admin" replace />} />
                        <Route path="admin" element={<AdminPage />} />
                    </Route>
                    {/* 관리자는 다른 모든 경로 접근 시 /admin으로 리디렉션됩니다. */}
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
            );
        }

        // 2. 승인된 일반 회원(member)인 경우
        if (profile?.is_approved) {
            return (
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<Navigate to="/toolbox" replace />} />
                        <Route path="toolbox" element={<ToolboxPage />} />
                    </Route>
                    {/* 승인된 회원은 승인 대기 페이지나 로그인 페이지에 접근할 수 없습니다. */}
                    <Route path="/pending-approval" element={<Navigate to="/toolbox" replace />} />
                    <Route path="/login" element={<Navigate to="/toolbox" replace />} />
                    <Route path="*" element={<Navigate to="/toolbox" replace />} />
                </Routes>
            );
        }

        // 3. 로그인은 했지만, 아직 승인되지 않은 경우
        return (
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<Navigate to="/pending-approval" replace />} />
                    <Route path="pending-approval" element={<PendingApprovalPage />} />
                </Route>
                {/* 승인 대기자는 toolbox 등 다른 서비스 페이지에 접근할 수 없습니다. */}
                <Route path="/toolbox" element={<Navigate to="/pending-approval" replace />} />
                <Route path="*" element={<Navigate to="/pending-approval" replace />} />
            </Routes>
        );
    }

    // --- 사용자가 로그인하지 않은 경우의 로직 ---
    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/login" replace />} />
                <Route path="login" element={<LoginPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default AppRoutes;