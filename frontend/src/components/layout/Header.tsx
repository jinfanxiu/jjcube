import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';

const Header = () => {
    const { profile, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isMobileMenuOpen]);


    const handleLogout = async () => {
        await logout();
        setIsMobileMenuOpen(false);
        navigate('/login');
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const activeLinkStyle = {
        color: '#4f46e5',
        fontWeight: '700',
    };

    const navLinkClasses = "text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100 transition-colors duration-200 hover:text-indigo-600 dark:hover:text-indigo-400";
    const mobileNavLinkClasses = "block rounded-md px-3 py-2 text-base font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800";

    return (
        <header className="sticky top-0 z-50 backdrop-blur bg-white/60 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo and Desktop Menu */}
                    <div className="flex items-center gap-x-8">
                        <Link to="/" className="flex items-center gap-3" onClick={closeMobileMenu}>
                             <span className="inline-flex h-9 w-9 items-center justify-center">
                                <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M32 4L60 18V46L32 60L4 46V18L32 4Z" fill="#5b6cff" />
                                    <path d="M32 4L60 18L32 32L4 18L32 4Z" fill="#8796ff" />
                                    <path d="M32 32L60 18V46L32 60V32Z" fill="#3f4df2" />
                                </svg>
                            </span>
                            <div>
                                <p className="font-black text-lg tracking-tight">제이제이큐브</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">제이제이 뷰티 아카데미</p>
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

                    {/* Right side: Profile and Mobile button */}
                    <div className="flex items-center">
                        <div className="hidden lg:flex lg:items-center lg:space-x-4">
                            {profile ? (
                                <>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{profile.nickname || '사용자'}님</span>
                                    <button onClick={handleLogout} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">로그아웃</button>
                                </>
                            ) : (
                                <Link to="/login" className={navLinkClasses}>로그인</Link>
                            )}
                        </div>
                        <div className="lg:hidden ml-4">
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-slate-400 focus:outline-none">
                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Panel */}
            <div className={`fixed inset-0 z-50 transform transition-transform ease-in-out duration-300 lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="absolute inset-0 bg-black/40" onClick={closeMobileMenu}></div>
                <div className="relative w-64 h-full bg-white dark:bg-slate-900 ml-auto flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h2 className="font-bold">메뉴</h2>
                        <button onClick={closeMobileMenu} className="p-2 rounded-md text-slate-400 focus:outline-none">
                            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <nav className="flex-grow p-4 space-y-2">
                        {profile?.role === 'admin' && (
                            <>
                                <NavLink to="/admin" onClick={closeMobileMenu} className={mobileNavLinkClasses}>회원 관리</NavLink>
                                <NavLink to="/toolbox" onClick={closeMobileMenu} className={mobileNavLinkClasses}>툴박스</NavLink>
                            </>
                        )}
                        {profile?.role === 'member' && profile.is_approved && (
                            <NavLink to="/toolbox" onClick={closeMobileMenu} className={mobileNavLinkClasses}>툴박스</NavLink>
                        )}
                    </nav>
                    <div className="border-t border-slate-200 dark:border-slate-800 p-4">
                        {profile ? (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{profile.nickname || '사용자'}님</span>
                                <button onClick={handleLogout} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">로그아웃</button>
                            </div>
                        ) : (
                            <Link to="/login" onClick={closeMobileMenu} className={mobileNavLinkClasses}>로그인</Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;