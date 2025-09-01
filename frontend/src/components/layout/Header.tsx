import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';

const Header = () => {
    const { profile, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const activeLinkStyle = {
        color: '#4f46e5',
        fontWeight: '700',
    };

    const navLinkClasses = "text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100 transition-colors duration-200 hover:text-indigo-600 dark:hover:text-indigo-400";

    const getLogoPath = () => {
        if (!profile) {
            return '/';
        }
        if (profile.role === 'admin') {
            return '/admin';
        }
        if (profile.role === 'member') {
            return profile.is_approved ? '/toolbox' : '/pending-approval';
        }
        return '/';
    };

    return (
        <header className="sticky top-0 z-50 backdrop-blur bg-white/60 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-x-8">
                        <Link to={getLogoPath()} className="flex items-center gap-3">
                             <span className="inline-flex h-9 w-9 items-center justify-center">
                                <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M32 4L60 18V46L32 60L4 46V18L32 4Z" fill="#5b6cff" />
                                    <path d="M32 4L60 18L32 32L4 18L32 4Z" fill="#8796ff" />
                                    <path d="M32 32L60 18V46L32 60V32Z" fill="#3f4df2" />
                                </svg>
                            </span>
                            <div>
                                <p className="font-black text-lg tracking-tight">제이제이큐브</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">제이제이 뷰티 아카데미 마케팅</p>
                            </div>
                        </Link>
                        <div className="hidden lg:flex lg:gap-x-8">
                            {profile?.role === 'admin' && (
                                <>
                                    <NavLink to="/admin" className={navLinkClasses} style={({ isActive }) => isActive ? activeLinkStyle : undefined}>회원 관리</NavLink>
                                    <NavLink to="/toolbox" className={navLinkClasses} style={({ isActive }) => isActive ? activeLinkStyle : undefined}>툴박스</NavLink>
                                </>
                            )}
                            {profile?.role === 'member' && profile.is_approved && (
                                <NavLink to="/toolbox" className={navLinkClasses} style={({ isActive }) => isActive ? activeLinkStyle : undefined}>툴박스</NavLink>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {profile ? (
                            <>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{profile.nickname || '사용자'}님</span>
                                <button onClick={handleLogout} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">로그아웃</button>
                            </>
                        ) : (
                            <Link to="/login" className={navLinkClasses}>로그인</Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;