import { Link } from 'react-router-dom';

const NotFoundPage = () => {
    return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-6xl font-extrabold text-indigo-600 dark:text-indigo-400">404</h1>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                페이지를 찾을 수 없습니다.
            </h2>
            <p className="mt-4 text-base text-slate-500 dark:text-slate-400">
                죄송합니다. 요청하신 페이지가 존재하지 않거나, 다른 곳으로 이동했을 수 있습니다.
            </p>
            <Link
                to="/"
                className="mt-8 inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-5 py-3 text-base font-medium text-white hover:bg-indigo-700"
            >
                홈으로 돌아가기
            </Link>
        </div>
    );
};

export default NotFoundPage;