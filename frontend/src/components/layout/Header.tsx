import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="sticky top-0 z-40 backdrop-blur bg-white/60 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
                <Link to="/" className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center">
                        <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M32 4L60 18V46L32 60L4 46V18L32 4Z" fill="#5b6cff" />
                            <path d="M32 4L60 18L32 32L4 18L32 4Z" fill="#8796ff" />
                            <path d="M32 32L60 18V46L32 60V32Z" fill="#3f4df2" />
                        </svg>
                    </span>
                    <div>
                        <p className="font-black text-lg tracking-tight">제이제이큐브</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">제이제이 뷰티 아카데미: 프리미엄 마케팅</p>
                    </div>
                </Link>
            </div>
        </header>
    );
};

export default Header;