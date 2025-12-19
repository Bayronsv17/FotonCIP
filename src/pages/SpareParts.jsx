import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { Plus, Edit2, Trash2, Search, Package, AlertTriangle, DollarSign, Box, X, Eye, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const SpareParts = () => {
    const { user } = useAuth();
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPart, setCurrentPart] = useState(null);
    const [formData, setFormData] = useState({
        codigo: '',
        nombre: '',
        descripcion: '',
        costo_unitario: '',
        cantidad: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [errors, setErrors] = useState({});

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    // Vehicle Models State
    const [vehicleModels, setVehicleModels] = useState([]);
    const [selectedModels, setSelectedModels] = useState([]); // Array of strings (model names)

    // Stock Modal State
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockToAdd, setStockToAdd] = useState('');

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [partToDelete, setPartToDelete] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });

    const isReadOnly = user?.rol === 'Recepcionista';

    const fetchParts = async () => {
        try {
            const res = await api.get('/refacciones');
            setParts(res.data);
        } catch (err) {
            console.error("Error fetching spare parts", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchModels = async () => {
        try {
            const res = await api.get('/vehicle-models');
            setVehicleModels(res.data);
        } catch (err) {
            console.error("Error fetching vehicle models", err);
        }
    };

    useEffect(() => {
        fetchParts();
        fetchModels();
    }, []);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleOpenModal = (part = null) => {
        if (part) {
            setCurrentPart(part);
            setFormData({
                codigo: part.codigo || '',
                nombre: part.nombre,
                descripcion: part.descripcion || '',
                costo_unitario: part.costo_unitario,
                cantidad: part.cantidad
            });
            // Extract model names from compatibilidad array
            setSelectedModels(part.compatibilidad ? part.compatibilidad.map(c => c.modelo) : []);
        } else {
            setCurrentPart(null);
            setFormData({
                codigo: '',
                nombre: '',
                descripcion: '',
                costo_unitario: '',
                cantidad: ''
            });
            setSelectedModels([]);
        }
        setErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentPart(null);
    };

    const handleOpenStockModal = (part) => {
        setCurrentPart(part);
        setStockToAdd('');
        setIsStockModalOpen(true);
    };

    const handleStockSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!stockToAdd || parseInt(stockToAdd) <= 0) return;

        try {
            const newQuantity = currentPart.cantidad + parseInt(stockToAdd);
            await api.put(`/refacciones/${currentPart.id_refaccion}`, {
                ...currentPart,
                cantidad: newQuantity
            });
            fetchParts();
            setIsStockModalOpen(false);
            setCurrentPart(null);
            setToast({ message: 'Stock actualizado correctamente', type: 'success' });
        } catch (err) {
            console.error("Error updating stock", err);
            setToast({ message: 'Error al actualizar stock', type: 'error' });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.codigo) newErrors.codigo = "El código es obligatorio";
        if (!formData.nombre) newErrors.nombre = "El nombre es obligatorio";
        if (!formData.costo_unitario || formData.costo_unitario < 0) newErrors.costo_unitario = "Costo inválido";
        if (!formData.cantidad || formData.cantidad < 0) newErrors.cantidad = "Cantidad inválida";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!validateForm()) return;

        try {
            const payload = {
                ...formData,
                costo_unitario: parseFloat(formData.costo_unitario),
                cantidad: parseInt(formData.cantidad),
                modelos: selectedModels // Send array of strings
            };

            if (currentPart) {
                await api.put(`/refacciones/${currentPart.id_refaccion}`, payload);
                setToast({ message: 'Refacción actualizada correctamente', type: 'success' });
            } else {
                await api.post('/refacciones', payload);
                setToast({ message: 'Refacción creada correctamente', type: 'success' });
            }
            fetchParts();
            handleCloseModal();
        } catch (err) {
            console.error("Error saving part", err);
            setToast({ message: err.response?.data?.msg || "Error al guardar refacción", type: 'error' });
        }
    };

    const handleDeleteClick = (id) => {
        if (isReadOnly) return;
        setPartToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (partToDelete) {
            try {
                await api.delete(`/refacciones/${partToDelete}`);
                fetchParts();
                setToast({ message: 'Refacción eliminada correctamente', type: 'success' });
            } catch (err) {
                console.error("Error deleting part", err);
                setToast({ message: err.response?.data?.msg || "Error al eliminar refacción", type: 'error' });
            }
        }
        setIsConfirmOpen(false);
    };

    const filteredParts = useMemo(() => {
        return parts.filter(part =>
            part.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            part.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [parts, searchTerm]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentParts = filteredParts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredParts.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);


    // Stats Calculations
    const totalValue = useMemo(() => parts.reduce((acc, p) => acc + (parseFloat(p.costo_unitario) * p.cantidad), 0), [parts]);
    const lowStockCount = useMemo(() => parts.filter(p => p.cantidad <= 5).length, [parts]);

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

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6"
        >
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Inventario de Refacciones</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isReadOnly ? 'Consulta el stock y precios de productos' : 'Gestiona el stock y precios de tus productos'}
                    </p>
                </div>
                {!isReadOnly && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleOpenModal()}
                        className="flex items-center px-4 py-2 bg-foton-blue text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nueva Refacción
                    </motion.button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total de refacciones en inventario</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{parts.length}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Box className="w-5 h-5 text-foton-blue" />
                        </div>
                    </div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Valor del Inventario</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">${totalValue.toFixed(2)}</h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Stock Bajo</p>
                            <h3 className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                {lowStockCount}
                            </h3>
                        </div>
                        <div className={`p-2 rounded-lg ${lowStockCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <AlertTriangle className={`w-5 h-5 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center space-x-2">
                        <Package className="text-gray-400 w-5 h-5" />
                        <h2 className="text-sm font-semibold text-gray-700">Catálogo General</h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o código..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foton-blue focus:border-transparent w-64"
                            />
                        </div>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                            {filteredParts.length} items
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Costo Unit.</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence mode="wait">
                                {currentParts.map((part) => (
                                    <motion.tr
                                        key={part.id_refaccion}
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="hidden"
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                {part.codigo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{part.nombre}</div>
                                            {part.descripcion && (
                                                <div className="text-xs text-gray-500 truncate max-w-xs">{part.descripcion}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${part.cantidad <= 5
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-green-100 text-green-800'
                                                }`}>
                                                {part.cantidad <= 5 ? <AlertTriangle className="w-3 h-3 mr-1" /> : <Package className="w-3 h-3 mr-1" />}
                                                {part.cantidad} u.
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-700 font-medium">
                                                ${parseFloat(part.costo_unitario).toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                {isReadOnly ? (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleOpenModal(part)}
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
                                                            onClick={() => handleOpenStockModal(part)}
                                                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Agregar Stock"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleOpenModal(part)}
                                                            className="p-1.5 text-gray-500 hover:text-foton-blue hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleDeleteClick(part.id_refaccion)}
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
                                ))}
                            </AnimatePresence>
                            {filteredParts.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron refacciones.
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

            {/* Main Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isReadOnly ? 'Detalles de Refacción' : (currentPart ? 'Editar Refacción' : 'Nueva Refacción')}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                            <input
                                type="text"
                                value={formData.codigo}
                                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent ${errors.codigo ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-100 disabled:text-gray-500`}
                                placeholder="Ej. FLT-001"
                                disabled={isReadOnly}
                            />
                            {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent ${errors.nombre ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-100 disabled:text-gray-500`}
                                placeholder="Ej. Filtro de Aceite"
                                disabled={isReadOnly}
                            />
                            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                            rows="2"
                            disabled={isReadOnly}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Modelos Compatibles</label>
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {vehicleModels.length > 0 ? (
                                    vehicleModels.map(model => {
                                        const isSelected = selectedModels.includes(model.nombre);
                                        return (
                                            <div
                                                key={model.nombre}
                                                onClick={() => {
                                                    if (isReadOnly) return;
                                                    setSelectedModels(prev =>
                                                        prev.includes(model.nombre)
                                                            ? prev.filter(name => name !== model.nombre)
                                                            : [...prev, model.nombre]
                                                    );
                                                }}
                                                className={`flex justify-between items-center px-4 py-3 border-b border-gray-100 last:border-0 transition-all cursor-pointer
                                                    ${isSelected ? 'bg-blue-50 border-l-4 border-l-foton-blue' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}
                                                    ${isReadOnly ? 'cursor-default' : ''}
                                                `}
                                            >
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-foton-blue' : 'text-gray-700'}`}>
                                                        {model.nombre}
                                                    </span>
                                                    {model.descripcion && (
                                                        <span className="text-xs text-gray-500 truncate max-w-[200px]">
                                                            {model.descripcion}
                                                        </span>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <div className="bg-foton-blue rounded-full p-1">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        No hay modelos de vehículos registrados.
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Haz clic en los modelos para seleccionarlos.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario ($)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.costo_unitario}
                                    onChange={(e) => setFormData({ ...formData, costo_unitario: e.target.value })}
                                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent ${errors.costo_unitario ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-100 disabled:text-gray-500`}
                                    disabled={isReadOnly}
                                />
                            </div>
                            {errors.costo_unitario && <p className="text-red-500 text-xs mt-1">{errors.costo_unitario}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (Stock)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.cantidad}
                                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-foton-blue focus:border-transparent ${errors.cantidad ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-100 disabled:text-gray-500`}
                                disabled={isReadOnly}
                            />
                            {errors.cantidad && <p className="text-red-500 text-xs mt-1">{errors.cantidad}</p>}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            {isReadOnly ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!isReadOnly && (
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-foton-blue rounded-lg hover:bg-blue-800 transition-colors"
                            >
                                Guardar
                            </button>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Stock Modal */}
            <Modal
                isOpen={isStockModalOpen}
                onClose={() => setIsStockModalOpen(false)}
                title="Agregar Stock"
            >
                <form onSubmit={handleStockSubmit} className="space-y-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-2">
                            Agregando stock para: <span className="font-bold text-gray-900">{currentPart?.nombre}</span>
                        </p>
                        <div className="bg-blue-50 p-3 rounded-lg mb-4">
                            <p className="text-xs text-blue-700 font-medium">Stock actual: {currentPart?.cantidad} unidades</p>
                        </div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a agregar</label>
                        <input
                            type="number"
                            min="1"
                            autoFocus
                            value={stockToAdd}
                            onChange={(e) => setStockToAdd(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="0"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsStockModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Agregar Stock
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Refacción"
                message="¿Estás seguro de que deseas eliminar esta refacción? Esta acción no se puede deshacer."
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

export default SpareParts;
