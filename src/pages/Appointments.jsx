import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { Plus, Edit2, Trash2, Search, Calendar, Clock, User, Truck, Wrench, Filter, CheckCircle, AlertCircle, XCircle, PlayCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

/**
 * Componente para la gestión de citas.
 * Permite visualizar, crear, editar y eliminar citas, así como filtrar por estado y buscar.
 * @returns {JSX.Element} El componente de gestión de citas.
 */
const Appointments = () => {
    const { user } = useAuth();
    const isReceptionist = user?.rol === 'Recepcionista';

    const [appointments, setAppointments] = useState([]);
    const [clients, setClients] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [services, setServices] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAppointment, setCurrentAppointment] = useState(null);

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [appointmentToDelete, setAppointmentToDelete] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });

    const [formData, setFormData] = useState({
        id_cliente: '',
        id_vehiculo: '',
        id_servicio: '',
        fecha: '',
        hora: '',
        id_tecnico: '',
        estado: 'Pendiente',
        observaciones: ''
    });

    const [viewHistory, setViewHistory] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    // Search states
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [techSearch, setTechSearch] = useState('');
    const [showTechDropdown, setShowTechDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [showTimeDropdown, setShowTimeDropdown] = useState(false);

    /**
     * Obtiene los datos iniciales necesarios para el componente: citas, clientes, vehículos, servicios y técnicos.
     */
    const [businessHours, setBusinessHours] = useState({
        start: '08:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5, 6] // Mon-Sat
    });

    /**
     * Obtiene los datos iniciales necesarios para el componente: citas, clientes, vehículos, servicios y técnicos.
     */
    const fetchData = async () => {
        try {
            const [apptRes, clientRes, vehicleRes, serviceRes, userRes, settingsRes] = await Promise.all([
                api.get('/appointments'),
                api.get('/clients'),
                api.get('/vehicles'),
                api.get('/services'),
                api.get('/users'),
                api.get('/settings/business_hours').catch(() => ({ data: null })) // Handle 404 if not set
            ]);
            setAppointments(apptRes.data);
            setClients(clientRes.data);
            setVehicles(vehicleRes.data);
            setServices(serviceRes.data);
            const techs = userRes.data.filter(u => u.rol === 'Mecanico');
            setTechnicians(techs);

            if (settingsRes.data) {
                setBusinessHours(settingsRes.data);
            }
        } catch (err) {
            console.error("Error fetching data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Business Hours Configuration ---
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configFormData, setConfigFormData] = useState({ start: '08:00', end: '17:00', days: [] });

    const handleOpenConfigModal = () => {
        setConfigFormData(businessHours);
        setIsConfigModalOpen(true);
    };

    const handleSaveBusinessHours = async (e) => {
        e.preventDefault();
        try {
            await api.put('/settings/business_hours', { value: configFormData });
            setBusinessHours(configFormData);
            setIsConfigModalOpen(false);
            setToast({ message: 'Horario actualizado correctamente', type: 'success' });
        } catch (err) {
            console.error("Error saving business hours", err);
            setToast({ message: 'Error al guardar horario', type: 'error' });
        }
    };

    const generateTimeSlots = () => {
        const slots = [];
        const [startHour, startMinute] = businessHours.start.split(':').map(Number);
        const [endHour, endMinute] = businessHours.end.split(':').map(Number);

        let current = new Date();
        current.setHours(startHour, startMinute, 0, 0);

        const end = new Date();
        end.setHours(endHour, endMinute, 0, 0);

        while (current < end) {
            const hour = current.getHours();
            const minute = current.getMinutes();
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push(time);
            current.setMinutes(current.getMinutes() + 30);
        }
        return slots;
    };

    /**
     * Abre el modal para crear o editar una cita.
     * @param {Object|null} appt - La cita a editar, o null para crear una nueva.
     */
    const handleOpenModal = (appt = null) => {
        if (appt) {
            const dateObj = new Date(appt.fecha);
            setCurrentAppointment(appt);
            setFormData({
                id_cliente: appt.id_cliente,
                id_vehiculo: appt.id_vehiculo,
                id_servicio: appt.id_servicio,
                fecha: typeof appt.fecha === 'string' ? appt.fecha.split('T')[0] : format(new Date(appt.fecha), 'yyyy-MM-dd'),
                hora: appt.hora ? (appt.hora.length > 5 ? appt.hora.slice(0, 5) : appt.hora) : format(dateObj, 'HH:mm'),
                id_tecnico: appt.id_tecnico || '',
                estado: appt.estado,
                observaciones: appt.observaciones || ''
            });
            setClientSearch(getClientName(appt.id_cliente));
            setTechSearch(getTechName(appt.id_tecnico));
            setVehicleSearch(getVehicleName(appt.id_vehiculo));
            setServiceSearch(getServiceName(appt.id_servicio));
        } else {
            setCurrentAppointment(null);
            setFormData({
                id_cliente: '',
                id_vehiculo: '',
                id_servicio: '',
                fecha: format(new Date(), 'yyyy-MM-dd'),
                hora: '09:00',
                id_tecnico: '',
                estado: 'Pendiente',
                observaciones: ''
            });
            setClientSearch('');
            setTechSearch('');
            setVehicleSearch('');
            setServiceSearch('');
        }
        setShowClientDropdown(false);
        setShowTechDropdown(false);
        setShowVehicleDropdown(false);
        setShowServiceDropdown(false);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentAppointment(null);
    };

    /**
     * Maneja el envío del formulario para crear o actualizar una cita.
     * @param {Event} e - El evento del formulario.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones
        if (!formData.id_cliente) {
            setToast({ message: 'Por favor, seleccione un cliente.', type: 'warning' });
            return;
        }
        if (!formData.id_vehiculo) {
            setToast({ message: 'Por favor, seleccione un vehículo.', type: 'warning' });
            return;
        }
        if (!formData.id_servicio) {
            setToast({ message: 'Por favor, seleccione un servicio.', type: 'warning' });
            return;
        }
        if (!formData.fecha) {
            setToast({ message: 'Por favor, seleccione una fecha.', type: 'warning' });
            return;
        }
        if (!formData.hora) {
            setToast({ message: 'Por favor, seleccione una hora.', type: 'warning' });
            return;
        }

        try {
            const payload = {
                ...formData,
                fecha: formData.fecha
            };

            if (currentAppointment) {
                await api.put(`/appointments/${currentAppointment.id}`, payload);
            } else {
                await api.post('/appointments', payload);
            }
            fetchData();
            handleCloseModal();
            setToast({ message: currentAppointment ? 'Cita actualizada correctamente' : 'Cita agendada correctamente', type: 'success' });
        } catch (err) {
            console.error("Error saving appointment", err);
            const errorMessage = err.response?.data?.message || 'Error al guardar cita. Verifique los datos.';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    const handleDeleteClick = (id) => {
        setAppointmentToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (appointmentToDelete) {
            try {
                await api.delete(`/appointments/${appointmentToDelete}`);
                fetchData();
            } catch (err) {
                console.error("Error deleting appointment", err);
            }
        }
    };

    const getClientName = (id) => clients.find(c => c.id === id)?.nombre || 'N/A';
    const getVehicleName = (id) => {
        const v = vehicles.find(v => v.id === id);
        return v ? `${v.marca} ${v.modeloDetalle?.nombre || 'Desconocido'}` : 'N/A';
    };
    const getServiceName = (id) => services.find(s => s.id === id)?.nombre || 'N/A';
    const getTechName = (id) => technicians.find(t => t.id === id)?.nombre || 'Sin asignar';

    const filteredAppointments = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return appointments.filter(a => {
            // Fix timezone issue by parsing YYYY-MM-DD manually to create local date
            const dateStr = typeof a.fecha === 'string' ? a.fecha.split('T')[0] : format(new Date(a.fecha), 'yyyy-MM-dd');
            const [year, month, day] = dateStr.split('-').map(Number);
            const apptDateOnly = new Date(year, month - 1, day);

            // Hide past cancellations as requested
            if (a.estado === 'Cancelada' && apptDateOnly < today) {
                return false;
            }

            if (viewHistory) {
                if (apptDateOnly >= today) return false;
            } else {
                if (apptDateOnly < today) return false;
            }

            if (filterStatus !== 'all' && a.estado !== filterStatus) return false;

            const searchLower = searchTerm.toLowerCase();
            if (searchLower && !getClientName(a.id_cliente).toLowerCase().includes(searchLower) &&
                !getVehicleName(a.id_vehiculo).toLowerCase().includes(searchLower)) {
                return false;
            }

            return true;
        }).sort((a, b) => {
            return viewHistory
                ? new Date(b.fecha) - new Date(a.fecha)
                : new Date(a.fecha) - new Date(b.fecha);
        });
    }, [appointments, filterStatus, searchTerm, clients, vehicles, viewHistory]);

    const availableVehicles = useMemo(() => {
        return formData.id_cliente
            ? vehicles.filter(v => v.id_cliente == formData.id_cliente)
            : [];
    }, [formData.id_cliente, vehicles]);

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parseDate = (dateStr) => {
            if (!dateStr) return new Date(0); // Invalid date
            const str = typeof dateStr === 'string' ? dateStr.split('T')[0] : format(new Date(dateStr), 'yyyy-MM-dd');
            const [year, month, day] = str.split('-').map(Number);
            return new Date(year, month - 1, day);
        };

        return {
            today: appointments.filter(a => {
                const apptDate = parseDate(a.fecha);
                return apptDate.getTime() === today.getTime() && a.estado !== 'Cancelada';
            }).length,
            upcoming: appointments.filter(a => {
                const apptDate = parseDate(a.fecha);
                return apptDate > today && a.estado !== 'Cancelada' && a.estado !== 'Finalizada' && a.estado !== 'En proceso';
            }).length,
            inProgress: appointments.filter(a => a.estado === 'En proceso').length,
            completed: appointments.filter(a => a.estado === 'Finalizada').length
        };
    }, [appointments]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Finalizada': return <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Finalizada</span>;
            case 'Pendiente': return <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Pendiente</span>;
            case 'En proceso': return <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><PlayCircle className="w-3 h-3 mr-1" />En proceso</span>;
            case 'Confirmada': return <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"><CheckCircle className="w-3 h-3 mr-1" />Confirmada</span>;
            case 'Cancelada': return <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Cancelada</span>;
            default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } }
    };

    const itemVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } }
    };

    const tableVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foton-blue"></div>
        </div>
    );

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6"
        >
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Citas</h1>
                    <p className="text-gray-500 text-sm mt-1">Programa y gestiona las citas de servicio</p>
                </div>
                <div className="flex space-x-3">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setViewHistory(!viewHistory)}
                        className={`flex items-center px-4 py-2 rounded-lg transition-colors shadow-sm border ${viewHistory
                            ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            : 'bg-white text-foton-blue border-foton-blue hover:bg-blue-50'
                            }`}
                    >
                        <Clock className="w-5 h-5 mr-2" />
                        {viewHistory ? 'Ver Próximas' : 'Ver Historial'}
                    </motion.button>
                    {user?.rol === 'Administrador' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleOpenConfigModal}
                            className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <Clock className="w-5 h-5 mr-2" />
                            Configurar Horario
                        </motion.button>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleOpenModal()}
                        className="flex items-center px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Agendar Cita
                    </motion.button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Citas Hoy</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.today}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Próximas</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.upcoming}</h3>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Clock className="w-5 h-5 text-indigo-600" />
                        </div>
                    </div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">En Proceso</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.inProgress}</h3>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Wrench className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Completadas</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.completed}</h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Truck className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gray-50/50">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-sm font-semibold text-gray-700">
                            {viewHistory ? 'Historial de Citas' : 'Citas Próximas'}
                        </h2>
                        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                            <Filter className="w-3 h-3 text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="text-sm border-none focus:ring-0 text-gray-600 bg-transparent p-0 pr-6 cursor-pointer"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="Confirmada">Confirmada</option>
                                <option value="En proceso">En proceso</option>
                                <option value="Finalizada">Finalizada</option>
                                <option value="Cancelada">Cancelada</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar citas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                            />
                        </div>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                            {filteredAppointments.length} citas
                        </span>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={viewHistory ? 'history' : 'upcoming'}
                        variants={tableVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="overflow-x-auto"
                    >
                        <table className="w-full text-left">
                            <thead className="bg-white border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente / Vehículo</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Servicio</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Técnico</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha y Hora</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredAppointments.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            No se encontraron citas que coincidan con tu búsqueda.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAppointments.map((appt) => (
                                        <motion.tr
                                            key={appt.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center font-medium text-gray-900 text-sm mb-1">
                                                        <User className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                        {getClientName(appt.id_cliente)}
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <Truck className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                        {getVehicleName(appt.id_vehiculo)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Wrench className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                    {getServiceName(appt.id_servicio)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600">
                                                    {appt.estado === 'Cancelada' ? (
                                                        <span className="text-gray-400 italic">N/A</span>
                                                    ) : (
                                                        <div className="flex items-center">
                                                            <User className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                            {getTechName(appt.id_tecnico)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="bg-blue-50 text-blue-700 rounded-lg p-2 text-center min-w-[50px]">
                                                        <div className="text-xs font-bold uppercase">{new Date(appt.fecha).toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' })}</div>
                                                        <div className="text-lg font-bold leading-none">{new Date(appt.fecha).getUTCDate()}</div>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {(() => {
                                                                if (appt.hora) {
                                                                    const [h, m] = (appt.hora.length > 5 ? appt.hora.slice(0, 5) : appt.hora).split(':');
                                                                    const hour = parseInt(h);
                                                                    const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
                                                                    const displayHour = hour % 12 || 12;
                                                                    return `${displayHour.toString().padStart(2, '0')}:${m} ${ampm}`;
                                                                }
                                                                return new Date(appt.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(appt.estado)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end space-x-2">
                                                    {isReceptionist ? (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleOpenModal(appt)}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Ver Detalles"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </motion.button>
                                                    ) : (
                                                        <>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleOpenModal(appt)}
                                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleDeleteClick(appt.id)}
                                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </motion.button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </motion.div>
                </AnimatePresence>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isReceptionist && currentAppointment ? 'Detalles de Cita' : (currentAppointment ? 'Editar Cita' : 'Agendar Cita')}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    className={`w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue ${isReceptionist && currentAppointment ? 'bg-gray-100' : ''}`}
                                    onChange={(e) => {
                                        setClientSearch(e.target.value);
                                        setShowClientDropdown(true);
                                    }}
                                    onFocus={() => !(isReceptionist && currentAppointment) && setShowClientDropdown(true)}
                                    value={clientSearch}
                                    disabled={isReceptionist && !!currentAppointment}
                                />
                                {showClientDropdown && !(isReceptionist && currentAppointment) && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {clients.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase()))
                                            .slice(0, 10)
                                            .map(client => (
                                                <button
                                                    key={client.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, id_cliente: client.id, id_vehiculo: '' });
                                                        setClientSearch(client.nombre);
                                                        setVehicleSearch('');
                                                        setShowClientDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                                                >
                                                    {client.nombre}
                                                </button>
                                            ))}
                                        {clients.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                            <div className="px-4 py-2 text-sm text-gray-500">No se encontraron clientes</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder={formData.id_cliente ? "Buscar vehículo..." : "Seleccione un cliente primero"}
                                    className={`w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 ${(!formData.id_cliente || (isReceptionist && currentAppointment)) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    onChange={(e) => {
                                        setVehicleSearch(e.target.value);
                                        setShowVehicleDropdown(true);
                                    }}
                                    onFocus={() => formData.id_cliente && !(isReceptionist && currentAppointment) && setShowVehicleDropdown(true)}
                                    value={vehicleSearch}
                                    disabled={!formData.id_cliente || (isReceptionist && !!currentAppointment)}
                                />
                                {showVehicleDropdown && formData.id_cliente && !(isReceptionist && currentAppointment) && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {availableVehicles.filter(v =>
                                            `${v.marca} ${v.modeloDetalle?.nombre} ${v.vin}`.toLowerCase().includes(vehicleSearch.toLowerCase())
                                        ).map(v => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, id_vehiculo: v.id });
                                                    setVehicleSearch(`${v.marca} ${v.modeloDetalle?.nombre}`);
                                                    setShowVehicleDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                                            >
                                                <div className="font-medium text-gray-900">{v.marca} {v.modeloDetalle?.nombre}</div>
                                                <div className="text-xs text-gray-500">VIN: {v.vin}</div>
                                            </button>
                                        ))}
                                        {availableVehicles.filter(v =>
                                            `${v.marca} ${v.modeloDetalle?.nombre} ${v.vin}`.toLowerCase().includes(vehicleSearch.toLowerCase())
                                        ).length === 0 && (
                                                <div className="px-4 py-2 text-sm text-gray-500">No se encontraron vehículos</div>
                                            )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                value={formData.fecha}
                                onChange={(e) => {
                                    const dateStr = e.target.value;
                                    if (!dateStr) {
                                        setFormData({ ...formData, fecha: '' });
                                        return;
                                    }
                                    const selectedDate = new Date(dateStr + 'T00:00:00');
                                    const dayOfWeek = selectedDate.getDay();

                                    if (businessHours.days && !businessHours.days.includes(dayOfWeek)) {
                                        setToast({ message: 'Este día no es laborable según el horario configurado.', type: 'warning' });
                                        setFormData({ ...formData, fecha: '' });
                                    } else {
                                        setFormData({ ...formData, fecha: dateStr });
                                    }
                                }}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue ${isReceptionist && currentAppointment ? 'bg-gray-100' : ''}`}
                                required
                                disabled={isReceptionist && !!currentAppointment}
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                            <button
                                type="button"
                                onClick={() => !(isReceptionist && currentAppointment) && setShowTimeDropdown(!showTimeDropdown)}
                                className={`w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue flex justify-between items-center ${isReceptionist && currentAppointment ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                                disabled={isReceptionist && !!currentAppointment}
                            >
                                <span className={!formData.hora ? 'text-gray-500' : 'text-gray-900'}>
                                    {formData.hora ? (() => {
                                        const [h, m] = formData.hora.split(':');
                                        const hour = parseInt(h);
                                        const ampm = hour >= 12 ? 'PM' : 'AM';
                                        const displayHour = hour % 12 || 12;
                                        return `${displayHour.toString().padStart(2, '0')}:${m} ${ampm}`;
                                    })() : 'Seleccionar hora'}
                                </span>
                                <Clock className="w-4 h-4 text-gray-400" />
                            </button>

                            {showTimeDropdown && !(isReceptionist && currentAppointment) && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                                    {generateTimeSlots().map((time) => {
                                        const [h, m] = time.split(':');
                                        const hour = parseInt(h);
                                        const minute = parseInt(m);

                                        const ampm = hour >= 12 ? 'PM' : 'AM';
                                        const displayHour = hour % 12 || 12;
                                        const displayMinute = minute.toString().padStart(2, '0');
                                        const displayTime = `${displayHour}:${displayMinute} ${ampm}`;

                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, hora: time });
                                                    setShowTimeDropdown(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${formData.hora === time ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                                    }`}
                                            >
                                                {displayTime}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Buscar servicio..."
                                    className={`w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 ${isReceptionist && currentAppointment ? 'bg-gray-100' : ''}`}
                                    onChange={(e) => {
                                        setServiceSearch(e.target.value);
                                        setShowServiceDropdown(true);
                                    }}
                                    onFocus={() => !(isReceptionist && currentAppointment) && setShowServiceDropdown(true)}
                                    value={serviceSearch}
                                    disabled={isReceptionist && !!currentAppointment}
                                />
                                {showServiceDropdown && !(isReceptionist && currentAppointment) && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {services.filter(s => s.nombre.toLowerCase().includes(serviceSearch.toLowerCase()))
                                            .map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, id_servicio: s.id });
                                                        setServiceSearch(s.nombre);
                                                        setShowServiceDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="font-medium text-gray-900">{s.nombre}</div>
                                                    <div className="text-xs text-gray-500">${s.costo} - {s.duracion} min</div>
                                                </button>
                                            ))}
                                        {services.filter(s => s.nombre.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                                            <div className="px-4 py-2 text-sm text-gray-500">No se encontraron servicios</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Buscar técnico..."
                                    className={`w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 ${isReceptionist && currentAppointment ? 'bg-gray-100' : ''}`}
                                    onChange={(e) => {
                                        setTechSearch(e.target.value);
                                        setShowTechDropdown(true);
                                    }}
                                    onFocus={() => !(isReceptionist && currentAppointment) && setShowTechDropdown(true)}
                                    value={techSearch}
                                    disabled={isReceptionist && !!currentAppointment}
                                />
                                {showTechDropdown && !(isReceptionist && currentAppointment) && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {technicians.filter(t => t.nombre.toLowerCase().includes(techSearch.toLowerCase()))
                                            .map(tech => (
                                                <button
                                                    key={tech.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, id_tecnico: tech.id });
                                                        setTechSearch(tech.nombre);
                                                        setShowTechDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                                                >
                                                    {tech.nombre}
                                                </button>
                                            ))}
                                        {technicians.filter(t => t.nombre.toLowerCase().includes(techSearch.toLowerCase())).length === 0 && (
                                            <div className="px-4 py-2 text-sm text-gray-500">No se encontraron técnicos</div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, id_tecnico: '' });
                                                setTechSearch('Sin asignar');
                                                setShowTechDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-500 font-medium border-t border-gray-100"
                                        >
                                            Sin asignar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <select
                                value={formData.estado}
                                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue ${isReceptionist && currentAppointment ? 'bg-gray-100' : ''}`}
                                disabled={isReceptionist && !!currentAppointment}
                            >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Confirmada">Confirmada</option>
                                <option value="En proceso">En proceso</option>
                                <option value="Finalizada">Finalizada</option>
                                <option value="Cancelada">Cancelada</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                        <textarea
                            value={formData.observaciones}
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue ${isReceptionist && currentAppointment ? 'bg-gray-100' : ''}`}
                            rows="3"
                            disabled={isReceptionist && !!currentAppointment}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            {isReceptionist && currentAppointment ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {(!isReceptionist || !currentAppointment) && (
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Guardar
                            </button>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Business Hours Configuration Modal */}
            <Modal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                title="Configurar Horario de Atención"
            >
                <form onSubmit={handleSaveBusinessHours} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                            <input
                                type="time"
                                value={configFormData.start}
                                onChange={(e) => setConfigFormData({ ...configFormData, start: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                            <input
                                type="time"
                                value={configFormData.end}
                                onChange={(e) => setConfigFormData({ ...configFormData, end: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Días Laborales</label>
                        <div className="flex flex-wrap gap-2">
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        const newDays = configFormData.days.includes(index)
                                            ? configFormData.days.filter(d => d !== index)
                                            : [...configFormData.days, index];
                                        setConfigFormData({ ...configFormData, days: newDays.sort() });
                                    }}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${configFormData.days.includes(index)
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsConfigModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-foton-blue rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                        >
                            Guardar Configuración
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Cita"
                message="¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
            />

            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: '' })}
            />
        </motion.div>
    );
};

export default Appointments;
