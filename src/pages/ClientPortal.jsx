import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { Calendar, Clock, Truck, Wrench, Plus, MapPin, AlertCircle, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import fotonTruck from '../assets/foton-truck.png';

/**
 * Componente del Portal del Cliente.
 * Permite a los clientes ver sus vehículos, citas activas y programar nuevas citas.
 * @returns {JSX.Element} El componente del Portal del Cliente.
 */
const ClientPortal = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTimeOpen, setIsTimeOpen] = useState(false);
    const [toast, setToast] = useState({ message: '', type: '' });
    const [expandedId, setExpandedId] = useState(null);

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [appointmentToCancel, setAppointmentToCancel] = useState(null);

    const [formData, setFormData] = useState({
        id_vehiculo: '',
        id_servicio: '',
        kilometraje: '',
        fecha: '',
        hora: '',
        observaciones: ''
    });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

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
            console.error("Error fetching client data", err);
            showToast("Error al cargar datos", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    useEffect(() => {
        const active = appointments.filter(a => ['Pendiente', 'Confirmada', 'En Proceso', 'En proceso'].includes(a.estado));
        if (active.length === 1) {
            setExpandedId(active[0].id);
        }
    }, [appointments]);

    const timeSlots = [];
    for (let i = 9; i <= 17; i++) {
        const hour = i.toString().padStart(2, '0');
        timeSlots.push(`${hour}:00`);
        if (i < 17) timeSlots.push(`${hour}:30`);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Check for existing active appointments for this vehicle
        const hasActiveAppointment = appointments.some(a =>
            a.id_vehiculo === parseInt(formData.id_vehiculo) &&
            ['Pendiente', 'Confirmada', 'En Proceso', 'En proceso'].includes(a.estado)
        );

        if (hasActiveAppointment) {
            showToast('Este vehículo ya tiene una cita activa.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/appointments', formData);
            showToast('Cita agendada con éxito');
            setIsModalOpen(false);
            fetchData();
            setFormData({
                id_vehiculo: '',
                id_servicio: '',
                kilometraje: '',
                fecha: '',
                hora: '',
                observaciones: ''
            });
        } catch (error) {
            console.error('Error creating appointment:', error);
            showToast(error.response?.data?.message || 'Error al agendar la cita', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelClick = (id) => {
        setAppointmentToCancel(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (appointmentToCancel) {
            try {
                await api.put(`/appointments/${appointmentToCancel}`, { estado: 'Cancelada' });
                showToast('Cita cancelada con éxito');
                fetchData();
            } catch (error) {
                console.error('Error cancelling appointment:', error);
                showToast(error.response?.data?.message || 'Error al cancelar la cita', 'error');
            }
        }
    };

    // Active appointments (Pending, Confirmed, In Process)
    const activeAppointments = appointments
        .filter(a => ['Pendiente', 'Confirmada', 'En Proceso', 'En proceso'].includes(a.estado))
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'Buenos días';
        if (hour >= 12 && hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    })();

    // Import all images from ../imagenes
    const vehicleImages = import.meta.glob('../imagenes/*.{png,jpg,jpeg,webp}', { eager: true });

    const getVehicleImage = (model) => {
        if (!model) return fotonTruck;
        const normalizedModel = model.toUpperCase().trim();
        const modelMap = {
            'MILER': 'AUMARK MILER', 'AUMARK MILER': 'AUMARK MILER',
            'EST-A': 'AUMAN EST-A', 'AUMAN EST-A': 'AUMAN EST-A', 'EST A': 'AUMAN EST-A',
            'S38': 'AUMAN S38', 'AUMAN S38': 'AUMAN S38',
            'GALAXY': 'AUMAN GALAXY', 'AUMAN GALAXY': 'AUMAN GALAXY',
            'TM3': 'TM3', 'TM 3': 'TM3',
            'WONDER': 'WONDER',
            'S3': 'AUMARK S3', 'AUMARK S3': 'AUMARK S3',
            'S5': 'AUMARK S5', 'AUMARK S5': 'AUMARK S5',
            'S6': 'AUMARK S6', 'AUMARK S6': 'AUMARK S6',
            'S8': 'AUMARK S8', 'AUMARK S8': 'AUMARK S8',
            'S12': 'AUMARK S12', 'AUMARK S12': 'AUMARK S12', 'S 12': 'AUMARK S12'
        };

        let imageName = null;
        if (modelMap[normalizedModel]) {
            imageName = modelMap[normalizedModel];
        } else {
            const knownKeys = Object.keys(modelMap);
            const match = knownKeys.find(key => normalizedModel.includes(key));
            if (match) imageName = modelMap[match];
        }

        if (imageName) {
            // Try exact match with .png first (legacy support)
            let key = `../imagenes/${imageName}.png`;
            if (vehicleImages[key]) return vehicleImages[key].default;

            // Try to find any file matching the name with supported extensions
            const matchingKey = Object.keys(vehicleImages).find(k => {
                const fileName = k.split('/').pop();
                return fileName.startsWith(`${imageName}.`);
            });
            if (matchingKey) return vehicleImages[matchingKey].default;
        }

        // If NOT found in map, try to find a file matching the model name directly
        const directMatchKey = Object.keys(vehicleImages).find(k => {
            const fileName = k.split('/').pop();
            const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')).toUpperCase();
            return nameWithoutExt === normalizedModel;
        });

        if (directMatchKey) return vehicleImages[directMatchKey].default;

        return fotonTruck;
    };

    // Progress Bar Helper
    const getProgressSteps = (status) => {
        const steps = [
            { label: 'Solicitud', active: true },
            { label: 'Confirmada', active: ['Confirmada', 'En Proceso', 'En proceso', 'Finalizada'].includes(status) },
            { label: 'En Taller', active: ['En Proceso', 'En proceso', 'Finalizada'].includes(status) },
            { label: 'Listo', active: ['Finalizada'].includes(status) }
        ];
        return steps;
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
            className="max-w-7xl mx-auto space-y-10 pb-12"
        >
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: '' })}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">{greeting}, {user?.nombre?.split(' ')[0]}</h1>
                    <p className="text-lg text-gray-500 mt-2">Bienvenido a tu portal de servicios Foton.</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-8 py-4 bg-foton-blue text-white rounded-xl shadow-lg hover:bg-blue-800 transition-all font-bold text-lg"
                >
                    <Plus className="w-6 h-6 mr-2" />
                    Agendar Cita
                </motion.button>
            </div>

            {/* Active Appointments Section */}
            <motion.div variants={itemVariants} className="space-y-6">
                {activeAppointments.length > 0 ? (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Seguimiento de Servicios ({activeAppointments.length})</h2>
                        <div className="flex flex-col gap-4">
                            {activeAppointments.map((appointment) => {
                                const isExpanded = expandedId === appointment.id;
                                const vehicle = vehicles.find(v => v.id === appointment.id_vehiculo);
                                const service = services.find(s => s.id === appointment.id_servicio);

                                return (
                                    <motion.div
                                        layout
                                        key={appointment.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="relative bg-white rounded-2xl shadow-lg border border-gray-200 cursor-pointer overflow-hidden"
                                        onClick={() => setExpandedId(isExpanded ? null : appointment.id)}
                                    >
                                        {/* Status Strip */}
                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${appointment.estado === 'Confirmada' ? 'bg-green-500' :
                                            ['En Proceso', 'En proceso'].includes(appointment.estado) ? 'bg-blue-500' :
                                                'bg-yellow-500'
                                            }`}></div>

                                        <div className="p-5 pl-8">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    {/* Date Badge */}
                                                    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2 min-w-[70px] border border-gray-100">
                                                        <span className="text-2xl font-bold text-gray-900 leading-none">
                                                            {format(new Date(appointment.fecha), 'dd')}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-500 uppercase mt-1">
                                                            {format(new Date(appointment.fecha), 'MMM', { locale: es })}
                                                        </span>
                                                    </div>

                                                    {/* Main Info */}
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="text-lg font-bold text-gray-900">
                                                                {vehicle?.modeloDetalle?.nombre || 'Vehículo'}
                                                            </h3>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
                                                                ${appointment.estado === 'Confirmada' ? 'bg-green-100 text-green-700' :
                                                                    ['En Proceso', 'En proceso'].includes(appointment.estado) ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-yellow-100 text-yellow-700'}`}>
                                                                {appointment.estado}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 flex items-center">
                                                            <Wrench className="w-3.5 h-3.5 mr-1.5" />
                                                            {service?.nombre || 'Servicio General'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Chevron */}
                                                <div className="text-gray-400">
                                                    {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                                                </div>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="border-t border-gray-100 bg-gray-50 p-5 pt-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                                                            <p className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-gray-500" /> Fecha: {format(new Date(appointment.fecha), 'dd MMMM yyyy', { locale: es })}</p>
                                                            <p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-gray-500" /> Hora: {appointment.hora ? (appointment.hora.length > 5 ? appointment.hora.slice(0, 5) : appointment.hora) : 'Por definir'}</p>
                                                            <p className="flex items-center"><Truck className="w-4 h-4 mr-2 text-gray-500" /> VIN: {vehicle?.vin}</p>
                                                            <p className="flex items-start"><MapPin className="w-4 h-4 mr-2 text-gray-500 mt-0.5" />
                                                                <span>
                                                                    {appointment.taller || 'Taller Foton'}
                                                                </span>
                                                            </p>
                                                            {appointment.observaciones && (
                                                                <p className="flex items-start col-span-full"><AlertCircle className="w-4 h-4 mr-2 mt-1 text-gray-500" /> Observaciones: {appointment.observaciones}</p>
                                                            )}
                                                        </div>

                                                        {appointment.estado === 'Pendiente' && (
                                                            <div className="mt-4 flex justify-end">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCancelClick(appointment.id);
                                                                    }}
                                                                    className="text-sm text-red-600 hover:text-red-800 font-medium underline transition-colors"
                                                                >
                                                                    Cancelar Cita
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Progress Bar */}
                                                        <div className="mt-6">
                                                            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Estado del Servicio</h4>
                                                            <div className="flex justify-between items-center relative">
                                                                {getProgressSteps(appointment.estado).map((step, index) => (
                                                                    <div key={index} className="flex flex-col items-center flex-1">
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold z-10
                                                                            ${step.active ? 'bg-foton-blue' : 'bg-gray-300'}`}>
                                                                            {index + 1}
                                                                        </div>
                                                                        <span className={`mt-2 text-xs text-center ${step.active ? 'text-foton-blue font-semibold' : 'text-gray-500'}`}>
                                                                            {step.label}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0 mx-auto w-[calc(100%-4rem)]">
                                                                    <div className={`h-full bg-foton-blue transition-all duration-500 ease-in-out`}
                                                                        style={{ width: `${(getProgressSteps(appointment.estado).filter(s => s.active).length - 1) / (getProgressSteps(appointment.estado).length - 1) * 100}%` }}>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-200">
                        <AlertCircle className="w-12 h-12 text-foton-blue mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes citas activas</h3>
                        <p className="text-gray-600 mb-6">Parece que no hay servicios pendientes o en curso para tus vehículos.</p>
                        <div className="flex flex-col gap-3 mt-8">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-foton-blue font-bold text-lg hover:text-blue-800 transition-colors flex items-center justify-center mx-auto"
                            >
                                Programar una cita ahora <ChevronRight className="w-5 h-5 ml-1" />
                            </button>
                            <button
                                onClick={() => navigate('/portal/history')}
                                className="text-gray-500 font-medium text-sm hover:text-gray-700 transition-colors underline"
                            >
                                Ver historial de citas
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* My Vehicles Section */}
            <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Mis Vehículos</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {vehicles.map(vehicle => (
                        <motion.div
                            key={vehicle.id}
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-all duration-300"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">{vehicle.modeloDetalle?.nombre || 'Modelo Desconocido'}</h3>
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">{vehicle.anio}</span>
                                </div>
                                <div className="flex justify-center mb-6">
                                    <img
                                        src={getVehicleImage(vehicle.modeloDetalle?.nombre)}
                                        alt={`${vehicle.modeloDetalle?.nombre} truck`}
                                        className="h-32 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
                                        <span className="text-gray-500 flex items-center"><Truck className="w-4 h-4 mr-2" /> VIN</span>
                                        <span className="font-medium text-gray-900">{vehicle.vin}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
                                        <span className="text-gray-500 flex items-center"><div className="w-4 h-4 rounded-full border border-gray-300 mr-2" style={{ backgroundColor: vehicle.color || '#fff' }}></div> Color</span>
                                        <span className="font-medium text-gray-900 capitalize">{vehicle.color || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 flex items-center"><Clock className="w-4 h-4 mr-2" /> Kilometraje</span>
                                        <span className="font-medium text-gray-900">{vehicle.kilometraje ? `${vehicle.kilometraje.toLocaleString()} km` : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Removed 'Ver detalles' button as requested */}
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agendar Nueva Cita">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="id_vehiculo" className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
                        <select
                            id="id_vehiculo"
                            name="id_vehiculo"
                            value={formData.id_vehiculo}
                            onChange={(e) => {
                                const selectedVehicle = vehicles.find(v => v.id === parseInt(e.target.value));
                                setFormData({
                                    ...formData,
                                    id_vehiculo: e.target.value,
                                    kilometraje: selectedVehicle ? selectedVehicle.kilometraje : ''
                                });
                            }}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent transition-all outline-none"
                            required
                        >
                            <option value="">Selecciona un vehículo</option>
                            {vehicles.map(vehicle => (
                                <option key={vehicle.id} value={vehicle.id}>{vehicle.modeloDetalle?.nombre} ({vehicle.vin})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="id_servicio" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Servicio</label>
                        <select
                            id="id_servicio"
                            name="id_servicio"
                            value={formData.id_servicio}
                            onChange={(e) => setFormData({ ...formData, id_servicio: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent transition-all outline-none"
                            required
                        >
                            <option value="">Selecciona un servicio</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>{service.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="kilometraje" className="block text-sm font-medium text-gray-700 mb-1">Kilometraje Actual (km)</label>
                        <input
                            type="number"
                            id="kilometraje"
                            name="kilometraje"
                            value={formData.kilometraje}
                            onChange={(e) => setFormData({ ...formData, kilometraje: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent transition-all outline-none"
                            placeholder="Ej. 15000"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                id="fecha"
                                name="fecha"
                                value={formData.fecha}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => {
                                    const dateStr = e.target.value;
                                    if (!dateStr) {
                                        setFormData({ ...formData, fecha: '' });
                                        return;
                                    }
                                    // Create date object from YYYY-MM-DD string (treated as UTC)
                                    const date = new Date(dateStr);
                                    // Check for Sunday (0)
                                    if (date.getUTCDay() === 0) {
                                        showToast('No hay servicio los domingos. Por favor selecciona otro día.', 'error');
                                        setFormData({ ...formData, fecha: '' });
                                    } else {
                                        setFormData({ ...formData, fecha: dateStr });
                                    }
                                }}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent transition-all outline-none"
                                required
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="hora" className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                            <button
                                type="button"
                                onClick={() => setIsTimeOpen(!isTimeOpen)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent transition-all outline-none text-left flex justify-between items-center"
                            >
                                <span className={formData.hora ? 'text-gray-900' : 'text-gray-500'}>
                                    {formData.hora ? (
                                        parseInt(formData.hora.split(':')[0]) > 12
                                            ? `${parseInt(formData.hora.split(':')[0]) - 12}:${formData.hora.split(':')[1]} PM`
                                            : parseInt(formData.hora.split(':')[0]) === 12
                                                ? `${formData.hora} PM`
                                                : `${formData.hora} AM`
                                    ) : 'Selecciona una hora'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTimeOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isTimeOpen && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                                    {timeSlots.map(time => (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, hora: time });
                                                setIsTimeOpen(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-foton-blue hover:text-white text-sm text-gray-700 transition-colors border-b border-gray-50 last:border-0"
                                        >
                                            {parseInt(time.split(':')[0]) > 12
                                                ? `${parseInt(time.split(':')[0]) - 12}:${time.split(':')[1]} PM`
                                                : parseInt(time.split(':')[0]) === 12
                                                    ? `${time} PM`
                                                    : `${time} AM`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">Observaciones (Opcional)</label>
                        <textarea
                            id="observaciones"
                            name="observaciones"
                            value={formData.observaciones}
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent transition-all outline-none"
                            rows="3"
                            placeholder="Describe cualquier problema específico..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-5 py-2.5 text-sm font-medium text-white bg-foton-blue rounded-lg shadow-md transition-all hover:shadow-lg ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-800'}`}
                        >
                            {isSubmitting ? 'Procesando...' : 'Confirmar Solicitud'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmCancel}
                title="Cancelar Cita"
                message="¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer."
                confirmText="Sí, cancelar cita"
                cancelText="No, mantener cita"
                isDestructive={true}
            />
        </motion.div>
    );
};

export default ClientPortal;
