import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ToolboxPage from '../pages/toolbox/ToolboxPage';
import LoginPage from '../pages/auth/LoginPage';
import PendingApprovalPage from '../pages/auth/PendingApprovalPage';
import AdminPage from '../pages/admin/AdminPage';
import FeedbackPage from '../pages/feedback/FeedbackPage'; // 추가
import NotFoundPage from '../pages/error/NotFoundPage';   // 추가
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
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        );
    }

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
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/" element={<Navigate to="/admin" replace />} />
                    <Route path="*" element={<NotFoundPage />} />
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
                        <Route path="/feedback" element={<FeedbackPage />} />
                        <Route path="/" element={<Navigate to="/toolbox" replace />} />
                        <Route path="*" element={<NotFoundPage />} />
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
                        <Route path="/feedback" element={<FeedbackPage />} />
                        <Route path="/" element={<Navigate to="/pending-approval" replace />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Route>
                </Routes>
            );
        }
    }

    return <Navigate to="/login" replace />;
};

export default AppRoutes;