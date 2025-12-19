import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ServiceHistory = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [apptRes, vehicleRes, serviceRes] = await Promise.all([
                api.get('/appointments'),
                api.get('/vehicles'),
                api.get('/services')
            ]);

            setAppointments(apptRes.data);
            setVehicles(vehicleRes.data);
            setServices(serviceRes.data);
        } catch (err) {
            console.error("Error fetching history data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const historyAppointments = appointments
        .filter(a => a.estado === 'Finalizada' || a.estado === 'Cancelada')
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } }
    };

    const itemVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foton-blue"></div>
        </div>
    );

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-7xl mx-auto space-y-6"
        >
            <div className="flex items-center mb-6">
                <History className="w-8 h-8 text-foton-blue mr-3" />
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Historial de Servicios</h1>
                    <p className="text-gray-500 mt-1">Consulta los servicios finalizados y cancelados de tus vehículos.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    {historyAppointments.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vehículo
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Servicio
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Observaciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <AnimatePresence>
                                    {historyAppointments.map((appointment) => {
                                        const vehicle = vehicles.find(v => v.id === appointment.id_vehiculo);
                                        const service = services.find(s => s.id === appointment.id_servicio);
                                        return (
                                            <motion.tr
                                                key={appointment.id}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="hidden"
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {format(new Date(appointment.fecha), 'dd MMM yyyy', { locale: es })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="font-medium text-gray-900">{vehicle?.modeloDetalle?.nombre || 'Desconocido'}</div>
                                                    <div className="text-xs text-gray-400">{vehicle?.vin}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {service?.nombre || 'Servicio General'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full
                                                        ${appointment.estado === 'Finalizada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {appointment.estado}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                    {appointment.observaciones || '-'}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No hay historial disponible</h3>
                            <p>Aún no tienes servicios finalizados o cancelados en tu historial.</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default ServiceHistory;
