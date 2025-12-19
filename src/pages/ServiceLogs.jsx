import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import ConfirmationModal from '../components/ConfirmationModal';
import { Search, FileText, CheckCircle, Clock, DollarSign, X, Wrench, User, Truck, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { generateServiceLogPDF } from '../utils/pdfGenerator';

/**
 * Componente de Bitácora de Servicios.
 * Permite visualizar y gestionar los registros de mantenimiento de los vehículos.
 * Incluye funcionalidades para checklists, refacciones y cálculo de costos.
 * @returns {JSX.Element} El componente de Bitácora de Servicios.
 */
const ServiceLogs = () => {
    const { user } = useAuth();
    const isReceptionist = user?.rol === 'Recepcionista';

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [vehicleModels, setVehicleModels] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Spare Parts State
    const [spareParts, setSpareParts] = useState([]);
    const [selectedParts, setSelectedParts] = useState([]);
    const [partSearch, setPartSearch] = useState('');
    const [filterByModel, setFilterByModel] = useState(true);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Cost State
    const [baseServiceCost, setBaseServiceCost] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        id_cita: '',
        checklist: {},
        costo_final: '',
        observaciones: ''
    });

    const [serviceCompleted, setServiceCompleted] = useState(false);
    const [isConfirmFinalizeOpen, setIsConfirmFinalizeOpen] = useState(false);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);

            const [apptsRes, logsRes, clientsRes, vehiclesRes, servicesRes, modelsRes] = await Promise.all([
                api.get('/appointments'),
                api.get(`/bitacora?_t=${new Date().getTime()}`),
                api.get('/clients'),
                api.get('/vehicles'),
                api.get('/services'),
                api.get('/vehicle-models')
            ]);

            const apptsData = Array.isArray(apptsRes.data) ? apptsRes.data : [];
            const logsData = Array.isArray(logsRes.data) ? logsRes.data : (logsRes.data.logs || []);
            const clients = clientsRes.data;
            const vehicles = vehiclesRes.data;
            const services = servicesRes.data;
            setVehicleModels(modelsRes.data);

            const relevantAppts = apptsData.filter(a => ['En proceso', 'En Proceso', 'En Progreso', 'Finalizada'].includes(a.estado));

            const mergedList = relevantAppts.map(appt => {
                const log = logsData.find(l => l.id_cita === appt.id);
                const service = services.find(s => s.id === appt.id_servicio);

                return {
                    id: log ? log.id : `appt-${appt.id}`,
                    isLogCreated: !!log,
                    id_cita: appt.id,
                    fecha_cita: appt.fecha,
                    estado_cita: appt.estado,
                    clientName: clients.find(c => c.id === appt.id_cliente)?.nombre || 'N/A',
                    vehicleName: vehicles.find(v => v.id === appt.id_vehiculo)?.modeloDetalle?.nombre || 'N/A',
                    vehicleVIN: vehicles.find(v => v.id === appt.id_vehiculo)?.vin || 'N/A',
                    serviceName: service?.nombre || 'N/A',
                    serviceCost: service?.costo || 0,
                    serviceChecklist: service?.checklist || [],
                    costo_final: log ? log.costo_final : 0,
                    checklist: log ? log.checklist : {},
                    observaciones: log ? log.observaciones : '',
                    fecha_finalizacion: log ? log.fecha_finalizacion : null,
                    technicianName: appt.tecnico ? appt.tecnico.nombre : 'No asignado',
                    originalLog: log
                };
            });

            setLogs(mergedList);
            const enrichedAppts = apptsData.map(a => ({
                ...a,
                clientName: clients.find(c => c.id === a.id_cliente)?.nombre || 'N/A',
                vehicleName: vehicles.find(v => v.id === a.id_vehiculo)?.modeloDetalle?.nombre || 'N/A',
                vehicleVIN: vehicles.find(v => v.id === a.id_vehiculo)?.vin || 'N/A',
                serviceName: services.find(s => s.id === a.id_servicio)?.nombre || 'N/A',
                serviceCost: services.find(s => s.id === a.id_servicio)?.costo || 0,
                serviceChecklist: services.find(s => s.id === a.id_servicio)?.checklist || []
            }));
            setAppointments(enrichedAppts);
        } catch (err) {
            console.error("Error fetching logs", err);
            const msg = err.response?.data?.error || err.message || "Error desconocido";
            setError(`Error al cargar los datos: ${msg}. Por favor intente recargar.`);
        } finally {
            setLoading(false);
        }
    };

    // Check for navigation state to open modal automatically
    const location = useLocation();
    useEffect(() => {
        if (location.state?.openModalFor && logs.length > 0) {
            const apptId = Number(location.state.openModalFor.id);
            let logItem = logs.find(l => Number(l.id_cita) === apptId);

            if (logItem) {
                handleOpenModal(logItem);
                navigate(location.pathname, { replace: true, state: {} });
            } else {
                const appt = location.state.openModalFor;
                if (appt) {
                    const dummyLogItem = {
                        id: `appt-${appt.id}`,
                        isLogCreated: false,
                        id_cita: appt.id,
                        fecha_cita: appt.fecha,
                        estado_cita: appt.estado,
                        clientName: appt.clientName || 'Cliente',
                        vehicleName: appt.vehicleName || 'Vehículo',
                        serviceName: appt.serviceName || 'Servicio',
                        costo_final: 0,
                        checklist: {},
                        observaciones: '',
                        originalLog: null,
                        serviceCost: appt.serviceCost || 0,
                        serviceChecklist: appt.serviceChecklist || [],
                        technicianName: appt.tecnico?.nombre || appt.technicianName || 'No asignado'
                    };
                    handleOpenModal(dummyLogItem);
                    navigate(location.pathname, { replace: true, state: {} });
                }
            }
        }
    }, [location.state, logs, navigate, location.pathname]);

    useEffect(() => {
        fetchLogs();
    }, []);

    // Fetch spare parts on load
    useEffect(() => {
        const fetchParts = async () => {
            try {
                const res = await api.get('/refacciones');
                setSpareParts(res.data);
            } catch (err) {
                console.error("Error fetching spare parts", err);
            }
        };
        fetchParts();
    }, []);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Helper to get current vehicle name from selected appointment
    const currentVehicleName = useMemo(() => {
        if (!formData.id_cita) return '';
        const appt = appointments.find(a => a.id === Number(formData.id_cita));
        return appt ? appt.vehicleName : '';
    }, [formData.id_cita, appointments]);

    // Filtered spare parts logic
    const filteredSpareParts = useMemo(() => {
        let parts = Array.isArray(spareParts) ? spareParts : [];

        // Filter by search term
        if (partSearch) {
            const searchLower = partSearch.toLowerCase();
            parts = parts.filter(p =>
                (p.nombre || '').toLowerCase().includes(searchLower) ||
                (p.codigo || '').toLowerCase().includes(searchLower)
            );
        }

        // Filter by model if enabled and vehicle name is available
        if (filterByModel && currentVehicleName) {
            parts = parts.filter(p => {
                // Check explicit compatibility (now using strings)
                if (p.compatibilidad && p.compatibilidad.length > 0) {
                    // Normalize strings for comparison
                    const vehicleNameNormalized = currentVehicleName.trim().toLowerCase();
                    const isCompatible = p.compatibilidad.some(c =>
                        c.modelo && c.modelo.trim().toLowerCase() === vehicleNameNormalized
                    );
                    if (isCompatible) return true;
                }

                return false;
            });
        }

        return parts;
    }, [spareParts, partSearch, filterByModel, currentVehicleName]);

    const handleAddPart = (part) => {
        if (selectedParts.find(p => p.id_refaccion === part.id_refaccion)) return;
        setSelectedParts([...selectedParts, { ...part, cantidad_usada: 1 }]);
        setPartSearch('');
        setShowSuggestions(false);
    };

    const handleRemovePart = (partId) => {
        setSelectedParts(selectedParts.filter(p => p.id_refaccion !== partId));
    };

    const handleQuantityChange = (partId, newQuantity) => {
        if (newQuantity < 1) return;
        setSelectedParts(selectedParts.map(p =>
            p.id_refaccion === partId ? { ...p, cantidad_usada: parseInt(newQuantity) } : p
        ));
    };

    // Calculate total cost automatically based on parts and service
    useEffect(() => {
        const partsCost = selectedParts.reduce((acc, part) => acc + (part.costo_unitario * part.cantidad_usada), 0);
        const total = (parseFloat(baseServiceCost) || 0) + partsCost;
        setFormData(prev => ({ ...prev, costo_final: total.toFixed(2) }));
    }, [selectedParts, baseServiceCost]);

    const handleOpenModal = async (item) => {
        try {
            // Ensure originalLog exists if isLogCreated is true
            const safeOriginalLog = (item.isLogCreated && item.originalLog) ? item.originalLog : null;
            const isLogReallyCreated = !!safeOriginalLog;

            setSelectedLog(safeOriginalLog);

            // Set base service cost
            setBaseServiceCost(item.serviceCost || 0);

            let initialChecklist = {};

            if (isLogReallyCreated && safeOriginalLog.checklist) {
                // CRITICAL: If log exists, use its checklist EXACTLY as saved.
                // Do NOT merge with current service definition to preserve history.
                initialChecklist = safeOriginalLog.checklist || {};
            } else {
                // Only for NEW logs, initialize from current service definition
                const serviceChecklist = item.serviceChecklist || [];
                initialChecklist = serviceChecklist.reduce((acc, step) => ({ ...acc, [step]: false }), {});
            }

            setFormData({
                id_cita: item.id_cita,
                checklist: initialChecklist,
                costo_final: isLogReallyCreated ? safeOriginalLog.costo_final : '',
                observaciones: isLogReallyCreated ? safeOriginalLog.observaciones : '',
                fecha_finalizacion: isLogReallyCreated ? safeOriginalLog.fecha_finalizacion : null
            });

            if (isLogReallyCreated) {
                try {
                    const res = await api.get(`/bitacora/${safeOriginalLog.id}/refacciones`);
                    if (Array.isArray(res.data)) {
                        setSelectedParts(res.data.map(p => {
                            const detalle = p.DetalleRefaccion || {};
                            const cantidad = detalle.cantidad || 0;
                            const costoParcial = detalle.costo_parcial || 0;
                            const costoUnitario = cantidad > 0 ? (costoParcial / cantidad) : 0;

                            return {
                                id_refaccion: p.id_refaccion,
                                nombre: p.nombre,
                                costo_unitario: costoUnitario,
                                cantidad_usada: cantidad
                            };
                        }));
                    } else {
                        setSelectedParts([]);
                    }
                } catch (err) {
                    console.error("No parts found or error fetching parts", err);
                    setSelectedParts([]);
                }
            } else {
                setSelectedParts([]);
            }

            // Determine if the log should be read-only (Finalized)
            const isFinalized = item.estado_cita === 'Finalizada';
            setServiceCompleted(isFinalized);

            setShowModal(true);
        } catch (error) {
            console.error("Error in handleOpenModal:", error);
            alert("Error al abrir el modal: " + error.message);
        }
    };

    const saveLogData = async (currentFormData, isFinalized) => {
        try {
            const payload = {
                ...currentFormData,
                refacciones: selectedParts.map(p => ({
                    id_refaccion: p.id_refaccion,
                    cantidad: p.cantidad_usada,
                    costo_parcial: p.costo_unitario * p.cantidad_usada
                }))
            };

            if (selectedLog) {
                await api.put(`/bitacora/${selectedLog.id}`, payload);
            } else {
                await api.post('/bitacora', payload);
            }

            if (isFinalized) {
                await api.put(`/appointments/${currentFormData.id_cita}`, { estado: 'Finalizada' });
            } else {
                await api.put(`/appointments/${currentFormData.id_cita}`, { estado: 'En proceso' });
            }

            setShowModal(false);
            fetchLogs();
        } catch (err) {
            console.error("Error saving log", err);
            const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message;
            alert(`Error al guardar la bitácora: ${errorMsg}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await saveLogData(formData, serviceCompleted);
    };

    const handleChecklistChange = (key) => {
        setFormData(prev => ({
            ...prev,
            checklist: {
                ...prev.checklist,
                [key]: !prev.checklist[key]
            }
        }));
    };

    const handleServiceCompletedChange = (e) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            setIsConfirmFinalizeOpen(true);
        } else {
            setServiceCompleted(false);
        }
    };

    const handleConfirmFinalize = async () => {
        setServiceCompleted(true);

        const completedChecklist = Object.keys(formData.checklist).reduce((acc, key) => ({
            ...acc,
            [key]: true
        }), {});

        const updatedFormData = {
            ...formData,
            checklist: completedChecklist,
            fecha_finalizacion: new Date() // Add completion date
        };
        setFormData(updatedFormData);

        await saveLogData(updatedFormData, true);
        setIsConfirmFinalizeOpen(false);
    };

    const handleGeneratePDF = async (item, preLoadedParts = null) => {
        if (!item.isLogCreated) {
            alert("Debe crear la bitácora antes de generar el reporte.");
            return;
        }

        try {
            setLoading(true);

            let partsData = [];

            // If parts are provided directly (e.g. from modal state), use them
            if (preLoadedParts) {
                partsData = preLoadedParts;
            }
            // Otherwise, fetch them if we have an original log ID
            else if (item.originalLog) {
                try {
                    const res = await api.get(`/bitacora/${item.originalLog.id}/refacciones`);
                    if (Array.isArray(res.data)) {
                        partsData = res.data.map(p => {
                            const detalle = p.DetalleRefaccion || {};
                            return {
                                nombre: p.nombre,
                                cantidad_usada: detalle.cantidad || 0,
                                costo_unitario: detalle.costo_parcial / (detalle.cantidad || 1)
                            };
                        });
                    }
                } catch (err) {
                    console.error("Error fetching parts for PDF", err);
                }
            }

            await generateServiceLogPDF(item, partsData);
        } catch (err) {
            console.error("Error generating PDF", err);
            alert("Error al generar el PDF");
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(l =>
            l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(a.fecha_cita) - new Date(b.fecha_cita));
    }, [logs, searchTerm]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);


    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } }
    };

    const itemVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foton-blue"></div>
        </div>
    );

    if (error) return (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
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
                    <h1 className="text-2xl font-bold text-gray-800">Bitácora de Servicios</h1>
                    <p className="text-gray-500 text-sm mt-1">Registro detallado de trabajos realizados</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Servicios Registrados</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{logs.length}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FileText className="w-5 h-5 text-foton-blue" />
                        </div>
                    </div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Completados</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                {logs.filter(l => l.estado_cita === 'Finalizada').length}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">En Proceso</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                {logs.filter(l => ['En proceso', 'En Proceso', 'En Progreso'].includes(l.estado_cita)).length}
                            </h3>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Ingresos Total</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">
                                ${logs.reduce((acc, curr) => acc + (Number(curr.costo_final) || 0), 0).toFixed(2)}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-sm font-semibold text-gray-700">Registro de Bitácoras</h2>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                            {filteredLogs.length} registros
                        </span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar en bitácoras..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foton-blue focus:border-transparent w-64"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente / Vehículo</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Servicio</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Observaciones</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Costo</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence mode="wait">
                                {currentItems.map(item => (
                                    <motion.tr
                                        key={item.id}
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="hidden"
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-center font-medium text-gray-900 text-sm mb-1">
                                                    <User className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                    {item.clientName}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Truck className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                    {item.vehicleName}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Wrench className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                {item.serviceName}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${item.estado_cita === 'Finalizada' ? 'bg-green-100 text-green-800' :
                                                    item.estado_cita === 'En proceso' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {item.estado_cita === 'Finalizada' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                                                {item.estado_cita}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center">
                                                <div className="bg-blue-50 text-blue-700 rounded-lg p-2 text-center min-w-[50px]">
                                                    <div className="text-xs font-bold uppercase">{item.fecha_cita ? new Date(item.fecha_cita).toLocaleDateString('es-ES', { month: 'short' }) : 'N/A'}</div>
                                                    <div className="text-lg font-bold leading-none">{item.fecha_cita ? new Date(item.fecha_cita).getDate() : '--'}</div>
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {item.fecha_cita ? new Date(item.fecha_cita).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500 max-w-xs truncate" title={item.observaciones}>
                                                {item.observaciones || <span className="text-gray-300 italic">Sin observaciones</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                ${item.costo_final}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end items-center space-x-3">
                                                <span className={`px-2 py-0.5 text-xs rounded-full border ${item.isLogCreated ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                    {item.isLogCreated ? 'Registrado' : 'Pendiente'}
                                                </span>
                                                {(!isReceptionist || item.isLogCreated) && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleOpenModal(item)}
                                                        className="p-1.5 text-gray-500 hover:text-foton-blue hover:bg-blue-50 rounded-lg transition-colors"
                                                        title={isReceptionist ? "Ver Detalles" : (item.isLogCreated ? "Editar Bitácora" : "Crear Bitácora")}
                                                    >
                                                        {isReceptionist ? <Eye className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                    </motion.button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron registros que coincidan con tu búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-4 py-4 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex space-x-2">
                            {(() => {
                                const pageNumbers = [];
                                if (totalPages <= 5) {
                                    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
                                } else {
                                    if (currentPage <= 3) {
                                        pageNumbers.push(1, 2, 3, 4, '...', totalPages);
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNumbers.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                                    } else {
                                        pageNumbers.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                                    }
                                }

                                return pageNumbers.map((number, index) => (
                                    number === '...' ? (
                                        <span key={`dots-${index}`} className="px-2 py-2 text-gray-400">...</span>
                                    ) : (
                                        <button
                                            key={number}
                                            onClick={() => paginate(number)}
                                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors
                                                ${currentPage === number
                                                    ? 'bg-foton-blue text-white shadow-md'
                                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                                                }`}
                                        >
                                            {number}
                                        </button>
                                    )
                                ));
                            })()}
                        </div>

                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {isReceptionist
                                        ? 'Detalles de Bitácora'
                                        : (selectedLog ? 'Editar Bitácora de Servicio' : 'Nueva Bitácora de Servicio')}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cita de Servicio</label>
                                <select
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foton-blue bg-white"
                                    value={formData.id_cita}
                                    onChange={(e) => setFormData({ ...formData, id_cita: e.target.value })}
                                    disabled={true}
                                >
                                    <option value="">Selecciona una cita</option>
                                    {appointments.map(a => {
                                        const dateObj = new Date(a.fecha);
                                        const dateStr = !isNaN(dateObj) ? format(dateObj, 'yyyy-MM-dd') : 'Fecha inválida';
                                        return (
                                            <option key={a.id} value={a.id}>
                                                {a.clientName} - {a.vehicleName} - {a.serviceName} ({dateStr})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="block text-sm font-medium text-gray-700">Lista de Verificación del Servicio</label>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                        {Object.values(formData.checklist || {}).filter(Boolean).length}/{Object.keys(formData.checklist || {}).length || 1} completadas ({Math.round((Object.values(formData.checklist || {}).filter(Boolean).length / (Object.keys(formData.checklist || {}).length || 1)) * 100)}%)
                                    </span>
                                </div>
                                <div className="space-y-3 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    {Object.keys(formData.checklist || {}).length === 0 ? (
                                        <p className="text-gray-500 text-sm italic">No hay pasos definidos para este servicio.</p>
                                    ) : (
                                        Object.entries(formData.checklist || {}).map(([key, value]) => (
                                            <label key={key} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={value}
                                                    onChange={() => handleChecklistChange(key)}
                                                    className="w-5 h-5 text-foton-blue rounded border-gray-300 focus:ring-foton-blue"
                                                    disabled={isReceptionist || serviceCompleted}
                                                />
                                                <span className="text-sm text-gray-700 capitalize">
                                                    {key}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Refacciones Utilizadas</label>

                                {/* Filter Checkbox */}
                                {!isReceptionist && currentVehicleName && (
                                    <div className="mb-2 flex items-center">
                                        <input
                                            type="checkbox"
                                            id="filterByModel"
                                            checked={filterByModel}
                                            onChange={(e) => setFilterByModel(e.target.checked)}
                                            className="w-4 h-4 text-foton-blue border-gray-300 rounded focus:ring-foton-blue"
                                        />
                                        <label htmlFor="filterByModel" className="ml-2 text-sm text-gray-600">
                                            Mostrar solo compatibles con <strong>{currentVehicleName}</strong>
                                        </label>
                                    </div>
                                )}

                                {!isReceptionist && (
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Buscar refacción..."
                                            value={partSearch}
                                            onChange={(e) => {
                                                setPartSearch(e.target.value);
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => {
                                                // Small delay to allow click on item to register before closing
                                                setTimeout(() => setShowSuggestions(false), 200);
                                            }}
                                            className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foton-blue"
                                        />
                                        {showSuggestions && (
                                            <div className={`absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto`}>
                                                {filteredSpareParts.map(part => (
                                                    <div
                                                        key={part.id_refaccion}
                                                        onClick={() => handleAddPart(part)}
                                                        className="p-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                                                    >
                                                        <div>
                                                            <span className="block text-sm font-medium text-gray-800">{part.nombre}</span>
                                                            <span className="text-xs text-gray-500">{part.codigo}</span>
                                                        </div>
                                                        <span className={`text-xs font-bold ${part.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {part.cantidad > 0 ? `${part.cantidad} disp.` : 'Agotado'}
                                                        </span>
                                                    </div>
                                                ))}
                                                {filteredSpareParts.length === 0 && (
                                                    <div className="p-3 text-center text-gray-500 text-sm">
                                                        No se encontraron refacciones compatibles.
                                                        <br />
                                                        <span className="text-xs">Intenta desactivar el filtro de modelo.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {selectedParts.map(part => (
                                        <div key={part.id_refaccion} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-800">{part.nombre}</p>
                                                <p className="text-xs text-gray-500">${part.costo_unitario} c/u</p>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={part.cantidad_usada}
                                                    onChange={(e) => handleQuantityChange(part.id_refaccion, e.target.value)}
                                                    className="w-16 p-1 text-sm border border-gray-300 rounded text-center"
                                                    disabled={isReceptionist || serviceCompleted}
                                                />
                                                {!isReceptionist && !serviceCompleted && (
                                                    <button type="button" onClick={() => handleRemovePart(part.id_refaccion)} className="text-red-500 hover:text-red-700">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {selectedParts.length > 0 && (
                                        <div className="text-right text-sm font-bold text-gray-700 mt-2">
                                            Total Refacciones: ${selectedParts.reduce((acc, p) => acc + (p.costo_unitario * p.cantidad_usada), 0).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones y Comentarios</label>
                                <textarea
                                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foton-blue min-h-[100px]"
                                    rows="3"
                                    value={formData.observaciones}
                                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                    placeholder="Describe el trabajo realizado, problemas encontrados, recomendaciones..."
                                    disabled={isReceptionist || serviceCompleted}
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Costo Final (MXN)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foton-blue"
                                    value={formData.costo_final}
                                    onChange={(e) => setFormData({ ...formData, costo_final: e.target.value })}
                                    placeholder="0.00"
                                    disabled={isReceptionist || serviceCompleted}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Incluye costo base del servicio (${baseServiceCost}) + refacciones.
                                </p>
                            </div>

                            <div className="flex items-center mb-4">
                                <input
                                    id="completed-checkbox"
                                    type="checkbox"
                                    className="w-4 h-4 text-foton-blue bg-gray-100 border-gray-300 rounded focus:ring-foton-blue"
                                    checked={serviceCompleted}
                                    onChange={handleServiceCompletedChange}
                                    disabled={isReceptionist || serviceCompleted}
                                />
                                <label htmlFor="completed-checkbox" className="ml-2 text-sm font-medium text-gray-900">Servicio completado</label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                                {/* PDF Button in Modal - Only if log is created/finalized */}
                                {(serviceCompleted || isReceptionist) && (
                                    <button
                                        type="button"
                                        onClick={() => handleGeneratePDF({
                                            ...selectedLog,
                                            id_cita: formData.id_cita,
                                            checklist: formData.checklist,
                                            costo_final: formData.costo_final,
                                            observaciones: formData.observaciones,
                                            fecha_cita: appointments.find(a => a.id === Number(formData.id_cita))?.fecha, // Explicitly pass appointment date
                                            clientName: appointments.find(a => a.id === Number(formData.id_cita))?.clientName || 'Cliente',
                                            vehicleName: appointments.find(a => a.id === Number(formData.id_cita))?.vehicleName || 'Vehículo',
                                            vehicleVIN: appointments.find(a => a.id === Number(formData.id_cita))?.vehicleVIN || 'N/A',
                                            serviceName: appointments.find(a => a.id === Number(formData.id_cita))?.serviceName || 'Servicio',
                                            technicianName: appointments.find(a => a.id === Number(formData.id_cita))?.tecnico?.nombre || 'No asignado',
                                            estado_cita: 'Finalizada',
                                            isLogCreated: true,
                                            originalLog: selectedLog,
                                            fecha_finalizacion: selectedLog?.fecha_finalizacion || formData.fecha_finalizacion,
                                            costo_servicio_base: baseServiceCost
                                        }, selectedParts)}
                                        className="px-6 py-2.5 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 font-medium transition-colors flex items-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-down mr-2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M12 18v-6" /><path d="m9 15 3 3 3-3" /></svg>
                                        Descargar PDF
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                >
                                    {isReceptionist ? 'Cerrar' : 'Cancelar'}
                                </button>
                                {!isReceptionist && !serviceCompleted && (
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 text-white bg-foton-blue rounded-lg hover:bg-blue-800 font-medium shadow-sm transition-colors"
                                    >
                                        Guardar Bitácora
                                    </button>
                                )}
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isConfirmFinalizeOpen}
                onClose={() => setIsConfirmFinalizeOpen(false)}
                onConfirm={handleConfirmFinalize}
                title="¿Finalizar Servicio?"
                message="Esta acción marcará el servicio como completado, guardará la bitácora y bloqueará futuras ediciones. ¿Estás seguro de continuar?"
                confirmText="Finalizar Trabajo"
                cancelText="Cancelar"
                isDestructive={false}
            />
        </motion.div>
    );
};

export default ServiceLogs;
