import React, { useState, useMemo } from 'react';
import { Client, Appointment, ServiceType, AppStatus, Staff } from '../types';
import { format, addDays, isFuture, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    ArrowLeft, Edit2, Plus, Users, Receipt, BarChart2, Calendar, AlertTriangle, User, Clock, Search, ArrowUp, ArrowDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;


interface ServiceDetailPageProps {
    service: ServiceType;
    clients: Client[];
    appointments: Appointment[];
    services: ServiceType[];
    statuses: AppStatus[];
    staff: Staff[];
    onBack: () => void;
    onViewClient: (clientId: string) => void;
    onSchedule: (context: { clientId: string; serviceTypeId: string; recommendedDate: Date }) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

const isBillable = (statusId: string, allStatuses: AppStatus[]) => allStatuses.find(s => s.id === statusId)?.isBillable || false;

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
    service,
    clients,
    appointments,
    statuses,
    staff,
    onBack,
    onViewClient,
    onSchedule
}) => {
    const [clientFilter, setClientFilter] = useState<'active' | 'finished'>('active');

    const serviceAppointments = useMemo(() => {
        return appointments.filter(apt => apt.serviceTypeId === service.id);
    }, [appointments, service.id]);

    const stats = useMemo(() => {
        const billableApts = serviceAppointments.filter(apt => isBillable(apt.statusId, statuses));
        const totalRevenue = billableApts.reduce((sum, apt) => sum + apt.price, 0);
        const uniqueClients = new Set(billableApts.map(apt => apt.clientId));
        
        return {
            totalRevenue,
            totalAppointments: billableApts.length,
            uniqueClientsCount: uniqueClients.size,
        };
    }, [serviceAppointments, statuses]);
    
    const staffPerformance = useMemo(() => {
        const performance: Record<string, { staff: Staff, revenue: number }> = {};
        serviceAppointments.forEach(apt => {
            if (apt.staffId && isBillable(apt.statusId, statuses)) {
                if (!performance[apt.staffId]) {
                    const staffMember = staff.find(s => s.id === apt.staffId);
                    if (staffMember) {
                        performance[apt.staffId] = { staff: staffMember, revenue: 0 };
                    }
                }
                if (performance[apt.staffId]) {
                    performance[apt.staffId].revenue += apt.price;
                }
            }
        });
        return Object.values(performance).filter(p => p.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    }, [serviceAppointments, staff, statuses]);

    const clientsWithService = useMemo(() => {
        const clientData = new Map<string, {
            client: Client;
            lastVisit: Date | null;
            nextVisit: Date | null;
            recommendedVisit: Date | null;
        }>();

        serviceAppointments.forEach(apt => {
            const client = clients.find(c => c.id === apt.clientId);
            if (!client) return;

            if (!clientData.has(client.id)) {
                clientData.set(client.id, { client, lastVisit: null, nextVisit: null, recommendedVisit: null });
            }

            const data = clientData.get(client.id)!;
            const aptDate = new Date(apt.date);

            // Set last visit
            if (isBillable(apt.statusId, statuses) && (!data.lastVisit || aptDate > data.lastVisit)) {
                data.lastVisit = aptDate;
            }

            // Set next visit
            if ((isFuture(aptDate) || isSameDay(aptDate, new Date())) && (!data.nextVisit || aptDate < data.nextVisit)) {
                data.nextVisit = aptDate;
            }
        });
        
        clientData.forEach(data => {
            if (data.lastVisit && !data.nextVisit && service.recurrenceDays > 0) {
                data.recommendedVisit = addDays(data.lastVisit, service.recurrenceDays);
            }
        });

        return Array.from(clientData.values()).sort((a, b) => (b.lastVisit?.getTime() || 0) - (a.lastVisit?.getTime() || 0));
    }, [serviceAppointments, clients, statuses, service.recurrenceDays]);
    
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastVisit', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredClients = useMemo(() => {
        let result = clientsWithService.filter(data => {
            const isFinished = data.client.finishedTreatments?.includes(service.id);
            return clientFilter === 'active' ? !isFinished : isFinished;
        });

        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(d => 
                d.client.name.toLowerCase().includes(lowerSearch) ||
                (d.client.email && d.client.email.toLowerCase().includes(lowerSearch))
            );
        }

        if (sortConfig) {
            result.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (sortConfig.key) {
                    case 'name': aValue = a.client.name; bValue = b.client.name; break;
                    case 'lastVisit': 
                        aValue = a.lastVisit ? a.lastVisit.getTime() : 0;
                        bValue = b.lastVisit ? b.lastVisit.getTime() : 0;
                        break;
                    case 'nextVisit':
                        const aDate = a.nextVisit || a.recommendedVisit;
                        const bDate = b.nextVisit || b.recommendedVisit;
                        aValue = aDate ? aDate.getTime() : Infinity;
                        bValue = bDate ? bDate.getTime() : Infinity;
                        break;
                    default: return 0;
                }

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0;
            });
        }

        return result;
    }, [clientsWithService, clientFilter, service.id, search, sortConfig]);

    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };


    return (
        <div className="flex flex-col h-full pb-20 animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <button onClick={onBack} className="flex items-center text-teal-600 dark:text-teal-400 hover:underline text-sm font-medium">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Tratamientos
                </button>
            </div>

            {/* Service Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                     <span className={`px-4 py-1.5 rounded-full text-lg font-bold ${service.color}`}>
                        {service.name}
                    </span>
                    <div className="flex items-center gap-6 mt-4 md:mt-0 text-sm text-gray-600 dark:text-gray-400">
                        <span><strong>Precio Base:</strong> {formatCurrency(service.defaultPrice)}</span>
                        <span><strong>Duración:</strong> {service.defaultDuration} min</span>
                        <span><strong>Recurrencia:</strong> {service.recurrenceDays} días</span>
                    </div>
                </div>
            </div>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Receipt className="w-3 h-3 mr-1"/> Ingresos Totales</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><BarChart2 className="w-3 h-3 mr-1"/> Citas Realizadas</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalAppointments}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Users className="w-3 h-3 mr-1"/> Clientes Únicos</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.uniqueClientsCount}</div>
                </div>
            </div>

             {/* Chart: Revenue by Staff */}
            {staffPerformance.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Ingresos por Especialista</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={staffPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="staff.name" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                                <Tooltip formatter={(value: number) => [formatCurrency(value), "Ingresos"]} />
                                <Bar dataKey="revenue" name="Ingresos" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Client List Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/30 dark:bg-gray-800/30">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto shrink-0">
                        {/* Legend */}
                        <div className="flex items-center gap-4 text-[10px] text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>Cita Programada</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>Cita Recomendada</span>
                            </div>
                        </div>

                        {/* Filter */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg shrink-0">
                            <button 
                                onClick={() => setClientFilter('active')}
                                className={`px-3 py-1 text-xs rounded-md transition-all w-full sm:w-auto ${clientFilter === 'active' ? 'bg-white dark:bg-gray-600 shadow text-teal-600 dark:text-teal-300 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                                Activos
                            </button>
                            <button 
                                onClick={() => setClientFilter('finished')}
                                className={`px-3 py-1 text-xs rounded-md transition-all w-full sm:w-auto ${clientFilter === 'finished' ? 'bg-white dark:bg-gray-600 shadow text-teal-600 dark:text-teal-300 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                                Finalizados
                            </button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('name')}>
                                    <div className="flex items-center">Cliente {getSortIndicator('name')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('lastVisit')}>
                                    <div className="flex items-center">Última Visita {getSortIndicator('lastVisit')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('nextVisit')}>
                                    <div className="flex items-center">Próxima / Recomendada {getSortIndicator('nextVisit')}</div>
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Acciones</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {currentClients.map(({ client, lastVisit, nextVisit, recommendedVisit }) => (
                                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => onViewClient(client.id)} className="text-sm font-medium text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 text-left">
                                            {client.name}
                                            <span className="block text-xs text-gray-500 font-normal">{client.email}</span>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                        {lastVisit ? format(lastVisit, 'dd MMM yyyy', { locale: es }) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {nextVisit ? (
                                            <span className="font-semibold text-gray-800 dark:text-white flex items-center">
                                                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                                {format(nextVisit, 'dd MMM yyyy', { locale: es })}
                                            </span>
                                        ) : recommendedVisit ? (
                                            <span className={`flex items-center ${isFuture(recommendedVisit) ? 'text-gray-600 dark:text-gray-400' : 'text-red-600 font-semibold'}`}>
                                                <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                                                {format(recommendedVisit, 'dd MMM yyyy', { locale: es })}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button 
                                            onClick={() => onSchedule({ clientId: client.id, serviceTypeId: service.id, recommendedDate: recommendedVisit || new Date() })}
                                            className="px-3 py-1.5 bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 rounded-md hover:bg-teal-200 dark:hover:bg-teal-900/60 text-xs font-medium flex items-center float-right"
                                            title="Agendar nueva cita para este tratamiento"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Agendar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {currentClients.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No hay clientes en esta categoría.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, filteredClients.length)}</span> de <span className="font-medium">{filteredClients.length}</span>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Anterior</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Siguiente</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};