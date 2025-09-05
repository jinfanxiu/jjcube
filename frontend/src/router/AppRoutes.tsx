import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ToolboxPage from '../pages/toolbox/ToolboxPage';
import LoginPage from '../pages/auth/LoginPage';
import PendingApprovalPage from '../pages/auth/PendingApprovalPage';
import AdminPage from '../pages/admin/AdminPage';
import MirrorImagePage from '../pages/toolbox/MirrorImagePage';
import { useAuth } from '../context/AuthProvider';
import UnifiedGeneratorPage from '../pages/toolbox/UnifiedGeneratorPage';

const AppRoutes = () => {
    const { session, profile, loading } = useAuth();

    if (loading) {
        return <div className="flex-grow flex items-center justify-center">Loading...</div>;
    }

    const renderRoutes = () => {
        if (!session || !profile) {
            return (
                <>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
            );
        }

        if (profile.role === 'admin') {
            return (
                <>
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/toolbox" element={<ToolboxPage />} />
                    <Route path="/toolbox/mirror-image" element={<MirrorImagePage />} />
                    <Route path="/toolbox/post-generator" element={<UnifiedGeneratorPage />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                </>
            );
        }

        if (profile.role === 'member') {
            if (profile.is_approved) {
                return (
                    <>
                        <Route path="/toolbox" element={<ToolboxPage />} />
                        <Route path="/toolbox/mirror-image" element={<MirrorImagePage />} />
                        <Route path="/toolbox/post-generator" element={<UnifiedGeneratorPage />} />
                        <Route path="*" element={<Navigate to="/toolbox" replace />} />
                    </>
                );
            } else {
                return (
                    <>
                        <Route path="/pending-approval" element={<PendingApprovalPage />} />
                        <Route path="*" element={<Navigate to="/pending-approval" replace />} />
                    </>
                );
            }
        }

        return <Route path="*" element={<Navigate to="/login" replace />} />;
    };

    return (
        <Routes>
            <Route element={<MainLayout />}>
                {renderRoutes()}
            </Route>
        </Routes>
    );
};

export default AppRoutes;