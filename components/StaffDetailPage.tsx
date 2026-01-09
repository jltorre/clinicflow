import React, { useState, useMemo } from 'react';
import { Staff, Appointment, ServiceType, AppStatus, Client } from '../types';
import { format, isFuture, isSameDay, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    ArrowLeft, Edit2, Plus, Users, Receipt, BarChart2, Calendar as CalendarIcon, 
    AlertTriangle, User, Clock, DollarSign, Briefcase, Wallet, TrendingUp, History, Percent, Target
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


interface StaffDetailPageProps {
    staffMember: Staff;
    appointments: Appointment[];
    services: ServiceType[];
    statuses: AppStatus[];
    clients: Client[];
    onBack: () => void;
    onEditStaff: (staff: Staff) => void;
    onOpenAptModal: (apt?: Appointment, date?: Date, time?: string, options?: { clientId?: string; serviceTypeId?: string }) => void;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

const isBillable = (statusId: string, allStatuses: AppStatus[]) => allStatuses.find(s => s.id === statusId)?.isBillable || false;

export const StaffDetailPage: React.FC<StaffDetailPageProps> = ({
    staffMember,
    appointments,
    services,
    statuses,
    clients,
    onBack,
    onEditStaff,
    onOpenAptModal
}) => {
    const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'history'>('upcoming');
    const [serviceFilter, setServiceFilter] = useState<string>('all');
    const [breakdownSort, setBreakdownSort] = useState<SortConfig>({ key: 'profit', direction: 'desc' });


    const staffAppointments = useMemo(() => {
        return appointments
            .filter(apt => apt.staffId === staffMember.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments, staffMember.id]);

    const stats = useMemo(() => {
        let realizedRevenue = 0, scheduledRevenue = 0;
        let realizedCost = 0, scheduledCost = 0;
        let realizedHours = 0, scheduledHours = 0;
        let realizedCount = 0, scheduledCount = 0;

        staffAppointments.forEach(apt => {
            const aptDate = new Date(apt.date);
            const status = statuses.find(s => s.id === apt.statusId);
            if (!status || status.name.toLowerCase().includes('cancel')) return;

            const hours = apt.durationMinutes / 60;
            const hourlyRate = staffMember.rates?.[apt.serviceTypeId] ?? staffMember.defaultRate;
            const cost = hours * hourlyRate;
            
            if (isBillable(apt.statusId, statuses)) { // Considered realized
                realizedRevenue += apt.price;
                realizedCost += cost;
                realizedHours += hours;
                realizedCount++;
            } else if (isFuture(aptDate) || isSameDay(aptDate, new Date())) { // Considered scheduled
                scheduledRevenue += apt.price;
                scheduledCost += cost;
                scheduledHours += hours;
                scheduledCount++;
            }
        });

        const realizedProfit = realizedRevenue - realizedCost;

        return {
            realizedRevenue, scheduledRevenue,
            realizedCost, scheduledCost,
            realizedProfit,
            scheduledProfit: scheduledRevenue - scheduledCost,
            realizedHours: Number(realizedHours.toFixed(1)),
            scheduledHours: Number(scheduledHours.toFixed(1)),
            realizedCount, scheduledCount,
            avgProfitPerSession: realizedCount > 0 ? realizedProfit / realizedCount : 0,
            avgTimePerSession: realizedCount > 0 ? (realizedHours * 60) / realizedCount : 0 // in minutes
        };
    }, [staffAppointments, statuses, staffMember]);

    const today = new Date();
    const upcomingAppointments = staffAppointments
        .filter(apt => (isFuture(new Date(apt.date)) || isSameDay(new Date(apt.date), today)) && (serviceFilter === 'all' || apt.serviceTypeId === serviceFilter))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const pastAppointments = staffAppointments
        .filter(apt => isPast(new Date(apt.date)) && !isSameDay(new Date(apt.date), today) && (serviceFilter === 'all' || apt.serviceTypeId === serviceFilter));

    const treatmentBreakdown = useMemo(() => {
        const breakdown: Record<string, { service: ServiceType, revenue: number, cost: number, profit: number, hours: number, count: number }> = {};
        
        staffAppointments.forEach(apt => {
            if (isBillable(apt.statusId, statuses)) {
                if (!breakdown[apt.serviceTypeId]) {
                    const service = services.find(s => s.id === apt.serviceTypeId);
                    if (service) {
                        breakdown[apt.serviceTypeId] = { service, revenue: 0, cost: 0, profit: 0, hours: 0, count: 0 };
                    }
                }
                if (breakdown[apt.serviceTypeId]) {
                    const hours = apt.durationMinutes / 60;
                    const rate = staffMember.rates?.[apt.serviceTypeId] ?? staffMember.defaultRate;
                    const cost = hours * rate;

                    breakdown[apt.serviceTypeId].revenue += apt.price;
                    breakdown[apt.serviceTypeId].hours += hours;
                    breakdown[apt.serviceTypeId].cost += cost;
                    breakdown[apt.serviceTypeId].profit += (apt.price - cost);
                    breakdown[apt.serviceTypeId].count++;
                }
            }
        });
        
        let sortableBreakdown = Object.values(breakdown);

        if (breakdownSort) {
             sortableBreakdown.sort((a, b) => {
                const aValue = a[breakdownSort.key as keyof typeof a];
                const bValue = b[breakdownSort.key as keyof typeof b];

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                     return breakdownSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0;
             });
        }

        return sortableBreakdown;
    }, [staffAppointments, services, statuses, staffMember, breakdownSort]);
    
    const uniqueServicesForFilter = useMemo(() => {
        const serviceIds = new Set(staffAppointments.map(apt => apt.serviceTypeId));
        return services.filter(s => serviceIds.has(s.id));
    }, [staffAppointments, services]);
    
    const requestBreakdownSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (breakdownSort && breakdownSort.key === key && breakdownSort.direction === 'asc') {
            direction = 'desc';
        }
        setBreakdownSort({ key, direction });
    };


    return (
        <div className="flex flex-col h-full pb-20 animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <button onClick={onBack} className="flex items-center text-teal-600 dark:text-teal-400 hover:underline text-sm font-medium">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Equipo
                </button>
                <button onClick={() => onEditStaff(staffMember)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center text-sm shadow-sm transition-colors">
                    <Edit2 className="w-4 h-4 mr-2" /> Editar
                </button>
            </div>

            {/* Main Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl shadow-lg shrink-0 ${staffMember.color}`}>
                    {staffMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{staffMember.name}</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Coste por hora base: {formatCurrency(staffMember.defaultRate)}</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><DollarSign className="w-3 h-3 mr-1"/> Ingresos Generados</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(stats.realizedRevenue)}
                        {stats.scheduledRevenue > 0 && <span className="text-sm font-medium text-gray-500 ml-1">(+{formatCurrency(stats.scheduledRevenue)})</span>}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Wallet className="w-3 h-3 mr-1"/> Beneficio Neto</div>
                    <div className={`text-xl font-bold ${stats.realizedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {formatCurrency(stats.realizedProfit)}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Target className="w-3 h-3 mr-1"/> Media Beneficio / Sesión</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                       {formatCurrency(stats.avgProfitPerSession)}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Clock className="w-3 h-3 mr-1"/> Media Tiempo / Sesión</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {stats.avgTimePerSession.toFixed(0)} min
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Appointments */}
                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[400px] flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                <CalendarIcon className="w-5 h-5 mr-2 text-teal-600" /> Citas de {staffMember.name}
                            </h2>
                            <div className="flex items-center gap-2">
                                {uniqueServicesForFilter.length > 1 && (
                                     <select 
                                        value={serviceFilter}
                                        onChange={(e) => setServiceFilter(e.target.value)}
                                        className="text-xs p-1.5 border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm"
                                    >
                                        <option value="all">Todos los tratamientos</option>
                                        {uniqueServicesForFilter.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                )}
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                    <button onClick={() => setAppointmentFilter('upcoming')} className={`px-3 py-1 text-xs rounded-md transition-all ${appointmentFilter === 'upcoming' ? 'bg-white dark:bg-gray-600 shadow text-teal-600 dark:text-teal-300 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>
                                        Próximas ({upcomingAppointments.length})
                                    </button>
                                    <button onClick={() => setAppointmentFilter('history')} className={`px-3 py-1 text-xs rounded-md transition-all ${appointmentFilter === 'history' ? 'bg-white dark:bg-gray-600 shadow text-teal-600 dark:text-teal-300 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>
                                        Historial
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[500px] p-2">
                            {(appointmentFilter === 'upcoming' ? upcomingAppointments : pastAppointments).length > 0 ? (
                                 <div className="space-y-2">
                                     {(appointmentFilter === 'upcoming' ? upcomingAppointments : pastAppointments).map(apt => {
                                         const service = services.find(s => s.id === apt.serviceTypeId);
                                         const status = statuses.find(s => s.id === apt.statusId);
                                         const client = clients.find(c => c.id === apt.clientId);
                                         
                                         return (
                                             <div key={apt.id} onClick={() => onOpenAptModal(apt)} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-700/20 border-gray-100 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 cursor-pointer">
                                                 <div className="flex items-center gap-3">
                                                     <div className="flex flex-col items-center min-w-[3.5rem] border-r border-gray-200 dark:border-gray-600 pr-3">
                                                         <span className="text-xs uppercase font-bold text-gray-500">{format(new Date(apt.date), 'MMM', {locale: es})}</span>
                                                         <span className="text-xl font-bold text-gray-800 dark:text-white">{format(new Date(apt.date), 'd')}</span>
                                                     </div>
                                                     <div>
                                                         <div className="font-semibold text-gray-900 dark:text-white text-sm">{service?.name || '...'}</div>
                                                         <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                                                             <User className="w-3 h-3" /> {client?.name || '...'}
                                                         </div>
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                     <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(apt.price)}</span>
                                                     {status && <span className={`px-2 py-1 rounded text-[10px] font-bold ${status.color}`}>{status.name}</span>}
                                                 </div>
                                             </div>
                                         );
                                     })}
                                 </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                    <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm">No hay citas en esta sección.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Breakdown */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                                <Briefcase className="w-4 h-4 mr-2 text-purple-500" /> Rendimiento por Tratamiento
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Tratamiento</th>
                                        <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400 cursor-pointer" onClick={() => requestBreakdownSort('profit')}>Beneficio</th>
                                        <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400 cursor-pointer" onClick={() => requestBreakdownSort('count')}>Citas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {treatmentBreakdown.length > 0 ? treatmentBreakdown.map(item => (
                                    <tr key={item.service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-3 py-2.5">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.service.color}`}>{item.service.name}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <div className="font-semibold text-gray-800 dark:text-white">{formatCurrency(item.profit)}</div>
                                            <div className="text-xs text-gray-500">{((item.profit / item.revenue) * 100 || 0).toFixed(0)}% margen</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                             <div className="font-medium text-gray-800 dark:text-white">{item.count}</div>
                                             <div className="text-xs text-gray-500">{item.hours.toFixed(1)}h</div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={3} className="p-4 text-xs text-center text-gray-500">Sin datos de tratamientos.</td></tr>
                                )}
                                </tbody>
                           </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};