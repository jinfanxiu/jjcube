import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';

const Header = () => {
    const { profile, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        setIsMobileMenuOpen(false);
        navigate('/login');
    };

    const activeLinkStyle = { color: '#4f46e5', fontWeight: '700' };

    const navLinkClasses = "text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100 transition-colors duration-200 hover:text-indigo-600 dark:hover:text-indigo-400";
    const mobileNavLinkClasses = "block rounded-lg py-2 px-3 text-base font-semibold leading-7 text-slate-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800";

    const getLogoPath = () => {
        if (!profile) return '/';
        if (profile.role === 'admin') return '/admin';
        if (profile.role === 'member') return profile.is_approved ? '/toolbox' : '/pending-approval';
        return '/';
    };

    const renderNavLinks = (isMobile = false) => {
        const className = isMobile ? mobileNavLinkClasses : navLinkClasses;
        const style = ({ isActive }: { isActive: boolean }) => isActive ? activeLinkStyle : undefined;
        const closeMenu = () => setIsMobileMenuOpen(false);

        return (
            <>
                {profile?.role === 'admin' && (
                    <>
                        <NavLink to="/admin" className={className} style={style} onClick={closeMenu}>회원 관리</NavLink>
                        <NavLink to="/toolbox" className={className} style={style} onClick={closeMenu}>툴박스</NavLink>
                    </>
                )}
                {profile?.role === 'member' && profile.is_approved && (
                    <NavLink to="/toolbox" className={className} style={style} onClick={closeMenu}>툴박스</NavLink>
                )}
            </>
        );
    };

    return (
        <>
            <header className="sticky top-0 z-40 backdrop-blur bg-white/60 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <nav className="flex h-16 items-center justify-between">
                        {/* PC 로고 & 메뉴 */}
                        <div className="flex items-center gap-x-8">
                            <Link to={getLogoPath()} className="flex items-center gap-3">
                                <span className="inline-flex h-9 w-9 items-center justify-center">
                                   <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 4L60 18V46L32 60L4 46V18L32 4Z" fill="#5b6cff" /><path d="M32 4L60 18L32 32L4 18L32 4Z" fill="#8796ff" /><path d="M32 32L60 18V46L32 60V32Z" fill="#3f4df2" /></svg>
                                </span>
                                <div>
                                    <p className="font-black text-lg tracking-tight">제이제이큐브</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">제이제이 뷰티 아카데미 마케팅</p>
                                </div>
                            </Link>
                            <div className="hidden lg:flex lg:gap-x-8">
                                {renderNavLinks()}
                            </div>
                        </div>

                        {/* PC 사용자 정보 & 로그아웃 */}
                        <div className="hidden lg:flex items-center space-x-4">
                            {profile ? (
                                <>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{profile.nickname || '사용자'}님</span>
                                    <button onClick={handleLogout} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">로그아웃</button>
                                </>
                            ) : (
                                <Link to="/login" className={navLinkClasses}>로그인</Link>
                            )}
                        </div>

                        {/* 모바일 닉네임 & 햄버거 버튼 */}
                        <div className="flex items-center space-x-4 lg:hidden">
                            {profile ? (
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{profile.nickname || '사용자'}님</span>
                            ) : (
                                <Link to="/login" className={navLinkClasses}>로그인</Link>
                            )}
                            <button
                                type="button"
                                className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-700 dark:text-slate-200"
                                onClick={() => setIsMobileMenuOpen(true)}
                            >
                                <span className="sr-only">Open main menu</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* 모바일 메뉴 */}
            <div className={`lg:hidden ${isMobileMenuOpen ? 'visible' : 'invisible'}`} role="dialog" aria-modal="true">
                {/* Backdrop */}
                <div
                    className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-300 ease-in-out ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                />

                {/* ▼▼▼ (핵심 수정) Panel 너비를 w-4/5 max-w-sm 로 변경 ▼▼▼ */}
                <div
                    className={`fixed inset-y-0 right-0 z-50 w-1/2 max-w-sm overflow-y-auto bg-white dark:bg-slate-900 px-6 py-6 sm:ring-1 sm:ring-gray-900/10 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    {/* ▼▼▼ (핵심 수정) 환영 메시지와 닫기 버튼을 포함한 헤더 추가 ▼▼▼ */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800">
                        {profile ? (
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                {profile.nickname || '사용자'}님
                            </h2>
                        ) : (
                            <span /> // 로그인 안했을 때 공간 차지를 위한 빈 요소
                        )}
                        <button
                            type="button"
                            className="-m-2.5 rounded-md p-2.5 text-slate-700 dark:text-slate-200"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span className="sr-only">Close menu</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="mt-6 flow-root">
                        <div className="-my-6 divide-y divide-gray-500/10 dark:divide-gray-200/10">
                            <div className="space-y-2 py-6">
                                {renderNavLinks(true)}
                            </div>
                            <div className="py-6">
                                {profile && (
                                    <button onClick={handleLogout} className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-slate-800 w-full text-left">
                                        로그아웃
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Header;