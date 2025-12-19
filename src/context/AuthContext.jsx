import { createContext, useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';

const AuthContext = createContext();

/**
 * Componente AuthProvider que gestiona el estado de autenticación del usuario y los tiempos de espera de la sesión.
 * @param {Object} props - Las propiedades del componente.
 * @param {React.ReactNode} props.children - Los componentes hijos.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const idleTimerRef = useRef(null);

    // 5 minutos en milisegundos
    const TIMEOUT_DURATION = 5 * 60 * 1000;

    /**
     * Reinicia el temporizador de inactividad. Si el usuario está inactivo por TIMEOUT_DURATION, se muestra el modal de sesión.
     */
    const resetTimer = () => {
        if (showSessionModal) return;
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

        idleTimerRef.current = setTimeout(() => {
            if (user) {
                setShowSessionModal(true);
            }
        }, TIMEOUT_DURATION);
    };

    /**
     * Configura los escuchas de eventos para detectar la actividad del usuario y reiniciar el temporizador.
     * @returns {Function} Función de limpieza para eliminar los escuchas de eventos.
     */
    const setupActivityListeners = () => {
        const events = ['mousemove', 'keydown', 'click', 'scroll'];
        const handleActivity = () => resetTimer();

        events.forEach(event => window.addEventListener(event, handleActivity));
        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    };

    useEffect(() => {
        /**
         * Verifica si el usuario está autenticado comprobando el token en el almacenamiento local.
         */
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                    localStorage.setItem('user', JSON.stringify(res.data));
                } catch (error) {
                    console.error("Fallo en la verificación de autenticación", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    useEffect(() => {
        if (user) {
            resetTimer();
            const cleanup = setupActivityListeners();
            return () => {
                cleanup();
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            };
        }
    }, [user, showSessionModal]);

    /**
     * Inicia sesión del usuario con correo y contraseña.
     * @param {string} email - El correo del usuario.
     * @param {string} password - La contraseña del usuario.
     * @returns {Promise<Object>} El objeto de usuario autenticado.
     */
    const login = async (email, password) => {
        const res = await api.post('/auth/login', { correo: email, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        return user;
    };

    /**
     * Cierra la sesión del usuario y limpia la sesión.
     */
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setShowSessionModal(false);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };

    /**
     * Actualiza el estado del usuario y el almacenamiento local.
     * @param {Object} userData - Los nuevos datos del usuario.
     */
    const updateUser = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    /**
     * Continúa la sesión y reinicia el temporizador de inactividad.
     */
    const handleContinueSession = () => {
        setShowSessionModal(false);
        resetTimer();
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
            {children}
            <Modal
                isOpen={showSessionModal}
                onClose={() => { }} // Prevenir cierre vía backdrop/X sin elección
                title="Sesión Inactiva"
            >
                <div className="text-center">
                    <p className="mb-6 text-gray-600 font-medium">
                        ¿Estás seguro que quieres seguir con la sesión?
                    </p>
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={logout}
                            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                        >
                            Cerrar Sesión
                        </button>
                        <button
                            onClick={handleContinueSession}
                            className="px-6 py-2 text-white bg-foton-blue rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-md"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
