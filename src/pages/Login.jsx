import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import loginBg from '../assets/login-bg-2.jpg';
import loginBg4 from '../assets/login-bg-4.png';

const backgroundImages = [loginBg, loginBg4];

/**
 * Componente de inicio de sesión.
 * Maneja la autenticación del usuario y muestra un carrusel de imágenes de fondo.
 * @returns {JSX.Element} El componente de Login.
 */
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setInfo('');
        try {
            const userData = await login(email, password);
            if (userData.rol === 'Cliente') {
                navigate('/portal');
            } else if (userData.rol === 'Mecanico') {
                navigate('/technician');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('Credenciales inválidas. Verifique sus datos.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        setInfo('Para recuperar su contraseña o solicitar acceso, por favor comuníquese con el soporte de la empresa.');
        setError('');
    };

    return (
        <div className="min-h-screen flex bg-gray-50 overflow-hidden">
            {/* Left Side - Image & Branding */}
            <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="hidden lg:flex lg:w-[65%] relative bg-gray-900 text-white overflow-hidden"
            >
                <div className="absolute inset-0">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={currentImageIndex}
                            src={backgroundImages[currentImageIndex]}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                            alt="Foton Fleet"
                            className="w-full h-full object-cover absolute inset-0 scale-105"
                        />
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-blue-900/40 to-transparent"></div>
                </div>

                <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col justify-end h-full w-full">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                    >
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight tracking-tight">
                            Potenciando la <br />
                            <span className="text-blue-400">Logística del Futuro</span>
                        </h2>
                        <p className="text-base md:text-lg text-gray-300 max-w-md leading-relaxed">
                            Plataforma exclusiva para el control y mantenimiento de flotas de Camiones Innovadores del Pacífico.
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-[35%] flex items-center justify-center p-4 sm:p-6 relative bg-[#F3F4F6]">
                {/* Subtle Pattern Background */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4B5563 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="max-w-md w-full bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 lg:p-10 z-10 border border-gray-100 relative"
                >
                    <div className="text-center mb-6 sm:mb-8">
                        <img
                            src="/logo.png"
                            alt="CIP Logo"
                            className="h-12 sm:h-14 md:h-16 w-auto mx-auto mb-4 sm:mb-6 object-contain"
                        />
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Bienvenido de nuevo</h2>
                        <p className="text-gray-500 mt-2 text-sm sm:text-base">Ingrese sus credenciales para acceder al sistema</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl mb-6 text-sm flex items-start sm:items-center"
                        >
                            <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    {info && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="bg-blue-50 border border-blue-100 text-blue-600 p-3 rounded-xl mb-6 text-sm flex items-start sm:items-center"
                        >
                            <Info className="mr-2 h-5 w-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                            <span>{info}</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Correo Electrónico</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-foton-blue transition-colors duration-300" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-foton-blue/20 focus:border-foton-blue transition-all outline-none text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                                    placeholder="ejemplo@empresa.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-foton-blue transition-colors duration-300" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-foton-blue/20 focus:border-foton-blue transition-all outline-none text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pt-1">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-foton-blue focus:ring-foton-blue border-gray-300 rounded cursor-pointer"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer select-none">
                                    Recordarme
                                </label>
                            </div>

                            <div className="text-sm">
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="font-medium text-foton-blue hover:text-blue-700 transition-colors focus:outline-none"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01, translateY: -1 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-900/10 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foton-blue transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Ingresar al Sistema
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-50 text-center">
                        <p className="text-xs text-gray-400">
                            &copy; {new Date().getFullYear()} Camiones Innovadores del Pacífico. <br />Sistema de Control v2.0
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
