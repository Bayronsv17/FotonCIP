import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { lazy, Suspense } from 'react';

// Lazy load components
const Chatbot = lazy(() => import('./components/Chatbot'));
const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Services = lazy(() => import('./pages/Services'));
const Technician = lazy(() => import('./pages/Technician'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const ServiceHistory = lazy(() => import('./pages/ServiceHistory'));
const Users = lazy(() => import('./pages/Users'));
const ServiceLogs = lazy(() => import('./pages/ServiceLogs'));
const SpareParts = lazy(() => import('./pages/SpareParts'));
const Reports = lazy(() => import('./pages/Reports'));
const NotFound = lazy(() => import('./pages/NotFound'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foton-blue"></div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    if (user.rol === 'Cliente') return <Navigate to="/portal" />;
    if (user.rol === 'Mecanico') return <Navigate to="/technician" />;
    return <Navigate to="/" />;
  }

  return children;
};

const AppContent = () => {
  const location = useLocation();
  const showChatbot = location.pathname.startsWith('/portal');

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={
              <ProtectedRoute allowedRoles={['Administrador', 'Recepcionista']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="portal" element={
              <ProtectedRoute allowedRoles={['Cliente']}>
                <ClientPortal />
              </ProtectedRoute>
            } />
            <Route path="portal/history" element={
              <ProtectedRoute allowedRoles={['Cliente']}>
                <ServiceHistory />
              </ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute allowedRoles={['Administrador']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="clients" element={
              <ProtectedRoute allowedRoles={['Administrador', 'Recepcionista']}>
                <Clients />
              </ProtectedRoute>
            } />
            <Route path="vehicles" element={
              <ProtectedRoute allowedRoles={['Administrador', 'Recepcionista']}>
                <Vehicles />
              </ProtectedRoute>
            } />
            <Route path="appointments" element={
              <ProtectedRoute allowedRoles={['Administrador', 'Recepcionista']}>
                <Appointments />
              </ProtectedRoute>
            } />
            <Route path="services" element={
              <ProtectedRoute allowedRoles={['Administrador', 'Recepcionista']}>
                <Services />
              </ProtectedRoute>
            } />
            <Route path="technician" element={
              <ProtectedRoute allowedRoles={['Mecanico']}>
                <Technician />
              </ProtectedRoute>
            } />
            <Route path="spare-parts" element={
              <ProtectedRoute allowedRoles={['Administrador', 'Recepcionista']}>
                <SpareParts />
              </ProtectedRoute>
            } />
            <Route path="service-logs" element={
              <ProtectedRoute allowedRoles={['Administrador', 'Recepcionista', 'Mecanico']}>
                <ServiceLogs />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute allowedRoles={['Administrador']}>
                <Reports />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {showChatbot && (
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
