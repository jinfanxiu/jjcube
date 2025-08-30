import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ToolboxPage from '../pages/toolbox/ToolboxPage';
import LoginPage from '../pages/auth/LoginPage';
import PendingApprovalPage from '../pages/auth/PendingApprovalPage';
import AdminPage from '../pages/admin/AdminPage';
import { useAuth } from '../context/AuthProvider';

const AppRoutes = () => {
    const { session, profile, loading } = useAuth();

    // AuthProvider가 session과 profile을 모두 로드할 때까지 기다립니다.
    if (loading) {
        return <div className="flex-grow flex items-center justify-center">Loading Application...</div>;
    }

    // 로딩이 끝났지만 세션이 없는 경우 (로그아웃 상태)
    if (!session) {
        return (
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    {/* 로그인되지 않은 사용자는 다른 모든 경로 접근 시 로그인 페이지로 리디렉션 */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Route>
            </Routes>
        );
    }

    // 세션은 있지만, 프로필이 아직 로드되지 않은 예외적인 상황
    // (보통 loading 상태에서 처리되지만, 만약을 위한 방어 코드)
    if (!profile) {
        return <div className="flex-grow flex items-center justify-center">Loading Profile...</div>;
    }

    // 관리자
    if (profile.role === 'admin') {
        return (
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/toolbox" element={<ToolboxPage />} />
                    <Route path="/" element={<Navigate to="/admin" replace />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>
            </Routes>
        );
    }

    // 일반 회원
    if (profile.role === 'member') {
        if (profile.is_approved) {
            return (
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/toolbox" element={<ToolboxPage />} />
                        <Route path="/" element={<Navigate to="/toolbox" replace />} />
                        <Route path="*" element={<Navigate to="/toolbox" replace />} />
                    </Route>
                </Routes>
            );
        } else {
            return (
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/pending-approval" element={<PendingApprovalPage />} />
                        <Route path="/" element={<Navigate to="/pending-approval" replace />} />
                        <Route path="*" element={<Navigate to="/pending-approval" replace />} />
                    </Route>
                </Routes>
            );
        }
    }

    // 알 수 없는 역할일 경우, 안전하게 로그아웃 처리 후 로그인 페이지로 보냅니다.
    // 이 경우는 거의 발생하지 않습니다.
    return <Navigate to="/login" replace />;
};

export default AppRoutes;