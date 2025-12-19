import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-100 rounded-full">
                        <AlertTriangle className="w-12 h-12 text-red-600" />
                    </div>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Página no encontrada</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Lo sentimos, la página que estás buscando no existe o ha sido movida.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-foton-blue hover:bg-blue-800 transition-colors shadow-sm"
                >
                    <Home className="w-5 h-5 mr-2" />
                    Volver al Inicio
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
