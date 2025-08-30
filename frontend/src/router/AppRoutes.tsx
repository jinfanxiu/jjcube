import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ToolboxPage from '../pages/toolbox/ToolboxPage';
import LoginPage from '../pages/auth/LoginPage';
import PendingApprovalPage from '../pages/auth/PendingApprovalPage';
import AdminPage from '../pages/admin/AdminPage';
import { useAuth } from '../context/AuthProvider';

const AppRoutes = () => {
    const { session, profile, loading } = useAuth();

    if (loading) {
        return <div className="flex-grow flex items-center justify-center">Loading Application...</div>;
    }

    // 로그인하지 않은 사용자
    if (!session) {
        return (
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Route>
            </Routes>
        );
    }

    // 로그인한 사용자 (프로필 정보 로딩 중일 수 있음)
    if (!profile) {
        // 프로필을 기다리는 동안 로딩 상태를 보여주거나,
        // 혹은 승인 대기 페이지로 잠시 보낼 수 있습니다.
        // 여기서는 로딩을 보여주는 것이 더 나은 사용자 경험을 제공합니다.
        return <div className="flex-grow flex items-center justify-center">Loading Profile...</div>;
    }

    // 관리자
    if (profile.role === 'admin') {
        return (
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/toolbox" element={<ToolboxPage />} />
                    {/* 관리자의 기본 페이지는 /admin 입니다. */}
                    <Route path="/" element={<Navigate to="/admin" replace />} />
                    {/* 정의되지 않은 모든 경로는 /admin 으로 보냅니다. */}
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>
            </Routes>
        );
    }

    // 일반 회원
    if (profile.role === 'member') {
        // 승인된 회원
        if (profile.is_approved) {
            return (
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/toolbox" element={<ToolboxPage />} />
                        {/* 승인된 회원의 기본 페이지는 /toolbox 입니다. */}
                        <Route path="/" element={<Navigate to="/toolbox" replace />} />
                        {/* 정의되지 않은 모든 경로는 /toolbox 로 보냅니다. */}
                        <Route path="*" element={<Navigate to="/toolbox" replace />} />
                    </Route>
                </Routes>
            );
        }
        // 승인 대기 회원
        else {
            return (
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/pending-approval" element={<PendingApprovalPage />} />
                        {/* 승인 대기 회원의 기본 페이지는 /pending-approval 입니다. */}
                        <Route path="/" element={<Navigate to="/pending-approval" replace />} />
                        {/* 정의되지 않은 모든 경로는 /pending-approval 로 보냅니다. */}
                        <Route path="*" element={<Navigate to="/pending-approval" replace />} />
                    </Route>
                </Routes>
            );
        }
    }

    return <Navigate to="/login" replace />;
};

export default AppRoutes;