import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { Plus, Edit2, Trash2, Search, Wrench, Clock, DollarSign, FileText, Settings, Shield, AlertTriangle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Services = () => {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        duracion: '',
        costo: '',
        tipo: 'preventivo',
        checklist: []
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });

    const isReadOnly = user?.rol === 'Recepcionista';

    const fetchServices = async () => {
        try {
            const res = await api.get('/services');
            setServices(res.data);
        } catch (err) {
            console.error("Error fetching services", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleOpenModal = (service = null) => {
        if (service) {
            setCurrentService(service);
            setFormData({
                nombre: service.nombre,
                descripcion: service.descripcion || '',
                duracion: service.duracion || '',
                costo: service.costo || '',
                tipo: service.tipo || 'preventivo',
                checklist: service.checklist || []
            });
        } else {
            setCurrentService(null);
            setFormData({
                nombre: '',
                descripcion: '',
                duracion: '',
                costo: '',
                tipo: 'preventivo',
                checklist: []
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentService(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;

        // Validaciones
        if (!formData.nombre.trim()) {
            setToast({ message: 'El nombre del servicio es obligatorio.', type: 'warning' });
            return;
        }
        if (!formData.costo) {
            setToast({ message: 'El costo es obligatorio.', type: 'warning' });
            return;
        }
        if (!formData.duracion) {
            setToast({ message: 'La duración es obligatoria.', type: 'warning' });
            return;
        }

        try {
            if (currentService) {
                await api.put(`/services/${currentService.id}`, formData);
                setToast({ message: 'Servicio actualizado correctamente', type: 'success' });
            } else {
                await api.post('/services', formData);
                setToast({ message: 'Servicio creado correctamente', type: 'success' });
            }
            fetchServices();
            handleCloseModal();
        } catch (err) {
            console.error("Error saving service", err);
            const errorMessage = err.response?.data?.message || 'Error al guardar servicio. Verifique los datos.';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    const handleDeleteClick = (id) => {
        if (isReadOnly) return;
        setServiceToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (serviceToDelete) {
            try {
                await api.delete(`/services/${serviceToDelete}`);
                setToast({ message: 'Servicio eliminado correctamente', type: 'success' });
                fetchServices();
            } catch (err) {
                console.error("Error deleting service", err);
                setToast({ message: 'Error al eliminar servicio', type: 'error' });
            }
        }
        setIsConfirmOpen(false);
    };

    const filteredServices = useMemo(() => {
        return services.filter(s =>
            s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [services, searchTerm]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredServices.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);


    const stats = useMemo(() => {
        const total = services.length;
        const totalCost = services.reduce((acc, curr) => acc + (parseFloat(curr.costo) || 0), 0);
        const totalDuration = services.reduce((acc, curr) => acc + (parseInt(curr.duracion) || 0), 0);

        return {
            total,
            avgCost: total > 0 ? totalCost / total : 0,
            avgDuration: total > 0 ? totalDuration / total : 0
        };
    }, [services]);

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
                    <h1 className="text-2xl font-bold text-gray-800">Catálogo de Servicios</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isReadOnly ? 'Consulta los servicios disponibles' : 'Gestiona los tipos de servicios ofrecidos'}
                    </p>
                </div>
                {!isReadOnly && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOpenModal()}
                        className="flex items-center px-4 py-2 bg-foton-blue text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nuevo Servicio
                    </motion.button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Precio Promedio</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">
                                ${stats.avgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Duración Promedio</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">
                                {Math.round(stats.avgDuration)} min
                            </h3>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-xl">
                            <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-sm font-semibold text-gray-700">Lista de Servicios</h2>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar servicio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foton-blue focus:border-transparent w-64"
                            />
                        </div>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                            {filteredServices.length} servicios
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Servicio</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Detalles</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence mode="wait">
                                {currentItems.map((service) => (
                                    <motion.tr
                                        key={service.id}
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="hidden"
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="p-2 bg-indigo-50 rounded-lg mr-3">
                                                    <Settings className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div className="text-sm font-bold text-gray-900">{service.nombre}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start text-sm text-gray-600 max-w-xs">
                                                <FileText className="w-3.5 h-3.5 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                                                <span className="truncate" title={service.descripcion}>
                                                    {service.descripcion || 'Sin descripción'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${service.tipo === 'preventivo' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                                {service.tipo === 'preventivo' ?
                                                    <Shield className="w-3 h-3 mr-1" /> :
                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                }
                                                {service.tipo.charAt(0).toUpperCase() + service.tipo.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Clock className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                    {service.duracion} min
                                                </div>
                                                <div className="flex items-center text-sm font-medium text-gray-900">
                                                    <DollarSign className="w-3.5 h-3.5 mr-2 text-green-600" />
                                                    ${service.costo}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                {isReadOnly ? (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleOpenModal(service)}
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
                                                            onClick={() => handleOpenModal(service)}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleDeleteClick(service.id)}
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
                            {filteredServices.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron servicios que coincidan con tu búsqueda.
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

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isReadOnly ? 'Detalles del Servicio' : (currentService ? 'Editar Servicio' : 'Nuevo Servicio')}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servicio</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => {
                                    setFormData({ ...formData, nombre: e.target.value });
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder="Selecciona o escribe un nombre..."
                                required
                                autoComplete="off"
                                disabled={isReadOnly}
                            />
                            {!isReadOnly && showSuggestions && formData.nombre.length < 30 && (
                                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                                    {services
                                        .map(s => s.nombre)
                                        .filter((v, i, a) => a.indexOf(v) === i)
                                        .filter(name => name.toLowerCase().includes(formData.nombre.toLowerCase()))
                                        .slice(0, 8)
                                        .map((name, index) => (
                                            <li
                                                key={index}
                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setFormData({ ...formData, nombre: name });
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                {name}
                                            </li>
                                        ))}
                                    {services.filter(s => s.nombre.toLowerCase().includes(formData.nombre.toLowerCase())).length === 0 && formData.nombre !== '' && (
                                        <li className="px-4 py-2 text-xs text-gray-400 italic">
                                            Crear nuevo servicio: "{formData.nombre}"
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                        {!isReadOnly && <p className="text-xs text-gray-500 mt-1">Escribe para buscar o crear uno nuevo.</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue disabled:bg-gray-100 disabled:text-gray-500"
                            rows="3"
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                            <select
                                value={formData.tipo}
                                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue disabled:bg-gray-100 disabled:text-gray-500"
                                disabled={isReadOnly}
                            >
                                <option value="preventivo">Preventivo</option>
                                <option value="correctivo">Correctivo</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                            <input
                                type="number"
                                value={formData.duracion}
                                onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue disabled:bg-gray-100 disabled:text-gray-500"
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    {/* Checklist Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Checklist de Servicio</label>
                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, checklist: [...formData.checklist, ''] })}
                                    className="text-xs text-foton-blue hover:text-blue-700 font-medium flex items-center"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Agregar Paso
                                </button>
                            )}
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {formData.checklist.map((step, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                                    <input
                                        type="text"
                                        value={step}
                                        onChange={(e) => {
                                            const newChecklist = [...formData.checklist];
                                            newChecklist[index] = e.target.value;
                                            setFormData({ ...formData, checklist: newChecklist });
                                        }}
                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue disabled:bg-gray-100 disabled:text-gray-500"
                                        placeholder={`Paso ${index + 1}`}
                                        disabled={isReadOnly}
                                    />
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newChecklist = formData.checklist.filter((_, i) => i !== index);
                                                setFormData({ ...formData, checklist: newChecklist });
                                            }}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {formData.checklist.length === 0 && (
                                <p className="text-xs text-gray-400 italic">No hay pasos definidos para este servicio.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
                        <input
                            type="number"
                            value={formData.costo}
                            onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue disabled:bg-gray-100 disabled:text-gray-500"
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
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
                                className="px-4 py-2 text-sm font-medium text-white bg-foton-blue rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                            >
                                Guardar
                            </button>
                        )}
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Servicio"
                message="¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
            />

            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: '' })}
            />
        </motion.div>
    );
};

export default Services;
