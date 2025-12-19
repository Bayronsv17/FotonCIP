import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Componente de notificación tipo Toast.
 * Muestra mensajes temporales de éxito, error, advertencia o información.
 * @param {Object} props - Las propiedades del componente.
 * @param {string} props.message - El mensaje a mostrar.
 * @param {string} [props.type='success'] - El tipo de notificación ('success', 'error', 'warning', 'info').
 * @param {Function} props.onClose - Función que se ejecuta al cerrar el toast.
 * @param {number} [props.duration=3000] - La duración en milisegundos antes de que el toast se cierre automáticamente.
 * @returns {JSX.Element} El componente Toast.
 */
const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [message, duration, onClose]);

    const variants = {
        hidden: { y: -20, opacity: 0, scale: 0.9 },
        visible: { y: 0, opacity: 1, scale: 1 },
        exit: { y: -20, opacity: 0, scale: 0.9 }
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <XCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        info: <AlertCircle className="w-5 h-5 text-blue-500" />
    };

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={variants}
                    className={`fixed top-5 right-5 z-[60] flex items-center p-4 rounded-lg shadow-lg border ${bgColors[type]} min-w-[300px]`}
                >
                    <div className="mr-3">{icons[type]}</div>
                    <div className="flex-1 font-medium text-sm">{message}</div>
                    <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
