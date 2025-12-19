import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className={`transition-all duration-300 ${isSidebarOpen ? 'pl-64' : 'pl-20'}`}>
                <main className="p-8 min-h-[calc(100vh-4rem)]">
                    <Outlet />
                </main>
                <footer className="h-16 border-t border-gray-200 bg-white flex items-center justify-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} CIP Service Management. Todos los derechos reservados.
                </footer>
            </div>
        </div>
    );
};

export default Layout;
