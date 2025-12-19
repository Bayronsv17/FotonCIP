import { useState, useEffect } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { Plus, Edit2, Trash2, Search, Mail, Phone, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        correo: '',
        direccion: '',
        rfc: ''
    });
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });

    const fetchClients = async () => {
        try {
            const res = await api.get('/clients');
            setClients(res.data);
        } catch (err) {
            console.error("Error fetching clients", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleOpenModal = (client = null) => {
        if (client) {
            setCurrentClient(client);
            setFormData({
                nombre: client.nombre,
                telefono: client.telefono || '',
                correo: client.correo || '',
                direccion: client.direccion || '',
                rfc: client.rfc || ''
            });
        } else {
            setCurrentClient(null);
            setFormData({
                nombre: '',
                telefono: '',
                correo: '',
                direccion: '',
                rfc: ''
            });
        }
        setErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentClient(null);
    };

    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        // Name validation: No numbers allowed
        if (/\d/.test(formData.nombre)) {
            newErrors.nombre = "El nombre no puede contener números";
        }

        // Phone validation: Exactly 10 digits
        if (!/^\d{10}$/.test(formData.telefono)) {
            newErrors.telefono = "El teléfono debe tener exactamente 10 dígitos numéricos";
        }

        // Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
            newErrors.correo = "Ingrese un correo electrónico válido";
        }

        // RFC validation
        if (formData.rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i.test(formData.rfc)) {
            newErrors.rfc = "El RFC no tiene un formato válido";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nombre.trim()) {
            setToast({ message: 'El nombre es obligatorio.', type: 'warning' });
            return;
        }
        if (!formData.telefono.trim()) {
            setToast({ message: 'El teléfono es obligatorio.', type: 'warning' });
            return;
        }
        if (!formData.correo.trim()) {
            setToast({ message: 'El correo electrónico es obligatorio.', type: 'warning' });
            return;
        }
        if (!formData.direccion.trim()) {
            setToast({ message: 'La dirección es obligatoria.', type: 'warning' });
            return;
        }
        if (!formData.rfc.trim()) {
            setToast({ message: 'El RFC es obligatorio.', type: 'warning' });
            return;
        }

        if (!validateForm()) return;

        try {
            if (currentClient) {
                await api.put(`/clients/${currentClient.id}`, formData);
            } else {
                await api.post('/clients', formData);
            }
            fetchClients();
            handleCloseModal();
            setToast({ message: currentClient ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente', type: 'success' });
        } catch (err) {
            console.error("Error saving client", err);
            setToast({ message: 'Error al guardar cliente. Verifique los datos.', type: 'error' });
        }
    };

    const handleDeleteClick = (id) => {
        setClientToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (clientToDelete) {
            try {
                await api.delete(`/clients/${clientToDelete}`);
                fetchClients();
                setToast({ message: 'Cliente eliminado correctamente', type: 'success' });
            } catch (err) {
                console.error("Error deleting client", err);
                setToast({ message: 'Error al eliminar cliente', type: 'error' });
            }
        }
        setIsConfirmOpen(false);
    };

    const filteredClients = clients.filter(client =>
        client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.correo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredClients.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foton-blue"></div>
        </div>
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.3 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.2 }
        }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6"
        >
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Clientes</h1>
                    <p className="text-gray-500 text-sm mt-1">Administra la información de tus clientes</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Agregar Cliente
                </motion.button>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, correo o empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foton-blue focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{filteredClients.length}</span>
                    <span>clientes registrados</span>
                </div>
            </div>

            {filteredClients.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
                        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No hay clientes encontrados</h3>
                    <p className="mt-1 text-gray-500">Intenta con otros términos de búsqueda o agrega un nuevo cliente.</p>
                </div>
            ) : (
                <>
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        <AnimatePresence mode='wait'>
                            {currentItems.map((client) => (
                                <motion.div
                                    key={client.id}
                                    variants={itemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group flex flex-col"
                                >
                                    <div className="h-2 bg-gradient-to-r from-blue-400 to-foton-blue" />
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-foton-blue shadow-sm border border-blue-100">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                                <button
                                                    onClick={() => handleOpenModal(client)}
                                                    className="p-1.5 text-gray-400 hover:text-foton-blue hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(client.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1" title={client.nombre}>
                                            {client.nombre}
                                        </h3>

                                        <div className="space-y-2 mt-4 flex-1">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                                <span className="truncate" title={client.correo || 'Sin correo'}>
                                                    {client.correo || 'Sin correo'}
                                                </span>
                                            </div>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                                <span>{client.telefono || 'Sin teléfono'}</span>
                                            </div>
                                            <div className="flex items-start text-sm text-gray-600">
                                                <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                                                <span className="line-clamp-2 text-xs" title={client.direccion}>
                                                    {client.direccion || 'Sin dirección registrada'}
                                                </span>
                                            </div>
                                            {client.rfc && (
                                                <div className="flex items-center text-sm text-gray-600 pt-2 border-t border-gray-50 mt-2">
                                                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                        RFC: {client.rfc}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 md:hidden">
                                        <div className="flex space-x-4 w-full">
                                            <button onClick={() => handleOpenModal(client)} className="flex-1 text-foton-blue font-bold py-1 bg-white border border-blue-100 rounded-md shadow-sm">Editar</button>
                                            <button onClick={() => handleDeleteClick(client.id)} className="flex-1 text-red-500 font-bold py-1 bg-white border border-red-100 rounded-md shadow-sm">Eliminar</button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-4 mt-8">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
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
                                                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
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
                                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={currentClient ? 'Editar Cliente' : 'Registrar Cliente'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-foton-blue focus:border-foton-blue ${errors.nombre ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="Ej: Transportes del Norte S.A. de C.V."
                            required
                        />
                        {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                            <input
                                type="text"
                                value={formData.telefono}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData({ ...formData, telefono: value });
                                }}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-foton-blue focus:border-foton-blue ${errors.telefono ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Ej: 5512345678"
                                maxLength={10}
                            />
                            {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.correo}
                                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-foton-blue focus:border-foton-blue ${errors.correo ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Ej: contacto@empresa.com"
                            />
                            {errors.correo && <p className="text-red-500 text-xs mt-1">{errors.correo}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <input
                            type="text"
                            value={formData.direccion}
                            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                            placeholder="Ej: Av. Vallarta 1234, Col. Centro"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
                        <input
                            type="text"
                            value={formData.rfc}
                            onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-foton-blue focus:border-foton-blue ${errors.rfc ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="Ej: TNO900101ABC"
                            maxLength={13}
                        />
                        {errors.rfc && <p className="text-red-500 text-xs mt-1">{errors.rfc}</p>}
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
                            className="px-4 py-2 text-sm font-medium text-white bg-foton-blue rounded-lg hover:bg-blue-800"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Cliente"
                message="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
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

export default Clients;
