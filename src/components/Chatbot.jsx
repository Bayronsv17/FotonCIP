import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, Sparkles, User, Calendar, Wrench, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


/**
 * Componente de Chatbot.
 * Proporciona un asistente virtual para interactuar con el usuario.
 * @returns {JSX.Element} El componente del Chatbot.
 */
const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', type: 'welcome', content: '¡Hola! Soy el asistente virtual de **Foton**.\n\nEstoy aquí para ayudarte con:\n- Información de vehículos\n- Estatus de tus citas\n- Costos de servicios\n\n¿En qué puedo asistirte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const sendMessage = async (text) => {
        const userMessage = text;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await api.post('/chatbot/query', {
                message: userMessage
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input.trim());
    };

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-[90vw] sm:w-[450px] md:w-[600px] h-[70vh] sm:h-[600px] md:h-[750px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden ring-1 ring-black/5"
                    >
                        {/* Header Premium */}
                        <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 flex items-center justify-between text-white shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                    <Bot size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base tracking-wide">Asistente Foton</h3>
                                    <p className="text-[11px] text-blue-100 flex items-center gap-1.5 font-medium">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                                        </span>
                                        En línea y listo para ayudar
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-100 scroll-smooth">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.type === 'welcome' ? 'justify-center' : (msg.role === 'user' ? 'justify-end' : 'justify-start')}`}>
                                    {msg.type === 'welcome' ? (
                                        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-2">
                                            <div className="bg-blue-50 p-6 text-center border-b border-blue-100">
                                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <img src="/foton-logo-circle.png" alt="Foton" className="w-10 h-10 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn-icons-png.flaticon.com/512/4712/4712009.png' }} />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-800">¡Hola! Bienvenido a Foton</h3>
                                                <p className="text-sm text-gray-600 mt-1">Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?</p>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">Accesos Rápidos</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <button onClick={() => sendMessage('¿Cuáles son mis próximas citas?')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors border border-gray-100 group text-left">
                                                        <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                                                            <Calendar size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-700">Mis Citas</p>
                                                            <p className="text-xs text-gray-500">Consulta tus servicios agendados</p>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => sendMessage('Quiero agendar una nueva cita')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors border border-gray-100 group text-left">
                                                        <div className="bg-green-100 text-green-600 p-2 rounded-lg group-hover:bg-green-200 transition-colors">
                                                            <Wrench size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-700">Agendar Servicio</p>
                                                            <p className="text-xs text-gray-500">Programa un mantenimiento</p>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => sendMessage('Muestrame los vehículos disponibles')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors border border-gray-100 group text-left">
                                                        <div className="bg-orange-100 text-orange-600 p-2 rounded-lg group-hover:bg-orange-200 transition-colors">
                                                            <Truck size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-700">Ver Vehículos</p>
                                                            <p className="text-xs text-gray-500">Explora nuestro catálogo</p>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {/* Avatar */}
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white border border-gray-200 text-blue-600'
                                                }`}>
                                                {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                                            </div>

                                            {/* Bubble */}
                                            <div
                                                className={`max-w-[85%] p-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${msg.role === 'user'
                                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                                    : 'bg-white text-gray-800 rounded-tl-none'
                                                    }`}
                                            >
                                                {msg.role === 'assistant' ? (
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                            li: ({ node, ...props }) => <li className="" {...props} />,
                                                            strong: ({ node, ...props }) => <span className="font-bold text-gray-900" {...props} />,
                                                            table: ({ node, ...props }) => <div className="overflow-x-auto my-2 rounded-lg border border-gray-200 bg-white"><table className="min-w-full divide-y divide-gray-200 text-[11px]" {...props} /></div>,
                                                            thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
                                                            th: ({ node, ...props }) => <th className="px-2 py-2 text-left font-bold text-gray-600 uppercase tracking-wider" {...props} />,
                                                            tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
                                                            tr: ({ node, ...props }) => <tr className="hover:bg-gray-50 transition-colors" {...props} />,
                                                            td: ({ node, ...props }) => <td className="px-2 py-2 text-gray-700 align-top" {...props} />,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center shadow-sm">
                                        <Bot size={16} />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-3">
                                        <Loader2 size={18} className="animate-spin text-blue-600" />
                                        <span className="text-xs font-medium text-gray-500">Escribiendo...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe tu mensaje aquí..."
                                    className="flex-1 px-5 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                            <div className="text-center mt-2">
                                <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                                    <Sparkles size={10} />
                                    Potenciado por IA de Foton
                                </p>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CTA Tooltip */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        transition={{ delay: 1, duration: 0.3 }}
                        className="absolute bottom-20 right-0 mb-2 mr-2 bg-white px-4 py-3 rounded-2xl rounded-br-none shadow-xl border border-gray-100 w-64"
                    >
                        <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                <Bot size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">¿Necesitas ayuda?</p>
                                <p className="text-xs text-gray-500 mt-1">Estoy aquí para responder tus dudas sobre citas y vehículos.</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 rounded-full shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center group relative overflow-hidden z-50"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full"></div>
                {isOpen ? <X size={28} className="relative z-10" /> : <MessageCircle size={28} className="relative z-10 group-hover:animate-pulse" />}
            </motion.button>
        </div>
    );
};

export default Chatbot;
