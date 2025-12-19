import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, CheckCircle, XCircle, Truck, PlusCircle, UserPlus, Car, ArrowRight, Activity, Clock, Users, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

/**
 * Componente principal del Dashboard.
 * Muestra estadísticas generales, gráficas y accesos rápidos según el rol del usuario.
 * @returns {JSX.Element} El componente del Dashboard.
 */
const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isReceptionist = user?.rol === 'Recepcionista';

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get('/dashboard/stats');
            setStats(res.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('No se pudieron cargar los datos del dashboard. Por favor, intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foton-blue"></div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="text-red-600 mb-4">{error}</div>
            <button
                onClick={fetchStats}
                className="px-4 py-2 bg-foton-blue text-white rounded-lg hover:bg-blue-800 transition-colors"
            >
                Reintentar
            </button>
        </div>
    );

    if (!stats) return null;

    const cards = [
        { title: 'Citas del Día', value: stats.citasHoy, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        { title: 'Servicios Completados', value: stats.serviciosCompletados, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
        { title: 'Cancelaciones', value: stats.cancelaciones, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
        { title: 'Vehículos en Taller', value: stats.vehiculosTaller, icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
    ];

    const COLORS = ['#0066B3', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const getRoleDescription = (role) => {
        switch (role) {
            case 'Administrador': return 'Panel de control maestro.';
            case 'Mecanico': return 'Área de trabajo técnico.';
            case 'Recepcionista': return 'Gestión de atención al cliente.';
            default: return 'Bienvenido al sistema.';
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } }
    };

    const itemVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } }
    };

    return (
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Welcome Banner */}
            <motion.div
                variants={itemVariants}
                className="relative overflow-hidden bg-gradient-to-r from-foton-blue to-blue-900 rounded-2xl shadow-xl p-8 text-white"
            >
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-400 opacity-10 rounded-full blur-2xl"></div>

                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 tracking-tight">¡Bienvenido, {user?.nombre || 'Usuario'}!</h1>
                        <p className="text-blue-100 text-lg font-light opacity-90">
                            {user?.rol} • {getRoleDescription(user?.rol)}
                        </p>
                    </div>
                    <div className="hidden md:block bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/10">
                        <p className="text-sm font-medium text-blue-100 uppercase tracking-wider text-center mb-1">Fecha</p>
                        <p className="text-2xl font-bold">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards - Same for both but maybe different order/content later if needed */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, index) => (
                    <motion.div
                        key={index}
                        variants={itemVariants}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className={`bg-white rounded-2xl shadow-sm border ${card.border} p-6 flex items-center transition-all hover:shadow-md`}
                    >
                        <div className={`p-4 rounded-xl ${card.bg} mr-5`}>
                            <card.icon className={`w-8 h-8 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">{card.title}</p>
                            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-foton-blue" />
                    Acciones Rápidas
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Nueva Cita', sub: 'Agendar servicio', icon: PlusCircle, color: 'text-foton-blue', bg: 'bg-blue-50', path: '/appointments' },
                        { label: 'Nuevo Cliente', sub: 'Registrar cliente', icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-50', path: '/clients' },
                        { label: 'Nuevo Vehículo', sub: 'Registrar unidad', icon: Car, color: 'text-orange-600', bg: 'bg-orange-50', path: '/vehicles' }
                    ].map((action, idx) => (
                        <motion.button
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(action.path)}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-200 transition-colors group"
                        >
                            <div className="flex items-center">
                                <div className={`p-3 ${action.bg} rounded-xl mr-4 group-hover:scale-110 transition-transform`}>
                                    <action.icon className={`w-6 h-6 ${action.color}`} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-800 text-lg">{action.label}</p>
                                    <p className="text-sm text-gray-500">{action.sub}</p>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Conditional Content based on Role */}
            {isReceptionist ? (
                /* Receptionist View: Focus on Operations */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Upcoming Appointments List (Wider) */}
                    <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-foton-blue" />
                                Próximas Citas
                            </h2>
                            <button onClick={() => navigate('/appointments')} className="text-sm text-foton-blue hover:underline font-medium">
                                Ver todas
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hora</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehículo</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats.proximasCitas.length > 0 ? (
                                        stats.proximasCitas.map((cita) => (
                                            <tr key={cita.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="bg-blue-50 text-blue-700 rounded-lg p-2 text-center min-w-[50px]">
                                                            <div className="text-xs font-bold uppercase">
                                                                {(() => {
                                                                    const dateStr = typeof cita.fecha === 'string' ? cita.fecha.split('T')[0] : new Date(cita.fecha).toISOString().split('T')[0];
                                                                    const [year, month, day] = dateStr.split('-').map(Number);
                                                                    const date = new Date(year, month - 1, day);
                                                                    return date.toLocaleDateString('es-ES', { month: 'short' });
                                                                })()}
                                                            </div>
                                                            <div className="text-lg font-bold leading-none">
                                                                {(() => {
                                                                    const dateStr = typeof cita.fecha === 'string' ? cita.fecha.split('T')[0] : new Date(cita.fecha).toISOString().split('T')[0];
                                                                    const [year, month, day] = dateStr.split('-').map(Number);
                                                                    return day;
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {cita.hora ? (cita.hora.length > 5 ? cita.hora.slice(0, 5) : cita.hora) : 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-700">{cita.cliente?.nombre || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{cita.vehiculo ? `${cita.vehiculo.marca} ${cita.vehiculo.modeloDetalle?.nombre || 'Desconocido'}` : 'N/A'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                        ${cita.estado === 'Confirmada' ? 'bg-green-100 text-green-800' :
                                                            cita.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                                                cita.estado === 'En proceso' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                        {cita.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                No hay citas próximas programadas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    {/* Pending Actions / Notifications */}
                    <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                            Pendientes
                        </h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                                <p className="text-sm text-yellow-800 font-medium">Citas por confirmar</p>
                                <p className="text-2xl font-bold text-yellow-900 mt-1">
                                    {stats.proximasCitas.filter(c => c.estado === 'Pendiente').length}
                                </p>
                                <button onClick={() => navigate('/appointments')} className="text-xs text-yellow-700 mt-2 hover:underline">
                                    Revisar ahora &rarr;
                                </button>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-sm text-blue-800 font-medium">Vehículos en Taller</p>
                                <p className="text-2xl font-bold text-blue-900 mt-1">{stats.vehiculosTaller}</p>
                                <button onClick={() => navigate('/appointments')} className="text-xs text-blue-700 mt-2 hover:underline">
                                    Ver en Citas &rarr;
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            ) : (
                /* Admin View: Includes Financial Charts */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-6">Servicios Más Solicitados</h2>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.serviciosPopulares}>
                                    <defs>
                                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0066B3" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#0066B3" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" axisLine={false} tick={false} height={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: '#f9fafb' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [value, 'Solicitudes']}
                                    />
                                    <Bar dataKey="value" fill="url(#colorBar)" radius={[6, 6, 0, 0]} barSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-6">Distribución de Servicios</h2>
                        <div className="h-72 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.serviciosPopulares}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        cornerRadius={6}
                                    >
                                        {stats.serviciosPopulares.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Upcoming Appointments for Admin (Full Width below charts) */}
                    <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-foton-blue" />
                                Próximas Citas
                            </h2>
                            <button onClick={() => navigate('/appointments')} className="text-sm text-foton-blue hover:underline font-medium">
                                Ver todas
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehículo</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Servicio</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats.proximasCitas.length > 0 ? (
                                        stats.proximasCitas.map((cita) => (
                                            <tr key={cita.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="bg-blue-50 text-blue-700 rounded-lg p-2 text-center min-w-[50px]">
                                                            <div className="text-xs font-bold uppercase">
                                                                {(() => {
                                                                    const dateStr = typeof cita.fecha === 'string' ? cita.fecha.split('T')[0] : new Date(cita.fecha).toISOString().split('T')[0];
                                                                    const [year, month, day] = dateStr.split('-').map(Number);
                                                                    const date = new Date(year, month - 1, day);
                                                                    return date.toLocaleDateString('es-ES', { month: 'short' });
                                                                })()}
                                                            </div>
                                                            <div className="text-lg font-bold leading-none">
                                                                {(() => {
                                                                    const dateStr = typeof cita.fecha === 'string' ? cita.fecha.split('T')[0] : new Date(cita.fecha).toISOString().split('T')[0];
                                                                    const [year, month, day] = dateStr.split('-').map(Number);
                                                                    return day;
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {cita.hora ? (cita.hora.length > 5 ? cita.hora.slice(0, 5) : cita.hora) : 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-700">{cita.cliente?.nombre || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{cita.vehiculo ? `${cita.vehiculo.marca} ${cita.vehiculo.modeloDetalle?.nombre || 'Desconocido'}` : 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{cita.servicio?.nombre || 'N/A'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                        ${cita.estado === 'Confirmada' ? 'bg-green-100 text-green-800' :
                                                            cita.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                                                cita.estado === 'En proceso' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                                                            ${cita.estado === 'Confirmada' ? 'bg-green-500' :
                                                                cita.estado === 'Pendiente' ? 'bg-yellow-500' :
                                                                    cita.estado === 'En proceso' ? 'bg-blue-500' :
                                                                        'bg-gray-500'}`}></span>
                                                        {cita.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                No hay citas próximas programadas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default Dashboard;
