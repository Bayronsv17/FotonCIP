import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Wrench, Clock, CheckCircle, Play, FileText, AlertTriangle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';

/**
 * Componente del Panel de Técnico.
 * Permite a los mecánicos ver sus trabajos asignados, iniciar/finalizar servicios y actualizar la bitácora.
 * @returns {JSX.Element} El componente del Panel de Técnico.
 */
const Technician = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logData, setLogData] = useState({ observaciones: '', checklist: {} });

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // 'start' or 'finish'
    const [confirmItem, setConfirmItem] = useState(null);

    const fetchData = async () => {
        try {
            const [apptRes, vehicleRes, serviceRes] = await Promise.all([
                api.get('/appointments'),
                api.get('/vehicles'),
                api.get('/services')
            ]);

            // Filter only active appointments for the technician
            const active = apptRes.data.filter(a =>
                a.estado !== 'Cancelada' &&
                a.estado !== 'Finalizada' &&
                a.id_tecnico === user.id
            );
            setAppointments(active);
            setVehicles(vehicleRes.data);
            setServices(serviceRes.data);
        } catch (err) {
            console.error("Error fetching technician data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helper to check if status is considered "In Progress"
    const isInProgress = (status) => status === 'En Progreso' || status === 'En Proceso' || status === 'En proceso';

    const handleStartJobClick = (appointment) => {
        setConfirmItem(appointment);
        setConfirmAction('start');
        setIsConfirmOpen(true);
    };

    const handleFinishJobClick = (appointment) => {
        setConfirmItem(appointment);
        setConfirmAction('finish');
        setIsConfirmOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!confirmItem) return;

        try {
            if (confirmAction === 'start') {
                // Standardize to 'En proceso' for new actions
                await api.put(`/appointments/${confirmItem.id}`, { estado: 'En proceso' });
            } else if (confirmAction === 'finish') {
                await api.put(`/appointments/${confirmItem.id}`, { estado: 'Finalizada' });
            }
            fetchData();
        } catch (err) {
            console.error(`Error ${confirmAction}ing job`, err);
            alert(`Error al ${confirmAction === 'start' ? 'iniciar' : 'finalizar'} el trabajo`);
        }
    };

    const handleOpenLog = async (appointment) => {
        setSelectedAppointment(appointment);
        try {
            // Try to find existing log for this appointment using the correct endpoint
            const res = await api.get('/bitacora');
            // The backend returns { logs: [...] } or just [...] depending on implementation, 
            // but based on serviceLogs.js controller getAllLogs returns an array directly.
            // However, bitacora.js route returns { logs: ... }.
            // We'll handle both cases to be safe.
            const logs = Array.isArray(res.data) ? res.data : (res.data.logs || []);

            const existingLog = logs.find(l => l.id_cita === appointment.id);

            if (existingLog) {
                setLogData({
                    id: existingLog.id,
                    observaciones: existingLog.observaciones || '',
                    checklist: existingLog.checklist || {}
                });
            } else {
                // Prepare new log data
                setLogData({ observaciones: '', checklist: {} });
            }
            setIsLogModalOpen(true);
        } catch (err) {
            console.error("Error fetching log", err);
        }
    };

    const handleSaveLog = async (e) => {
        e.preventDefault();
        try {
            if (logData.id) {
                await api.put(`/bitacora/${logData.id}`, {
                    observaciones: logData.observaciones,
                    checklist: logData.checklist
                });
            } else {
                await api.post('/bitacora', {
                    id_cita: selectedAppointment.id,
                    id_usuario: user.id,
                    observaciones: logData.observaciones,
                    checklist: logData.checklist
                });
            }
            setIsLogModalOpen(false);
            alert("Bitácora actualizada");
        } catch (err) {
            console.error("Error saving log", err);
            alert("Error al guardar bitácora");
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    // Calculate stats
    const pendingCount = appointments.filter(a => a.estado === 'Confirmada').length;
    // Count all variations as "In Progress"
    const progressCount = appointments.filter(a => isInProgress(a.estado)).length;

    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'Buenos días';
        if (hour >= 12 && hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    })();

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
            className="max-w-7xl mx-auto pb-12 space-y-8"
        >
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">{greeting}, {user?.nombre?.split(' ')[0]}</h1>
                    <p className="text-lg text-gray-500 mt-2">Bienvenido a tu panel de trabajo técnico.</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg text-yellow-700">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Pendientes</p>
                            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                            <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">En proceso</p>
                            <p className="text-2xl font-bold text-gray-900">{progressCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {appointments.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Todo listo por hoy!</h3>
                    <p className="text-gray-500 text-lg">No tienes trabajos pendientes asignados.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {appointments.map(appt => (
                        <motion.div
                            key={appt.id}
                            variants={itemVariants}
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-all duration-300"
                        >
                            <div className={`h-3 w-full ${isInProgress(appt.estado) ? 'bg-blue-500' :
                                appt.estado === 'Confirmada' ? 'bg-yellow-500' : 'bg-gray-300'
                                }`}></div>

                            <div className="p-7 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                        ${isInProgress(appt.estado) ? 'bg-blue-100 text-blue-700' :
                                            appt.estado === 'Confirmada' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {appt.estado}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">ID: #{appt.id}</span>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                                        {(() => {
                                            const v = vehicles.find(v => v.id === appt.id_vehiculo);
                                            return v ? `${v.modeloDetalle?.nombre || 'Desconocido'} ${v.placas ? `• ${v.placas}` : ''}` : `Vehículo #${appt.id_vehiculo}`;
                                        })()}
                                    </h3>
                                    <div className="flex items-center text-gray-600 font-medium">
                                        <Wrench className="w-4 h-4 mr-2 text-foton-blue" />
                                        {(() => {
                                            const s = services.find(s => s.id === appt.id_servicio);
                                            return s ? s.nombre : `Servicio #${appt.id_servicio}`;
                                        })()}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-8 flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                                        {format(new Date(appt.fecha), 'dd MMMM yyyy', { locale: es })}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Clock className="w-4 h-4 mr-3 text-gray-400" />
                                        {format(new Date(appt.fecha), 'h:mm a')}
                                    </div>
                                </div>

                                <div className="pt-2 space-y-3">
                                    {appt.estado === 'Confirmada' && (
                                        <button
                                            onClick={() => handleStartJobClick(appt)}
                                            className="w-full py-3 bg-foton-blue text-white rounded-xl font-bold hover:bg-blue-800 transition-all shadow-sm hover:shadow flex items-center justify-center"
                                        >
                                            <Play className="w-5 h-5 mr-2" /> Iniciar Trabajo
                                        </button>
                                    )}

                                    {isInProgress(appt.estado) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleOpenLog(appt)}
                                                className="py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center"
                                            >
                                                <FileText className="w-5 h-5 mr-2" /> Bitácora
                                            </button>
                                            <button
                                                onClick={() => handleFinishJobClick(appt)}
                                                className="py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-sm hover:shadow flex items-center justify-center"
                                            >
                                                <CheckCircle className="w-5 h-5 mr-2" /> Finalizar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Log Modal */}
            <Modal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                title={`Bitácora de Servicio - Cita #${selectedAppointment?.id}`}
            >
                <form onSubmit={handleSaveLog} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones Técnicas</label>
                        <textarea
                            value={logData.observaciones}
                            onChange={(e) => setLogData({ ...logData, observaciones: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent h-32"
                            placeholder="Detalles del diagnóstico, reparaciones realizadas, etc."
                            required
                        />
                    </div>

                    {/* Checklist Section */}
                    {(() => {
                        const service = services.find(s => s.id === selectedAppointment?.id_servicio);
                        const checklistSteps = service?.checklist || [];

                        if (checklistSteps.length > 0) {
                            return (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Checklist de Servicio</label>
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-200">
                                        {checklistSteps.map((step, index) => {
                                            const isChecked = logData.checklist && logData.checklist[step] === true;
                                            return (
                                                <div key={index} className="flex items-start">
                                                    <div className="flex items-center h-5">
                                                        <input
                                                            id={`step-${index}`}
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                setLogData(prev => ({
                                                                    ...prev,
                                                                    checklist: {
                                                                        ...prev.checklist,
                                                                        [step]: e.target.checked
                                                                    }
                                                                }));
                                                            }}
                                                            className="focus:ring-foton-blue h-4 w-4 text-foton-blue border-gray-300 rounded cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="ml-3 text-sm">
                                                        <label htmlFor={`step-${index}`} className={`font-medium cursor-pointer ${isChecked ? 'text-gray-900 line-through opacity-70' : 'text-gray-700'}`}>
                                                            {step}
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2 text-right">
                                        <span className="text-xs text-gray-500">
                                            {Object.values(logData.checklist || {}).filter(Boolean).length} de {checklistSteps.length} completados
                                        </span>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div className="bg-yellow-50 p-3 rounded-lg flex items-start">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                                <p className="text-sm text-yellow-800">
                                    Este servicio no tiene un checklist definido. Recuerda verificar niveles y seguridad general.
                                </p>
                            </div>
                        );
                    })()}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsLogModalOpen(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-foton-blue text-white rounded-lg hover:bg-blue-800"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmAction}
                title={confirmAction === 'start' ? "Iniciar Trabajo" : "Finalizar Servicio"}
                message={confirmAction === 'start'
                    ? "¿Estás seguro de que deseas iniciar el trabajo en esta unidad?"
                    : "¿Estás seguro de que deseas finalizar este servicio? Esta acción notificará al cliente."}
                confirmText={confirmAction === 'start' ? "Iniciar" : "Finalizar"}
                cancelText="Cancelar"
                isDestructive={false}
            />
        </motion.div>
    );
};

export default Technician;
