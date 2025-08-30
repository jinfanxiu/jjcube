import { supabase } from '../../supabaseClient';

const LoginPage = () => {
    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            }
        });
    };

    return (
        <div className="flex-grow flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
            <div className="w-full max-w-sm p-8 space-y-8 bg-white rounded-2xl shadow-xl dark:bg-slate-800">
                <div>
                    <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100">
                        로그인
                    </h2>
                    <p className="mt-2 text-sm text-center text-slate-500 dark:text-slate-400">
                        제이제이큐브에 오신 것을 환영합니다.
                    </p>
                </div>
                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-3 py-3 px-4 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                >
                    <svg className="w-5 h-5" xmlns="http://www.w.org/2000/svg" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 8.841C34.524 4.962 29.472 2 24 2C11.832 2 2 11.832 2 24s9.832 22 22 22s22-9.832 22-22c0-1.341-.138-2.65-.389-3.917z" />
                        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l6.538-6.538C34.524 4.962 29.472 2 24 2C16.318 2 9.656 6.168 6.306 14.691z" />
                        <path fill="#4CAF50" d="M24 46c5.94 0 11.219-1.956 15.131-5.238l-6.533-6.533C30.591 36.687 27.455 38 24 38c-5.22 0-9.657-3.576-11.127-8.492l-6.573 4.818C9.657 41.832 16.318 46 24 46z" />
                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.16-4.087 5.571l6.533 6.533c3.887-3.803 6.251-9.043 6.251-15.185C44 22.65 43.862 21.34 43.611 20.083z" />
                    </svg>
                    Google 계정으로 로그인
                </button>
            </div>
        </div>
    );
};

export default LoginPage;