import { useAuth } from '../../context/AuthProvider';

const PendingApprovalPage = () => {
    const { logout, user } = useAuth();

    const displayName = user?.user_metadata?.full_name || user?.email || '사용자';

    return (
        <div className="flex-grow flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
            <div className="w-full max-w-md p-8 text-center bg-white rounded-2xl shadow-xl dark:bg-slate-800">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    승인 대기 중
                </h2>
                <p className="mt-4 text-slate-600 dark:text-slate-300">
                    안녕하세요, <span className="font-semibold">{displayName}</span>님.
                </p>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                    관리자가 계정을 승인할 때까지 잠시만 기다려주세요.
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    승인이 완료되면 모든 기능을 사용하실 수 있습니다.
                </p>
                <button
                    onClick={logout}
                    type="button"
                    className="mt-8 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    로그아웃
                </button>
            </div>
        </div>
    );
};

export default PendingApprovalPage;