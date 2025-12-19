import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Search, User, Shield, Mail, Eye, EyeOff, Calendar, CheckCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        password: '',
        confirmPassword: '', // Add confirmPassword field
        rol: 'Cliente'
    });
    const [searchTerm, setSearchTerm] = useState('');

    const [clients, setClients] = useState([]);
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Add submitting state

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Error fetching users", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await api.get('/clients');
            setClients(res.data);
        } catch (err) {
            console.error("Error fetching clients", err);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchClients();
    }, []);

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authPin, setAuthPin] = useState('');
    const [pendingAction, setPendingAction] = useState(null); // { type: 'edit' | 'delete', data: user | id }

    const verifyPin = async () => {
        try {
            await api.post('/auth/verify-pin', { pin: authPin });
            setIsAuthModalOpen(false);
            setAuthPin('');

            // Execute pending action
            if (pendingAction.type === 'edit') {
                proceedOpenModal(pendingAction.data);
            } else if (pendingAction.type === 'delete') {
                proceedDelete(pendingAction.data);
            }
            setPendingAction(null);
        } catch (err) {
            setToast({ message: err.response?.data?.error || 'PIN incorrecto', type: 'error' });
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            // If editing, require auth
            setPendingAction({ type: 'edit', data: user });
            setIsAuthModalOpen(true);
        } else {
            // Creating new user doesn't necessarily need re-auth, but we can add it if desired. 
            // For now, let's just do it for editing existing ones as requested "editar informacion".
            proceedOpenModal(null);
        }
    };

    const proceedOpenModal = (user) => {
        if (user) {
            setCurrentUser(user);
            setFormData({
                nombre: user.nombre,
                correo: user.correo,
                password: '', // Always empty for security
                confirmPassword: '',
                rol: user.rol
            });
        } else {
            setCurrentUser(null);
            setFormData({
                nombre: '',
                correo: '',
                password: '',
                confirmPassword: '',
                rol: 'Cliente'
            });
        }
        setClientSearch('');
        setShowClientDropdown(false);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentUser(null);
    };

    const { user: loggedInUser, updateUser } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (isSubmitting) return;

        // Password confirmation check
        if (formData.password !== formData.confirmPassword) {
            setToast({ message: 'Las contraseñas no coinciden', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        try {
            let savedUser;
            if (currentUser) {
                const payload = { ...formData };
                if (!payload.password) delete payload.password;
                delete payload.confirmPassword; // Don't send confirmPassword to API

                const res = await api.put(`/users/${currentUser.id}`, payload);
                savedUser = res.data;

                // If we updated the currently logged in user, update the auth context
                if (loggedInUser && loggedInUser.id === currentUser.id) {
                    updateUser({ ...loggedInUser, ...savedUser });
                }
                setToast({ message: 'Usuario actualizado correctamente', type: 'success' });
            } else {
                const payload = { ...formData };
                delete payload.confirmPassword; // Don't send confirmPassword to API
                await api.post('/users', payload);
                setToast({ message: 'Usuario creado correctamente', type: 'success' });
            }
            fetchUsers();
            handleCloseModal();
        } catch (err) {
            console.error("Error saving user", err);
            setToast({ message: "Error al guardar usuario: " + (err.response?.data?.error || err.message), type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        setPendingAction({ type: 'delete', data: id });
        setIsAuthModalOpen(true);
    };

    const proceedDelete = (id) => {
        setUserToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (userToDelete) {
            try {
                await api.delete(`/users/${userToDelete}`);
                fetchUsers();
                setToast({ message: 'Usuario eliminado correctamente', type: 'success' });
            } catch (err) {
                console.error("Error deleting user", err);
                setToast({ message: 'Error al eliminar usuario', type: 'error' });
            }
        }
        setIsConfirmOpen(false);
    };

    const [filterRole, setFilterRole] = useState('all');

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            if (filterRole !== 'all' && u.rol !== filterRole) return false;

            return u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.rol.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [users, searchTerm, filterRole]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } }
    };

    const itemVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } }
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole]);

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
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
                    <p className="text-gray-500 text-sm mt-1">Administra el acceso y roles del sistema</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo Usuario
                </motion.button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-sm font-semibold text-gray-700">Lista de Usuarios</h2>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                            <Filter className="w-3 h-3 text-gray-400" />
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="text-sm border-none focus:ring-0 text-gray-600 bg-transparent p-0 pr-6 cursor-pointer"
                            >
                                <option value="all">Todos los roles</option>
                                <option value="Cliente">Cliente</option>
                                <option value="Mecanico">Mecánico</option>
                                <option value="Recepcionista">Recepcionista</option>
                                <option value="Administrador">Administrador</option>
                            </select>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar usuario..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                            />
                        </div>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                            {filteredUsers.length} usuarios
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha Registro</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence mode="wait">
                                {currentItems.map((user) => (
                                    <motion.tr
                                        key={user.id}
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="hidden"
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="p-2 bg-gray-100 rounded-full mr-3">
                                                    <User className="w-5 h-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{user.nombre}</div>
                                                    <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                                        <Mail className="w-3 h-3 mr-1" />
                                                        {user.correo}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${user.rol === 'Administrador' ? 'bg-purple-100 text-purple-800' :
                                                    user.rol === 'Mecanico' ? 'bg-blue-100 text-blue-800' :
                                                        user.rol === 'Recepcionista' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                <Shield className="w-3 h-3 mr-1" />
                                                {user.rol}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="bg-blue-50 text-blue-700 rounded-lg p-2 text-center min-w-[50px]">
                                                    <div className="text-xs font-bold uppercase">{user.fechaRegistro ? new Date(user.fechaRegistro).toLocaleDateString('es-ES', { month: 'short' }) : 'N/A'}</div>
                                                    <div className="text-lg font-bold leading-none">{user.fechaRegistro ? new Date(user.fechaRegistro).getDate() : '--'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleOpenModal(user)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDelete(user.id)}
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
                                    <button
                                        key={index}
                                        onClick={() => typeof number === 'number' && paginate(number)}
                                        disabled={number === '...'}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${number === currentPage
                                            ? 'bg-foton-blue text-white shadow-sm'
                                            : number === '...'
                                                ? 'text-gray-400 cursor-default'
                                                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {number}
                                    </button>
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
                title={currentUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                        <input
                            type="email"
                            value={formData.correo}
                            onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {currentUser ? 'Contraseña Actual (editar para cambiar)' : 'Contraseña'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue pr-10"
                                required={!currentUser}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue pr-10"
                                required={!currentUser || formData.password.length > 0}
                            />
                        </div>
                        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                        <select
                            value={formData.rol}
                            onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                        >
                            <option value="Cliente">Cliente</option>
                            <option value="Mecanico">Mecánico</option>
                            <option value="Recepcionista">Recepcionista</option>
                            <option value="Administrador">Administrador</option>
                        </select>
                    </div>

                    {formData.rol === 'Cliente' && (
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Buscar y Seleccionar Cliente
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Escribe para buscar cliente..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-foton-blue focus:border-foton-blue"
                                    onChange={(e) => {
                                        setClientSearch(e.target.value);
                                        setShowClientDropdown(true);
                                    }}
                                    onFocus={() => setShowClientDropdown(true)}
                                    value={clientSearch}
                                />
                            </div>

                            {showClientDropdown && clientSearch && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {clients.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase()))
                                        .slice(0, 10) // Limit to 10 results for performance
                                        .map(client => (
                                            <button
                                                key={client.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({
                                                        ...formData,
                                                        nombre: client.nombre,
                                                        correo: client.correo || ''
                                                    });
                                                    setClientSearch(client.nombre); // Set input to selected name
                                                    setShowClientDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex flex-col border-b border-gray-50 last:border-0"
                                            >
                                                <span className="font-medium text-gray-900">{client.nombre}</span>
                                                <span className="text-xs text-gray-500">{client.correo || 'Sin correo'}</span>
                                            </button>
                                        ))}
                                    {clients.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                        <div className="px-4 py-2 text-sm text-gray-500">No se encontraron clientes</div>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Escribe el nombre del cliente para buscar. Al seleccionar, se llenarán los datos.
                            </p>
                        </div>
                    )}
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
                </form>
            </Modal>
            <Modal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                title="Verificación de Seguridad"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Ingresa tu PIN de seguridad para continuar.
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
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Usuario"
                message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
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

export default Users;
