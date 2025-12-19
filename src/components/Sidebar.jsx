import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Car, Calendar, Wrench, UserCog, LogOut, User, Shield, FileText, ChevronLeft, ChevronRight, BarChart3, Package, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

/**
 * Componente de la barra lateral de navegación.
 * Muestra los enlaces de navegación disponibles según el rol del usuario.
 * @param {Object} props - Las propiedades del componente.
 * @param {boolean} props.isOpen - Indica si la barra lateral está abierta o cerrada.
 * @param {Function} props.toggleSidebar - Función para alternar el estado de la barra lateral.
 * @returns {JSX.Element} El componente de la barra lateral.
 */
const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const links = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Administrador', 'Recepcionista'] },
        { name: 'Mi Portal', path: '/portal', icon: User, roles: ['Cliente'] },
        { name: 'Historial', path: '/portal/history', icon: History, roles: ['Cliente'] },
        { name: 'Clientes', path: '/clients', icon: Users, roles: ['Administrador', 'Recepcionista'] },
        { name: 'Vehículos', path: '/vehicles', icon: Car, roles: ['Administrador', 'Recepcionista'] },
        { name: 'Citas', path: '/appointments', icon: Calendar, roles: ['Administrador', 'Recepcionista'] },
        { name: 'Servicios', path: '/services', icon: Wrench, roles: ['Administrador', 'Recepcionista'] },
        { name: 'Refacciones', path: '/spare-parts', icon: Package, roles: ['Administrador', 'Recepcionista'] },
        { name: 'Mis Trabajos', path: '/technician', icon: UserCog, roles: ['Mecanico'] },
        { name: 'Bitácora', path: '/service-logs', icon: FileText, roles: ['Administrador', 'Recepcionista', 'Mecanico'] },
        { name: 'Reportes', path: '/reports', icon: BarChart3, roles: ['Administrador'] },
        { name: 'Usuarios', path: '/users', icon: Shield, roles: ['Administrador'] },
    ];

    const userRole = user?.rol || 'Guest';

    const filteredLinks = links.filter(link => link.roles.includes(userRole));

    return (
        <div className={clsx(
            "h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-10 transition-all duration-300",
            isOpen ? "w-64" : "w-20"
        )}>
            <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 bg-white">
                <div className={clsx("overflow-hidden transition-all duration-300 flex items-center justify-start", isOpen ? "w-full opacity-100" : "w-0 opacity-0")}>
                    <img
                        src="/logo.png"
                        alt="CIP Logo"
                        className="h-14 w-auto object-contain"
                    />
                </div>
                <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0 ml-2"
                >
                    {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
                {filteredLinks.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        title={!isOpen ? link.name : ''}
                        className={clsx(
                            'flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                            location.pathname === link.path
                                ? 'bg-foton-blue text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-foton-blue',
                            !isOpen && 'justify-center'
                        )}
                    >
                        <link.icon className={clsx("w-5 h-5 flex-shrink-0", isOpen && "mr-3")} />
                        <span className={clsx("whitespace-nowrap transition-all duration-300", isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden")}>
                            {link.name}
                        </span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                <div className={clsx("flex items-center gap-3 mb-4 transition-all duration-300", isOpen ? "px-2" : "justify-center flex-col gap-1")}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex-shrink-0 flex items-center justify-center text-blue-700 font-bold text-lg shadow-sm border border-blue-200">
                        {user?.nombre?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className={clsx("overflow-hidden transition-all duration-300", isOpen ? "w-auto opacity-100" : "w-0 opacity-0 h-0")}>
                        <p className="text-sm font-bold text-gray-800 whitespace-nowrap leading-tight">{user?.nombre || 'Usuario'}</p>
                        <p className="text-xs text-blue-600 font-medium whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-blue-100">
                            {userRole}
                        </p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    title={!isOpen ? "Cerrar Sesión" : ''}
                    className={clsx(
                        "w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-white hover:text-red-600 hover:shadow-sm hover:border-gray-200 border border-transparent transition-all duration-200 group",
                        !isOpen && "justify-center"
                    )}
                >
                    <LogOut className={clsx("w-5 h-5 flex-shrink-0 transition-colors group-hover:text-red-500", isOpen && "mr-3")} />
                    <span className={clsx("whitespace-nowrap transition-all duration-300 font-medium", isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden")}>
                        Cerrar Sesión
                    </span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
