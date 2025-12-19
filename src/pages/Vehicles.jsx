import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Search, Car, Calendar, User, Hash, Palette, Gauge, ArrowLeft, Truck, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import fotonTruck from '../assets/foton-truck.png';

// Import all images from ../imagenes
const vehicleImages = import.meta.glob('../imagenes/*.{png,jpg,jpeg,webp}', { eager: true });

// Get list of available images for the dropdown
const availableImages = Object.keys(vehicleImages).map(path => {
    return {
        path: path,
        name: path.split('/').pop()
    };
});

// Pre-calculate image map for faster lookup
const imageMap = {};
Object.keys(vehicleImages).forEach(path => {
    const fileName = path.split('/').pop();
    // Map full filename (e.g. "image.png" -> path)
    imageMap[fileName] = vehicleImages[path].default;

    // Map name without extension (e.g. "IMAGE" -> path)
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')).toUpperCase();
    if (!imageMap[nameWithoutExt]) {
        imageMap[nameWithoutExt] = vehicleImages[path].default;
    }
});

const getVehicleImage = (modelOrName) => {
    if (!modelOrName) return fotonTruck;

    // If input is the model object (from database)
    if (typeof modelOrName === 'object') {
        if (modelOrName.imagen_url) {
            // Direct lookup by filename
            if (imageMap[modelOrName.imagen_url]) {
                return imageMap[modelOrName.imagen_url];
            }
        }
        return getVehicleImage(modelOrName.nombre);
    }

    const normalizedModel = modelOrName.toUpperCase().trim();
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

    // 1. Check mapped name
    let lookupName = normalizedModel;
    if (modelMap[normalizedModel]) {
        lookupName = modelMap[normalizedModel];
    } else {
        // Fuzzy match from map keys
        const match = Object.keys(modelMap).find(key => normalizedModel.includes(key));
        if (match) lookupName = modelMap[match];
    }

    // 2. Try looking up the mapped name (or original) in our image map
    // We check both the exact mapped name (e.g. "AUMARK S3") which matches "AUMARK S3" key in imageMap
    if (imageMap[lookupName]) return imageMap[lookupName];
    if (imageMap[`${lookupName}.png`]) return imageMap[`${lookupName}.png`]; // Legacy fallback

    // 3. Last resort: Try partial match in keys if still not found (slower, but rare)
    // Only if imageMap keys are minimal, this is fast enough. 
    // Optimization: Skip this if we trust the map. But for safety, let's keep a simplified version 
    // or rely on the imageMap population logic which handles "NAMEWITHOUTEXT".

    return fotonTruck;
};

const Vehicles = () => {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentVehicle, setCurrentVehicle] = useState(null);
    const [formData, setFormData] = useState({
        id_cliente: '',
        vin: '',
        marca: 'FOTON',
        id_modelo: '',
        anio: new Date().getFullYear(),
        color: '',
        kilometraje: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    // View Mode State
    const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'list'
    const [selectedModel, setSelectedModel] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const DEFAULT_MODELS = [
        { label: 'HDT', options: ['AUMAN Galaxy', 'AUMAN EST-A', 'AUMARK S38'] },
        { label: 'MDT', options: ['AUMARK S8', 'AUMARK S12'] },
        { label: 'LDT', options: ['AUMARK S3', 'AUMARK S5', 'AUMARK S6', 'AUMARK MILER'] },
        { label: 'MINI TRUCKS', options: ['TM3', 'WONDER'] }
    ];

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });

    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'models'
    const [models, setModels] = useState([]);
    const [isModelsManagerOpen, setIsModelsManagerOpen] = useState(false);

    // Auth Modal State
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authPin, setAuthPin] = useState('');

    const verifyPin = async () => {
        try {
            await api.post('/auth/verify-pin', { pin: authPin });
            setIsAuthModalOpen(false);
            setAuthPin('');
            setIsModelsManagerOpen(true);
        } catch (err) {
            setToast({ message: err.response?.data?.error || 'PIN incorrecto', type: 'error' });
        }
    };




    const fetchData = async () => {
        try {
            const [vehiclesRes, clientsRes, modelsRes] = await Promise.all([
                api.get('/vehicles'),
                api.get('/clients'),
                api.get('/vehicle-models')
            ]);
            console.log('Vehicles fetched:', vehiclesRes.data);
            setVehicles(vehiclesRes.data);
            setClients(clientsRes.data);
            setModels(modelsRes.data);
        } catch (err) {
            console.error("Error fetching data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (vehicle = null) => {
        if (vehicle) {
            setCurrentVehicle(vehicle);
            setFormData({
                id_cliente: vehicle.id_cliente || '',
                vin: vehicle.vin || '',
                marca: vehicle.marca || 'FOTON',
                id_modelo: vehicle.id_modelo || '',
                anio: vehicle.anio || new Date().getFullYear(),
                color: vehicle.color || '',
                kilometraje: vehicle.kilometraje || ''
            });
        } else {
            setCurrentVehicle(null);
            setFormData({
                id_cliente: '',
                vin: '',
                marca: 'FOTON',
                id_modelo: '',
                anio: new Date().getFullYear(),
                color: '',
                kilometraje: ''
            });
        }
        setClientSearch('');
        setShowClientDropdown(false);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentVehicle(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validaciones
        if (!formData.id_cliente) {
            setToast({ message: 'Por favor, seleccione un cliente.', type: 'warning' });
            return;
        }
        if (!formData.vin.trim()) {
            setToast({ message: 'El campo VIN es obligatorio.', type: 'warning' });
            return;
        }
        if (!formData.vin.trim()) {
            setToast({ message: 'El campo VIN es obligatorio.', type: 'warning' });
            return;
        }
        if (!formData.id_modelo) {
            setToast({ message: 'Por favor, seleccione un modelo.', type: 'warning' });
            return;
        }
        if (!formData.anio) {
            setToast({ message: 'El año del vehículo es obligatorio.', type: 'warning' });
            return;
        }
        if (!formData.color) {
            setToast({ message: 'Por favor, seleccione un color.', type: 'warning' });
            return;
        }
        if (!formData.kilometraje) {
            setToast({ message: 'El kilometraje es obligatorio.', type: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            if (currentVehicle) {
                await api.put(`/vehicles/${currentVehicle.id}`, formData);
            } else {
                await api.post('/vehicles', formData);
            }
            await fetchData();
            handleCloseModal();
            setToast({ message: currentVehicle ? 'Vehículo actualizado correctamente' : 'Vehículo registrado correctamente', type: 'success' });
        } catch (err) {
            console.error("Error saving vehicle", err);
            const errorMessage = err.response?.data?.error || "Error al guardar vehículo. Verifique los datos.";
            setToast({ message: errorMessage, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (id) => {
        setVehicleToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (vehicleToDelete) {
            try {
                await api.delete(`/vehicles/${vehicleToDelete}`);
                await fetchData();
                setToast({ message: 'Vehículo eliminado correctamente', type: 'success' });
            } catch (err) {
                console.error("Error deleting vehicle", err);
                setToast({ message: 'Error al eliminar el vehículo', type: 'error' });
            }
        }
    };

    // --- Models Management Logic ---
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [currentModel, setCurrentModel] = useState(null);
    const [modelFormData, setModelFormData] = useState({ nombre: '', imagen_url: '', descripcion: '' });
    const [modelToDelete, setModelToDelete] = useState(null);
    const [isModelConfirmOpen, setIsModelConfirmOpen] = useState(false);
    const [modelDeleteMessage, setModelDeleteMessage] = useState('');

    const handleOpenModelModal = (model = null) => {
        if (model) {
            setCurrentModel(model);
            setModelFormData({
                nombre: model.nombre,
                imagen_url: model.imagen_url || '',
                descripcion: model.descripcion || ''
            });
        } else {
            setCurrentModel(null);
            setModelFormData({ nombre: '', imagen_url: '', descripcion: '' });
        }
        setIsModelModalOpen(true);
    };

    const handleModelSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!modelFormData.nombre.trim()) {
            setToast({ message: 'El nombre del modelo es obligatorio', type: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            if (currentModel) {
                await api.put(`/vehicle-models/${currentModel.id}`, modelFormData);
                setToast({ message: 'Modelo actualizado correctamente', type: 'success' });
            } else {
                await api.post('/vehicle-models', modelFormData);
                setToast({ message: 'Modelo creado correctamente', type: 'success' });
            }
            fetchData();
            setIsModelModalOpen(false);
        } catch (err) {
            console.error("Error saving model", err);
            setToast({ message: 'Error al guardar modelo', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteModelClick = (id) => {
        const linkedVehiclesCount = vehicles.filter(v => v.id_modelo === id).length;
        setModelToDelete(id);
        if (linkedVehiclesCount > 0) {
            setModelDeleteMessage(`¡ADVERTENCIA! Hay ${linkedVehiclesCount} vehículo(s) vinculado(s) a este modelo. Si lo eliminas, estos vehículos quedarán sin modelo asignado ("Desconocido"). ¿Estás seguro de continuar?`);
        } else {
            setModelDeleteMessage("¿Estás seguro de que deseas eliminar este modelo? Esta acción no se puede deshacer.");
        }
        setIsModelConfirmOpen(true);
    };

    const handleConfirmDeleteModel = async () => {
        if (modelToDelete) {
            try {
                await api.delete(`/vehicle-models/${modelToDelete}`);
                setToast({ message: 'Modelo eliminado correctamente', type: 'success' });
                fetchData();
            } catch (err) {
                console.error("Error deleting model", err);
                setToast({ message: 'Error al eliminar modelo', type: 'error' });
            }
        }
        setIsModelConfirmOpen(false);
    };

    const getClientName = (id) => {
        const client = clients.find(c => c.id === id);
        return client ? client.nombre : 'Desconocido';
    };

    // Group vehicles by model for Gallery View
    const vehicleGroups = useMemo(() => {
        const groups = {};
        vehicles.forEach(v => {
            const modelName = v.modeloDetalle?.nombre || 'Desconocido';
            // Use image from model, or fallback to default truck image
            const modelImage = getVehicleImage(modelName);

            if (!groups[modelName]) {
                groups[modelName] = {
                    model: modelName,
                    count: 0,
                    image: modelImage,
                    examples: []
                };
            }
            groups[modelName].count++;
            if (groups[modelName].examples.length < 3) {
                groups[modelName].examples.push(v);
            }
        });
        return Object.values(groups).sort((a, b) => a.model.localeCompare(b.model));
    }, [vehicles]);

    // Filter vehicles for List View
    const filteredVehicles = useMemo(() => {
        let filtered = vehicles;

        // If in list mode and a model is selected, filter by that model
        if (viewMode === 'list' && selectedModel) {
            filtered = filtered.filter(v => v.modeloDetalle?.nombre === selectedModel);
        }

        // Apply search term
        if (searchTerm) {
            filtered = filtered.filter(v =>
                v.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.modeloDetalle?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                getClientName(v.id_cliente).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [vehicles, searchTerm, clients, viewMode, selectedModel]);

    const handleModelClick = (model) => {
        setSelectedModel(model);
        setViewMode('list');
        setSearchTerm(''); // Clear search when entering a category
    };

    const handleBackToGallery = () => {
        setViewMode('gallery');
        setSelectedModel(null);
        setSearchTerm('');
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } }
    };

    const itemVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0 } }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foton-blue"></div>
        </div>
    );

    // Pagination for Gallery Mode
    const itemsPerPage = 8;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentGroups = vehicleGroups.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(vehicleGroups.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    {viewMode === 'list' && activeTab === 'inventory' && (
                        <button
                            onClick={handleBackToGallery}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {viewMode === 'gallery' ? 'Gestión de Vehículos' : `Flota: ${selectedModel}`}
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {viewMode === 'gallery'
                                ? 'Vista general de la flota por modelo'
                                : `Administrando unidades del modelo ${selectedModel}`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {user?.rol !== 'Recepcionista' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsAuthModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <Settings className="w-5 h-5 mr-2" />
                            Gestionar Modelos
                        </motion.button>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleOpenModelModal()}
                        className="flex items-center px-4 py-2 bg-white text-foton-blue border border-foton-blue rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nuevo Modelo
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleOpenModal()}
                        className="flex items-center px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Registrar Vehículo
                    </motion.button>
                </div>
            </div>

            {viewMode === 'gallery' ? (
                /* GALLERY VIEW */
                <>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {currentGroups.map((group) => (
                            <motion.div
                                key={group.model}
                                variants={itemVariants}
                                whileHover={{ y: -5 }}
                                onClick={() => handleModelClick(group.model)}
                                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 group"
                            >
                                <div className="p-6 flex flex-col items-center">
                                    <div className="w-full h-40 flex items-center justify-center mb-4 bg-gray-50 rounded-xl p-4 group-hover:bg-blue-50 transition-colors">
                                        <img
                                            src={group.image}
                                            alt={group.model}
                                            className="max-h-full max-w-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
                                            onError={(e) => { e.target.onerror = null; e.target.src = fotonTruck; }}
                                        />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 text-center mb-1">{group.model}</h3>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                        {group.count} {group.count === 1 ? 'Unidad' : 'Unidades'}
                                    </span>
                                </div>
                                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 font-medium">Ver registros</span>
                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-blue-600 transition-colors">
                                        <Truck className="w-3 h-3" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {vehicleGroups.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No hay vehículos registrados.</p>
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="mt-4 text-blue-600 font-bold hover:underline"
                                >
                                    Registrar el primero
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-4 py-4 mt-4">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex space-x-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => {
                                    // Logic to show limited page numbers (e.g., if many pages)
                                    if (
                                        totalPages <= 7 ||
                                        number === 1 ||
                                        number === totalPages ||
                                        (number >= currentPage - 1 && number <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={number}
                                                onClick={() => paginate(number)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === number
                                                    ? 'bg-foton-blue text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                                                    }`}
                                            >
                                                {number}
                                            </button>
                                        );
                                    } else if (
                                        (number === currentPage - 2 && currentPage > 3) ||
                                        (number === currentPage + 2 && currentPage < totalPages - 2)
                                    ) {
                                        return <span key={number} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                                    }
                                    return null;
                                })}
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
                </>
            ) : (
                /* LIST VIEW */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-sm font-semibold text-gray-700">Lista de Unidades</h2>
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Buscar por VIN o Cliente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-72"
                                />
                            </div>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                                {filteredVehicles.length} vehículos
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Unidad</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Identificación</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Propietario</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                <AnimatePresence>
                                    {filteredVehicles.map((vehicle) => (
                                        <motion.tr
                                            key={vehicle.id}
                                            variants={itemVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="hidden"
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                                        <Car className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{vehicle.marca} {vehicle.modeloDetalle?.nombre}</div>
                                                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            {vehicle.anio}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center text-sm font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded w-fit">
                                                        <Hash className="w-3 h-3 mr-1 text-gray-400" />
                                                        {vehicle.vin}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <User className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                    {getClientName(vehicle.id_cliente)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Palette className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                        {vehicle.color || 'Sin color'}
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Gauge className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                        {vehicle.kilometraje ? `${vehicle.kilometraje} km` : 'Sin kilometraje'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleOpenModal(vehicle)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleDeleteClick(vehicle.id)}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {filteredVehicles.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                            No se encontraron vehículos que coincidan con tu búsqueda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}



            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={currentVehicle ? 'Editar Vehículo' : 'Registrar Vehículo'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                                onChange={(e) => {
                                    setClientSearch(e.target.value);
                                    setShowClientDropdown(true);
                                }}
                                onFocus={() => setShowClientDropdown(true)}
                                value={clientSearch || (formData.id_cliente ? getClientName(formData.id_cliente) : '')}
                            />

                            {showClientDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {clients.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase()))
                                        .slice(0, 10)
                                        .map(client => (
                                            <button
                                                key={client.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, id_cliente: client.id });
                                                    setClientSearch(client.nombre);
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                        <input
                            type="text"
                            value={formData.vin}
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
                                setFormData({ ...formData, vin: val });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue tracking-widest"
                            required
                            maxLength={17}
                            placeholder="17 caracteres alfanuméricos"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                            <input
                                type="text"
                                value={formData.marca}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                                    className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue bg-white flex justify-between items-center"
                                >
                                    <span className={formData.id_modelo ? 'text-gray-900' : 'text-gray-500'}>
                                        {formData.id_modelo
                                            ? models.find(m => m.id.toString() === formData.id_modelo.toString())?.nombre || 'Modelo no encontrado'
                                            : 'Seleccionar Modelo'}
                                    </span>
                                    <Settings className="w-4 h-4 text-gray-400" />
                                </button>

                                {showModelDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {models.map(model => (
                                            <button
                                                key={model.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, id_modelo: model.id });
                                                    setShowModelDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 text-gray-700"
                                            >
                                                {model.nombre}
                                            </button>
                                        ))}
                                        {models.length === 0 && (
                                            <div className="px-4 py-2 text-sm text-gray-500">No hay modelos disponibles</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                            <input
                                type="number"
                                value={formData.anio}
                                onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                            <select
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                            >
                                <option value="">Seleccionar Color</option>
                                <option value="Blanco">Blanco</option>
                                <option value="Plata">Plata</option>
                                <option value="Gris">Gris</option>
                                <option value="Negro">Negro</option>
                                <option value="Rojo">Rojo</option>
                                <option value="Azul">Azul</option>
                                <option value="Verde">Verde</option>
                                <option value="Amarillo">Amarillo</option>
                                <option value="Naranja">Naranja</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Km</label>
                            <input
                                type="number"
                                value={formData.kilometraje}
                                onChange={(e) => setFormData({ ...formData, kilometraje: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2 text-sm font-medium text-white bg-foton-blue rounded-lg hover:bg-blue-800 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form >
            </Modal >

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Vehículo"
                message="¿Estás seguro de que deseas eliminar este vehículo? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
            />

            {/* Model Modal */}
            <Modal
                isOpen={isModelModalOpen}
                onClose={() => setIsModelModalOpen(false)}
                title={currentModel ? 'Editar Modelo' : 'Nuevo Modelo'}
            >
                <form onSubmit={handleModelSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Modelo</label>
                        <input
                            type="text"
                            value={modelFormData.nombre}
                            onChange={(e) => setModelFormData({ ...modelFormData, nombre: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                            placeholder="Ej. AUMARK S3"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del Vehículo</label>
                        <div className="space-y-3">
                            <select
                                value={modelFormData.imagen_url}
                                onChange={(e) => setModelFormData({ ...modelFormData, imagen_url: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue bg-white"
                            >
                                <option value="">Seleccionar imagen local...</option>
                                {availableImages.map((img) => (
                                    <option key={img.path} value={img.name}>
                                        {img.name}
                                    </option>
                                ))}
                            </select>

                            {modelFormData.imagen_url && (
                                <div className="flex justify-center p-4 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                                    <img
                                        src={vehicleImages[`../imagenes/${modelFormData.imagen_url}`]?.default || fotonTruck}
                                        alt="Vista previa"
                                        className="h-32 object-contain"
                                    />
                                </div>
                            )}
                            <p className="text-xs text-gray-500">
                                Selecciona una imagen de la carpeta <code>src/imagenes</code>.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModelModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2 text-sm font-medium text-white bg-foton-blue rounded-lg hover:bg-blue-800 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Models Manager Modal */}
            <Modal
                isOpen={isModelsManagerOpen}
                onClose={() => setIsModelsManagerOpen(false)}
                title="Gestión de Modelos Personalizados"
            >
                <div className="space-y-4">
                    {models.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No hay modelos personalizados registrados.
                        </div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto border border-gray-100 rounded-xl shadow-sm scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                                            Vista Previa
                                        </th>
                                        <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Modelo
                                        </th>
                                        <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {models.map((model) => (
                                        <tr key={model.id} className="group hover:bg-blue-50/30 transition-colors duration-200">
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="h-12 w-16 flex items-center justify-center bg-white rounded-md border border-gray-100 p-1">
                                                    <img
                                                        src={getVehicleImage(model)}
                                                        alt={model.nombre}
                                                        className="max-h-full max-w-full object-contain drop-shadow-sm transform group-hover:scale-110 transition-transform duration-300"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = fotonTruck; }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-700 group-hover:text-blue-700 transition-colors">{model.nombre}</div>
                                                {model.descripcion && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{model.descripcion}</div>}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end items-center space-x-1 opacity-40 group-hover:opacity-100 transition-all duration-200">
                                                    <button
                                                        onClick={() => {
                                                            handleOpenModelModal(model);
                                                            setIsModelsManagerOpen(false);
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteModelClick(model.id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setIsModelsManagerOpen(false)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Auth Modal */}
            <Modal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                title="Verificación de Seguridad"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Ingresa tu PIN de seguridad para gestionar los modelos.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PIN de Seguridad</label>
                        <input
                            type="password"
                            value={authPin}
                            onChange={(e) => setAuthPin(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue tracking-widest text-center text-lg"
                            placeholder="••••"
                            maxLength={6}
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsAuthModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={verifyPin}
                            className="px-4 py-2 text-sm font-medium text-white bg-foton-blue rounded-lg hover:bg-blue-800"
                        >
                            Verificar
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={isModelConfirmOpen}
                onClose={() => setIsModelConfirmOpen(false)}
                onConfirm={handleConfirmDeleteModel}
                title="Eliminar Modelo"
                message={modelDeleteMessage}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
            />

            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: '' })}
            />
        </motion.div >
    );
};

export default Vehicles;
