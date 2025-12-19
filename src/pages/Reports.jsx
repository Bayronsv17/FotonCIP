import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { DollarSign, Users, Wrench, FileText, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays, startOfDay, endOfDay, isSameDay, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#0066B3', '#041A54', '#BC8602', '#5B9BD5', '#A5A5A5', '#FFC000'];

/**
 * Componente de Reportes y Estadísticas.
 * Muestra gráficos y métricas sobre ingresos, clientes, servicios y productividad.
 * Permite filtrar por periodo y exportar datos a CSV.
 * @returns {JSX.Element} El componente de Reportes.
 */
const Reports = () => {
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('month'); // 'month', '3months', 'year'
    const [rawData, setRawData] = useState({
        appointments: [],
        clients: [],
        logs: [],
        services: []
    });
    const [metrics, setMetrics] = useState({
        income: 0,
        incomeGrowth: 0,
        clients: 0,
        clientGrowth: 0,
        services: 0,
        completionRate: 0
    });
    const [chartData, setChartData] = useState([]);
    const [serviceData, setServiceData] = useState([]);
    const [productivityData, setProductivityData] = useState([]);
    const [activeTab, setActiveTab] = useState('general');
    const [exportData, setExportData] = useState([]);

    const handleExport = () => {
        if (!exportData.length) return;

        const headers = ['Fecha', 'Cliente', 'Servicio', 'Costo', 'Estado'];
        const csvContent = [
            headers.join(','),
            ...exportData.map(row => [
                row.fecha,
                `"${row.cliente}"`,
                `"${row.servicio}"`,
                row.costo,
                row.estado
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_financiero_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [apptsRes, clientsRes, logsRes, servicesRes] = await Promise.all([
                    api.get('/appointments'),
                    api.get('/clients'),
                    api.get('/bitacora?limit=1000'),
                    api.get('/services')
                ]);

                const appointments = apptsRes.data;
                const clients = clientsRes.data;
                const servicesList = servicesRes.data;
                const logs = Array.isArray(logsRes.data.logs) ? logsRes.data.logs : (Array.isArray(logsRes.data) ? logsRes.data : []);

                setRawData({ appointments, clients, logs, services: servicesList });
            } catch (err) {
                console.error("Error fetching report data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (loading || !rawData.appointments.length) return;

        const { appointments, clients, logs, services: servicesList } = rawData;
        const now = new Date();

        // Helper to get appointment cost
        const getAppointmentCost = (appt) => {
            const log = logs.find(l => String(l.id_cita) === String(appt.id));
            if (log && log.costo_final !== undefined && log.costo_final !== null) {
                return parseFloat(log.costo_final);
            }
            const service = servicesList.find(s => String(s.id) === String(appt.id_servicio));
            return service ? parseFloat(service.costo) : 0;
        };

        const completedAppts = appointments.filter(a => a.estado === 'Finalizada');

        // --- Process Chart Data based on Time Range ---
        let newChartData = [];
        let startDate, endDate;

        if (timeRange === 'month') {
            // Daily breakdown for current month
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);

            // Generate all days in the month
            let currentDate = startDate;
            while (currentDate <= endDate) {
                const dayStart = startOfDay(currentDate);
                const dayEnd = endOfDay(currentDate);

                const dayAppts = completedAppts.filter(a => isWithinInterval(parseISO(a.fecha), { start: dayStart, end: dayEnd }));
                const income = dayAppts.reduce((sum, a) => sum + getAppointmentCost(a), 0);

                newChartData.push({
                    name: format(currentDate, 'd'),
                    fullDate: format(currentDate, 'dd MMM'),
                    ingresos: income,
                    servicios: dayAppts.length
                });
                currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
            }

        } else if (timeRange === '3months') {
            // Monthly breakdown for last 3 months
            for (let i = 2; i >= 0; i--) {
                const date = subMonths(now, i);
                const monthStart = startOfMonth(date);
                const monthEnd = endOfMonth(date);

                const monthAppts = completedAppts.filter(a => isWithinInterval(parseISO(a.fecha), { start: monthStart, end: monthEnd }));
                const income = monthAppts.reduce((sum, a) => sum + getAppointmentCost(a), 0);

                newChartData.push({
                    name: format(date, 'MMM', { locale: es }),
                    ingresos: income,
                    servicios: monthAppts.length
                });
            }
        } else if (timeRange === 'year') {
            // Monthly breakdown for last 12 months (or current year)
            // Let's do current year as requested "Este Año" usually means Jan-Dec
            // But "Último Año" might mean last 12 months. The dropdown says "Este Año".
            // I'll do Jan to Dec of current year.
            for (let i = 0; i < 12; i++) {
                const date = new Date(now.getFullYear(), i, 1);
                if (date > now) break; // Don't show future months if strictly current year up to now? Or show empty?
                // Usually "Este Año" shows all months or up to current. Let's show all 12 to keep x-axis consistent or just up to now.
                // Let's show all 12 months of the current year.

                const monthStart = startOfMonth(date);
                const monthEnd = endOfMonth(date);

                const monthAppts = completedAppts.filter(a => isWithinInterval(parseISO(a.fecha), { start: monthStart, end: monthEnd }));
                const income = monthAppts.reduce((sum, a) => sum + getAppointmentCost(a), 0);

                newChartData.push({
                    name: format(date, 'MMM', { locale: es }),
                    ingresos: income,
                    servicios: monthAppts.length
                });
            }
        }

        setChartData(newChartData);

        // --- Update Metrics based on Time Range (Optional, but good for consistency) ---
        // For now, I'll keep the metrics as "Current Month" vs "Last Month" as that's standard,
        // unless the user specifically wants the cards to sum up the selected range.
        // The user request focused on "graficas". I'll leave metrics as is for now to avoid confusion,
        // or I can update them to reflect the total of the chart.
        // Let's update the "Ingresos Totales" and "Servicios Realizados" to match the chart sum.

        const totalIncomeInRange = newChartData.reduce((sum, item) => sum + item.ingresos, 0);
        const totalServicesInRange = newChartData.reduce((sum, item) => sum + item.servicios, 0);

        // Calculate growth (vs previous equivalent period) - simplified for now, just keeping the original monthly comparison logic
        // or just showing the totals for the selected view.
        // I will stick to the original metrics logic (Current Month) for the top cards to ensure stability,
        // as changing them might confuse "vs mes anterior".
        // However, I will update the state to ensure they are calculated correctly on load.

        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const currentMonthIncome = completedAppts
            .filter(a => isWithinInterval(parseISO(a.fecha), { start: currentMonthStart, end: currentMonthEnd }))
            .reduce((sum, a) => sum + getAppointmentCost(a), 0);

        const lastMonthIncome = completedAppts
            .filter(a => isWithinInterval(parseISO(a.fecha), { start: lastMonthStart, end: lastMonthEnd }))
            .reduce((sum, a) => sum + getAppointmentCost(a), 0);

        const incomeGrowth = lastMonthIncome === 0 ? 100 : ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100;
        const currentClients = clients.length;
        const totalServices = completedAppts.length; // Total all time? Or in range? Original was total completed.
        const totalAppts = appointments.length;
        const completionRate = totalAppts === 0 ? 0 : (completedAppts.length / totalAppts) * 100;

        setMetrics({
            income: currentMonthIncome, // Keep as current month income
            incomeGrowth,
            clients: currentClients,
            clientGrowth: 0,
            services: totalServices, // Keep as total services
            completionRate
        });


        // --- Process Service Data (Pie Chart) - Filtered by Time Range? ---
        // Usually pie charts reflect the same filter.
        // Let's filter the appointments used for the pie chart based on the selected range.

        let filteredApptsForPie = [];
        if (timeRange === 'month') {
            filteredApptsForPie = completedAppts.filter(a => isWithinInterval(parseISO(a.fecha), { start: startOfMonth(now), end: endOfMonth(now) }));
        } else if (timeRange === '3months') {
            filteredApptsForPie = completedAppts.filter(a => isWithinInterval(parseISO(a.fecha), { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }));
        } else {
            filteredApptsForPie = completedAppts.filter(a => isWithinInterval(parseISO(a.fecha), { start: startOfYear(now), end: endOfYear(now) }));
        }

        // If no data in range, maybe fallback or show empty?
        // Let's use the filtered list.
        const serviceCounts = {};
        filteredApptsForPie.forEach(a => {
            const serviceName = servicesList.find(s => s.id === a.id_servicio)?.nombre || 'Desconocido';
            serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
        });

        const pieData = Object.entries(serviceCounts).map(([name, value]) => ({ name, value }));
        setServiceData(pieData);

        // --- Process Productivity Data based on Time Range ---
        let newProductivityData = [];

        if (timeRange === 'month') {
            // Daily breakdown for current month
            let currentDate = startOfMonth(now);
            const endDate = endOfMonth(now);

            while (currentDate <= endDate) {
                const dayStart = startOfDay(currentDate);
                const dayEnd = endOfDay(currentDate);

                const scheduled = appointments.filter(a => isWithinInterval(parseISO(a.fecha), { start: dayStart, end: dayEnd })).length;
                const completed = completedAppts.filter(a => isWithinInterval(parseISO(a.fecha), { start: dayStart, end: dayEnd })).length;

                newProductivityData.push({
                    name: format(currentDate, 'd'),
                    fullDate: format(currentDate, 'dd MMM'),
                    programadas: scheduled,
                    completadas: completed
                });
                currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
            }
        } else if (timeRange === '3months') {
            // Monthly breakdown for last 3 months
            for (let i = 2; i >= 0; i--) {
                const date = subMonths(now, i);
                const monthStart = startOfMonth(date);
                const monthEnd = endOfMonth(date);

                const scheduled = appointments.filter(a => isWithinInterval(parseISO(a.fecha), { start: monthStart, end: monthEnd })).length;
                const completed = completedAppts.filter(a => isWithinInterval(parseISO(a.fecha), { start: monthStart, end: monthEnd })).length;

                newProductivityData.push({
                    name: format(date, 'MMM', { locale: es }),
                    programadas: scheduled,
                    completadas: completed
                });
            }
        } else if (timeRange === 'year') {
            // Monthly breakdown for current year
            for (let i = 0; i < 12; i++) {
                const date = new Date(now.getFullYear(), i, 1);
                if (date > now) break;

                const monthStart = startOfMonth(date);
                const monthEnd = endOfMonth(date);

                const scheduled = appointments.filter(a => isWithinInterval(parseISO(a.fecha), { start: monthStart, end: monthEnd })).length;
                const completed = completedAppts.filter(a => isWithinInterval(parseISO(a.fecha), { start: monthStart, end: monthEnd })).length;

                newProductivityData.push({
                    name: format(date, 'MMM', { locale: es }),
                    programadas: scheduled,
                    completadas: completed
                });
            }
        }

        setProductivityData(newProductivityData);

        // --- Export Data ---
        const exportRows = appointments.map(a => {
            const client = clients.find(c => c.id === a.id_cliente);
            const service = servicesList.find(s => s.id === a.id_servicio);
            const cost = getAppointmentCost(a);
            return {
                fecha: format(parseISO(a.fecha), 'yyyy-MM-dd HH:mm'),
                cliente: client ? client.nombre : 'N/A',
                servicio: service ? service.nombre : 'N/A',
                costo: cost,
                estado: a.estado
            };
        });
        setExportData(exportRows);

    }, [rawData, timeRange]);

    const renderContent = () => {
        switch (activeTab) {
            case 'ingresos':
                return (
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`$${value}`, 'Ingresos']} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#0066B3" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'servicios':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Chart Section */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                            <h3 className="text-base font-bold text-gray-800 mb-6 self-start w-full">Distribución de Servicios</h3>
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={serviceData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={true}
                                        >
                                            {serviceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            formatter={(value) => [value, 'Cantidad']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Ranking Section */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[400px] overflow-y-auto">
                            <h3 className="text-base font-bold text-gray-800 mb-6">Ranking de Servicios</h3>
                            <div className="space-y-6">
                                {serviceData.map((item, index) => {
                                    const percentage = ((item.value / metrics.services) * 100).toFixed(1);
                                    return (
                                        <div key={index} className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm font-semibold text-gray-700">{item.name}</span>
                                                <div className="text-right">
                                                    <span className="text-sm font-bold text-gray-900">{item.value}</span>
                                                    <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className="h-2.5 rounded-full transition-all duration-500 ease-out"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: COLORS[index % COLORS.length]
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {serviceData.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <Wrench className="w-12 h-12 mb-2 opacity-20" />
                                        <p>No hay datos de servicios finalizados.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'productividad':
                return (
                    <div className="h-80 w-full">
                        <h3 className="text-sm font-semibold text-gray-600 mb-4">Tendencia de Productividad</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={productivityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line type="monotone" dataKey="programadas" name="Citas Programadas" stroke="#0066B3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="completadas" name="Citas Completadas" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'general':
            default:
                return (
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value, name) => [name === 'Ingresos' ? `$${value}` : value, name]}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar yAxisId="left" dataKey="ingresos" name="Ingresos" fill="#0066B3" radius={[4, 4, 0, 0]} barSize={30} />
                                <Bar yAxisId="right" dataKey="servicios" name="Servicios (Cant.)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Panel de Reportes</h1>
                    <p className="text-gray-500 text-sm mt-1">Análisis y métricas del negocio</p>
                </div>
                <div className="flex space-x-3">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    >
                        <option value="month">Este Mes</option>
                        <option value="3months">Últimos 3 meses</option>
                        <option value="year">Este Año</option>
                    </select>
                    <button
                        onClick={handleExport}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Ingresos Totales</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">${metrics.income.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <div className="flex items-center text-sm">
                        {metrics.incomeGrowth >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        )}
                        <span className={`font-medium mr-2 ${metrics.incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metrics.incomeGrowth > 0 ? '+' : ''}{metrics.incomeGrowth.toFixed(1)}%
                        </span>
                        <span className="text-gray-400">vs mes anterior</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Total Clientes</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{metrics.clients}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="flex items-center text-sm">
                        {metrics.clientGrowth >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        )}
                        <span className={`font-medium mr-2 ${metrics.clientGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metrics.clientGrowth > 0 ? '+' : ''}{metrics.clientGrowth.toFixed(1)}%
                        </span>
                        <span className="text-gray-400">vs mes anterior</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Servicios Realizados</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{metrics.services}</h3>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Wrench className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <div className="flex items-center text-sm">
                        <span className="text-gray-400">Total acumulado</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Tasa de Finalización</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{metrics.completionRate.toFixed(1)}%</h3>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <FileText className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <div className="flex items-center text-sm">
                        <span className="text-gray-400">Rendimiento global</span>
                    </div>
                </div>
            </div>

            {/* Tabs & Charts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-800">
                        {activeTab === 'general' && 'Análisis General'}
                        {activeTab === 'ingresos' && 'Evolución de Ingresos'}
                        {activeTab === 'servicios' && 'Desglose de Servicios'}
                        {activeTab === 'productividad' && 'Productividad Semanal'}
                    </h2>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {['Resumen General', 'Ingresos', 'Servicios', 'Productividad'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase() === 'resumen general' ? 'general' : tab.toLowerCase())}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === (tab.toLowerCase() === 'resumen general' ? 'general' : tab.toLowerCase())
                                    ? 'bg-foton-blue text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {renderContent()}
            </div>
        </div>
    );
};

export default Reports;
