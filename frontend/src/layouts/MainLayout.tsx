import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const MainLayout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <Header />
            <main className="flex-grow flex flex-col">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
