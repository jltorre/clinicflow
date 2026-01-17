import React, { useState, useMemo } from 'react';
import { Client, Appointment, ServiceType, AppStatus, Staff } from '../types';
// FIX: Removed parseISO import and replaced usages with new Date() to fix module error.
import { format, addDays, isFuture, isSameDay, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    ArrowLeft, Mail, Phone, Calendar as CalendarIcon, Edit2, 
    EyeOff, Eye, Lightbulb, Plus, TrendingUp, Receipt, 
    Clock, History, Star, XCircle, CheckSquare, RotateCcw, PieChart as PieChartIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';


interface ClientDetailPageProps {
    client: Client;
    clients: Client[];
    appointments: Appointment[];
    services: ServiceType[];
    statuses: AppStatus[];
    staff: Staff[];
    onBack: () => void;
    onEditClient: (client: Client) => void;
    onSchedule: (context: { clientId: string; serviceTypeId: string; recommendedDate: Date }) => void;
    calculateFinalPrice: (basePrice: number, discountPercentage: number) => number;
    onToggleTreatmentFinished: (clientId: string, serviceId: string) => void;
    onEditAppointment: (appointment: Appointment) => void;
}

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Helper to check billable status
const isBillable = (statusId: string, allStatuses: AppStatus[]) => allStatuses.find(s => s.id === statusId)?.isBillable || false;

const PIE_COLORS = ['#0d9488', '#0e7490', '#0369a1', '#1d4ed8', '#4338ca', '#7e22ce'];


export const ClientDetailPage: React.FC<ClientDetailPageProps> = ({
    client,
    clients,
    appointments,
    services,
    statuses,
    staff,
    onBack,
    onEditClient,
    onSchedule,
    calculateFinalPrice,
    onToggleTreatmentFinished,
    onEditAppointment,
}) => {
    const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'history'>('upcoming');
    const [serviceFilter, setServiceFilter] = useState<string>('all');

    // --- 1. Data Aggregation & Metrics ---

    const clientAppointments = useMemo(() => {
        return appointments
            .filter(apt => apt.clientId === client.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Default desc sort
    }, [appointments, client.id]);

    const clientUniqueServices = useMemo(() => {
        const serviceIds = new Set(clientAppointments.map(apt => apt.serviceTypeId));
        return services.filter(s => serviceIds.has(s.id));
    }, [clientAppointments, services]);
    
    const today = new Date();
    const upcomingAppointments = clientAppointments
        .filter(apt => (isFuture(new Date(apt.date)) || isSameDay(new Date(apt.date), today)) && (serviceFilter === 'all' || apt.serviceTypeId === serviceFilter))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Asc for upcoming

    const pastAppointments = clientAppointments
        .filter(apt => isPast(new Date(apt.date)) && !isSameDay(new Date(apt.date), today) && (serviceFilter === 'all' || apt.serviceTypeId === serviceFilter)); // Desc for history (already sorted)

    const stats = useMemo(() => {
        let totalSpent = 0;
        let completedCount = 0;
        let cancelledCount = 0;
        let lastVisitDate: Date | null = null;

        pastAppointments.forEach(apt => {
            const status = statuses.find(s => s.id === apt.statusId);
            if (!status) return;

            if (status.isBillable) {
                totalSpent += apt.price + (apt.inventoryTotal || 0);
                completedCount++;
                // Check for last visit (assuming sorted desc)
                if (!lastVisitDate) lastVisitDate = new Date(apt.date);
            } else if (status.name.toLowerCase().includes('cancel') || status.name.toLowerCase().includes('anul')) {
                cancelledCount++;
            }
        });

        return {
            totalSpent,
            completedCount,
            cancelledCount,
            lastVisitDate,
            averageTicket: completedCount > 0 ? totalSpent / completedCount : 0
        };
    }, [pastAppointments, statuses]);

    // Breakdown by Treatment Type - NEW LOGIC
    const treatmentBreakdown = useMemo(() => {
        const uniqueServiceIds = new Set(clientAppointments.map(apt => apt.serviceTypeId));
        
        const breakdown = Array.from(uniqueServiceIds).map(serviceId => {
            const service = services.find(s => s.id === serviceId);
            const billableAptsForService = clientAppointments.filter(apt => 
                apt.serviceTypeId === serviceId && isBillable(apt.statusId, statuses)
            );

            const revenue = billableAptsForService.reduce((sum, apt) => sum + apt.price + (apt.inventoryTotal || 0), 0);
            
            return {
                serviceId,
                name: service?.name || 'Desconocido',
                color: service?.color || 'bg-gray-100 text-gray-800',
                count: billableAptsForService.length,
                revenue: revenue
            };
        });

        return breakdown.filter(b => b.count > 0).sort((a, b) => b.revenue - a.revenue);
    }, [clientAppointments, statuses, services]);

    // Futurible Calculation
    const futuribleAppointments = useMemo(() => {
        const recommendations: {
            service: ServiceType;
            recommendedDate: Date;
            lastAppointmentDate: Date;
            price: number;
        }[] = [];

        const processedServiceTypes = new Set<string>();

        // Sort appointments by date desc to get the last one first
        const sortedApts = [...clientAppointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        sortedApts.forEach(apt => {
            // Only consider billable appointments for recurrence logic
            if (!isBillable(apt.statusId, statuses)) return;
            if (processedServiceTypes.has(apt.serviceTypeId)) return;

            const service = services.find(s => s.id === apt.serviceTypeId);
            // DO NOT recommend if service is non-recurrent or marked as finished
            if (!service || service.recurrenceDays === 0 || client.finishedTreatments?.includes(service.id)) return;

            const lastAptDate = new Date(apt.date);
            const recommendedDate = addDays(lastAptDate, service.recurrenceDays);

            // Check if there is already an upcoming appointment for this service
            const hasUpcoming = upcomingAppointments.some(upcomingApt =>
                upcomingApt.serviceTypeId === service.id &&
                !isSameDay(new Date(upcomingApt.date), recommendedDate)
            );

            // Only recommend if the date is in the future (or today) and not already booked
            if (!hasUpcoming && (isFuture(recommendedDate) || isSameDay(new Date(), recommendedDate))) {
                recommendations.push({
                    service,
                    recommendedDate,
                    lastAppointmentDate: lastAptDate,
                    price: calculateFinalPrice(service.defaultPrice, client.discountPercentage || 0)
                });
                processedServiceTypes.add(apt.serviceTypeId);
            }
        });

        return recommendations.sort((a, b) => a.recommendedDate.getTime() - b.recommendedDate.getTime());
    }, [clientAppointments, upcomingAppointments, services, statuses, client.discountPercentage, client.finishedTreatments, calculateFinalPrice]);


    return (
        <div className="flex flex-col h-full pb-20 animate-fade-in-up space-y-6">
            {/* Header Navigation */}
            <div className="flex items-center justify-between shrink-0">
                <button onClick={onBack} className="flex items-center text-teal-600 dark:text-teal-400 hover:underline text-sm font-medium">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                </button>
                <div className="flex space-x-2">
                    <button onClick={() => onEditClient(client)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center text-sm shadow-sm transition-colors">
                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                    </button>
                </div>
            </div>

            {/* Main Info Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-3xl font-bold text-white shadow-lg shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                            Cliente desde {format(new Date(client.createdAt), 'MMM yyyy', { locale: es })}
                        </span>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            {client.email ? <a href={`mailto:${client.email}`} className="hover:text-teal-600 hover:underline">{client.email}</a> : 'Sin email'}
                        </div>
                        <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {client.phone ? <a href={`tel:${client.phone}`} className="hover:text-teal-600 hover:underline">{client.phone}</a> : 'Sin teléfono'}
                        </div>
                        {client.discountPercentage !== undefined && client.discountPercentage > 0 && (
                            <div className="flex items-center text-sm font-medium text-amber-600 dark:text-amber-400 col-span-1 sm:col-span-2 lg:col-span-1">
                                <Star className="w-4 h-4 mr-2" />
                                {client.discountPercentage}% Descuento aplicado
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Receipt className="w-3 h-3 mr-1"/> Gasto Total</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalSpent)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Ticket Medio</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.averageTicket)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Clock className="w-3 h-3 mr-1"/> Última Visita</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {stats.lastVisitDate ? format(stats.lastVisitDate, 'd MMM yy', { locale: es }) : '-'}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><History className="w-3 h-3 mr-1"/> Citas Totales</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {stats.completedCount} <span className="text-xs font-normal text-gray-400">({stats.cancelledCount} canc.)</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Appointments (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Appointments Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[400px] flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                <CalendarIcon className="w-5 h-5 mr-2 text-teal-600" /> Citas
                            </h2>
                            <div className="flex items-center gap-2">
                                {clientUniqueServices.length > 1 && (
                                    <select 
                                        value={serviceFilter}
                                        onChange={(e) => setServiceFilter(e.target.value)}
                                        className="text-xs p-1.5 border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm focus:ring-teal-500 focus:border-teal-500"
                                    >
                                        <option value="all">Todos los tratamientos</option>
                                        {clientUniqueServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                )}
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setAppointmentFilter('upcoming')}
                                        className={`px-3 py-1 text-xs rounded-md transition-all ${appointmentFilter === 'upcoming' ? 'bg-white dark:bg-gray-600 shadow text-teal-600 dark:text-teal-300 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}
                                    >
                                        Próximas ({upcomingAppointments.length})
                                    </button>
                                    <button 
                                        onClick={() => setAppointmentFilter('history')}
                                        className={`px-3 py-1 text-xs rounded-md transition-all ${appointmentFilter === 'history' ? 'bg-white dark:bg-gray-600 shadow text-teal-600 dark:text-teal-300 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}
                                    >
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
                                        const staffMember = staff.find(s => s.id === apt.staffId);
                                        const isCancelled = status?.name.toLowerCase().includes('cancel') || status?.name.toLowerCase().includes('anul');

                                        return (
                                            <div
                                                key={apt.id}
                                                onClick={() => onEditAppointment(apt)}
                                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                                                    isCancelled 
                                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 opacity-75' 
                                                    : 'bg-white dark:bg-gray-700/20 border-gray-100 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex flex-col items-center min-w-[3.5rem] border-r border-gray-200 dark:border-gray-600 pr-3 py-1">
                                                        <span className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400">{format(new Date(apt.date), 'MMM', {locale: es})}</span>
                                                        <span className="text-xl font-bold text-gray-800 dark:text-white">{format(new Date(apt.date), 'd')}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(apt.date), 'yyyy')}</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                                                            {service?.name || 'Tratamiento desconocido'}
                                                            {isCancelled && <XCircle className="w-3 h-3 text-red-500" />}
                                                        </div>
                                                        <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                                                            <Clock className="w-3 h-3" /> {apt.startTime} ({apt.durationMinutes} min)
                                                            {staffMember && <span className="flex items-center ml-2"><div className={`w-2 h-2 rounded-full mr-1 ${staffMember.color.split(' ')[0]}`}></div> {staffMember.name}</span>}
                                                        </div>
                                                        {apt.notes && <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">{apt.notes}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 pl-16 sm:pl-0">
                                                    <div className="text-right">
                                                        <span className="block text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(apt.price + (apt.inventoryTotal || 0))}</span>
                                                    </div>
                                                    {status && (
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                                                            {status.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                                    <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm">No hay citas en esta sección.</p>
                                    {appointmentFilter === 'upcoming' && (
                                        <button 
                                            onClick={() => onSchedule({ clientId: client.id, serviceTypeId: clientUniqueServices[0]?.id || '', recommendedDate: new Date() })}
                                            className="mt-4 text-teal-600 hover:underline text-sm font-medium"
                                        >
                                            Programar nueva cita
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Sidebar (1/3) */}
                <div className="space-y-6">

                    {/* 2. Futuribles (Recommendations) */}
                    {futuribleAppointments.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl shadow-sm border border-amber-200 dark:border-amber-700/50 overflow-hidden">
                            <div className="p-4 border-b border-amber-200 dark:border-amber-700/50 bg-amber-100/50 dark:bg-amber-900/30">
                                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200 flex items-center">
                                    <Lightbulb className="w-4 h-4 mr-2" /> Recomendaciones
                                </h3>
                            </div>
                            <div className="p-3 space-y-3">
                                {futuribleAppointments.map((rec, index) => (
                                    <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-amber-100 dark:border-gray-700 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${rec.service.color}`}>{rec.service.name}</span>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatCurrency(rec.price)}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                            Ideal: <strong>{format(rec.recommendedDate, 'd MMM', { locale: es })}</strong>
                                            <span className="text-gray-400 block text-[10px]">Última vez: {format(rec.lastAppointmentDate, 'd MMM yy', { locale: es })}</span>
                                        </p>
                                        <button
                                            onClick={() => onSchedule({ clientId: client.id, serviceTypeId: rec.service.id, recommendedDate: rec.recommendedDate })}
                                            className="w-full py-1.5 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 flex items-center justify-center transition-colors"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Agendar Ahora
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Treatment Breakdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                                <Star className="w-4 h-4 mr-2 text-purple-500" /> Tratamientos
                            </h3>
                        </div>
                        <div className="p-2">
                            {treatmentBreakdown.length > 0 ? (
                                <div className="space-y-1">
                                    {treatmentBreakdown.map((item, idx) => {
                                        const isFinished = client.finishedTreatments?.includes(item.serviceId);
                                        return (
                                        <div key={idx} className={`flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-all ${isFinished ? 'opacity-60' : ''}`}>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={`w-2 h-8 rounded-full shrink-0 ${item.color.split(' ')[0]}`}></div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.count} sesiones</p>
                                                        {isFinished && (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                                                FINALIZADO
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(item.revenue)}</span>
                                                <button 
                                                    onClick={() => onToggleTreatmentFinished(client.id, item.serviceId)}
                                                    className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    title={isFinished ? 'Reactivar seguimiento para este tratamiento' : 'Marcar tratamiento como finalizado'}
                                                >
                                                    {isFinished ? <RotateCcw className="w-3 h-3 text-amber-500" /> : <CheckSquare className="w-3 h-3 text-emerald-500" />}
                                                </button>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            ) : (
                                <p className="p-4 text-xs text-gray-500 text-center">Sin datos de tratamientos previos.</p>
                            )}
                        </div>
                    </div>

                    
                     {/* 1. Chart */}
                     {treatmentBreakdown.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                                    <PieChartIcon className="w-4 h-4 mr-2 text-blue-500" /> Desglose de Gasto
                                </h3>
                            </div>
                            <div className="p-4 h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={treatmentBreakdown} 
                                            dataKey="revenue" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={50} 
                                            outerRadius={80} 
                                            fill="#8884d8" 
                                            paddingAngle={2}
                                            labelLine={false}
                                            label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                                        >
                                            {treatmentBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => [formatCurrency(value), "Total"]} />
                                        <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};