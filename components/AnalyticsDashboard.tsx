
import React, { useMemo, useState } from 'react';
import { Client, Appointment, ServiceType, ClientRetentionMetric, AppStatus, Staff, AppSettings } from '../types';
import { 
  differenceInDays, addDays, format, isBefore, 
  endOfWeek, endOfMonth, endOfYear, isWithinInterval,
  addWeeks, addMonths, addYears
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Area 
} from 'recharts';
import { AlertTriangle, Search, Filter, TrendingUp, Users, DollarSign, ChevronLeft, ChevronRight, Wallet, PiggyBank, Briefcase, EyeOff, Eye, Edit2, ArrowUp, ArrowDown, Info, Clock, Target } from 'lucide-react';

interface AnalyticsDashboardProps {
  clients: Client[];
  appointments: Appointment[];
  services: ServiceType[];
  statuses: AppStatus[];
  staff: Staff[];
  onViewClient: (clientId: string) => void;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

function getStartOfWeek(date: Date, { weekStartsOn = 1 } = {}) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getStartOfMonth(date: Date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getStartOfYear(date: Date) {
    const d = new Date(date);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ clients, appointments, services, statuses, staff, onViewClient }) => {
  const today = new Date();
  const [retentionSearch, setRetentionSearch] = useState('');
  const [retentionSortConfig, setRetentionSortConfig] = useState<SortConfig>(null);

  const isBillable = (statusId: string) => statuses.find(s => s.id === statusId)?.isBillable || false;

  const retentionMetrics = useMemo(() => {
    return clients.map(client => {
      const clientApts = appointments
        .filter(a => a.clientId === client.id && isBillable(a.statusId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (clientApts.length === 0) return null;
      const lastApt = clientApts[0];
      const service = services.find(s => s.id === lastApt.serviceTypeId);
      if (!service) return null;
      if (client.finishedTreatments?.includes(lastApt.serviceTypeId)) return null;

      const lastDate = new Date(lastApt.date);
      const recommendedDate = addDays(lastDate, service.recurrenceDays);
      const daysDiff = differenceInDays(today, recommendedDate);

      let status: ClientRetentionMetric['status'] = 'ontime';
      if (daysDiff > 0) status = 'overdue';
      else if (daysDiff > -7) status = 'upcoming';

      return {
        clientId: client.id,
        clientName: client.name,
        lastAppointmentDate: lastApt.date,
        lastServiceName: service.name,
        recommendedReturnDate: recommendedDate.toISOString(),
        daysOverdue: daysDiff > 0 ? daysDiff : 0,
        status
      };
    }).filter((item): item is ClientRetentionMetric => item !== null)
    .sort((a, b) => {
        const priority = { 'overdue': 0, 'upcoming': 1, 'ontime': 2 };
        if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
        if (a.status === 'overdue') return b.daysOverdue - a.daysOverdue;
        return new Date(a.recommendedReturnDate).getTime() - new Date(b.recommendedReturnDate).getTime();
    });
  }, [clients, appointments, services, statuses]);

  const filteredMetrics = useMemo(() => {
      let result = retentionMetrics;
      if(retentionSearch) {
          result = result.filter(m => {
            const client = clients.find(c => c.id === m.clientId);
            const lowerSearch = retentionSearch.toLowerCase();
            return m.clientName.toLowerCase().includes(lowerSearch) ||
                   client?.email?.toLowerCase().includes(lowerSearch) ||
                   client?.phone?.toLowerCase().includes(lowerSearch);
          });
      }
      if (retentionSortConfig) {
          result.sort((a, b) => {
              let aValue: any, bValue: any;
              switch (retentionSortConfig.key) {
                  case 'clientName': aValue = a.clientName; bValue = b.clientName; break;
                  case 'lastServiceName': aValue = a.lastServiceName; bValue = b.lastServiceName; break;
                  case 'recommendedReturnDate': aValue = new Date(a.recommendedReturnDate); bValue = new Date(b.recommendedReturnDate); break;
                  case 'status': aValue = { 'overdue': 0, 'upcoming': 1, 'ontime': 2 }[a.status]; bValue = { 'overdue': 0, 'upcoming': 1, 'ontime': 2 }[b.status]; break;
                  default: return 0;
              }
              if (typeof aValue === 'string' && typeof bValue === 'string') return retentionSortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
              if (aValue instanceof Date && bValue instanceof Date) return retentionSortConfig.direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
              if (typeof aValue === 'number' && typeof bValue === 'number') return retentionSortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
              return 0;
          });
      }
      return result;
  }, [retentionMetrics, retentionSearch, clients, retentionSortConfig]);

  const chartData = [
    { name: 'Vencidos', value: retentionMetrics.filter(m => m.status === 'overdue').length, color: '#EF4444' },
    { name: 'Próximos', value: retentionMetrics.filter(m => m.status === 'upcoming').length, color: '#F59E0B' },
    { name: 'Al día', value: retentionMetrics.filter(m => m.status === 'ontime').length, color: '#10B981' },
  ];

  const requestRetentionSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (retentionSortConfig && retentionSortConfig.key === key && retentionSortConfig.direction === 'asc') direction = 'desc';
    setRetentionSortConfig({ key, direction });
  };

  return (
    <div className="flex-1 overflow-y-auto">
        <div className="space-y-8 pb-20">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analítica de Retención</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Identifica oportunidades de re-contacto.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center mb-3"><Info className="w-5 h-5 text-teal-600 mr-2"/> Cómo funciona</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">El sistema analiza la fecha de la última visita. Si el tratamiento está "Finalizado", no aparece.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow ring-1 ring-gray-200 dark:ring-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Estado de la Cartera</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ value }) => value > 0 ? `${value}` : ''}>
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow ring-1 ring-gray-200 dark:ring-gray-700 lg:col-span-2 flex flex-col">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                    <h3 className="text-lg font-semibold flex items-center text-gray-900 dark:text-white"><AlertTriangle className="w-5 h-5 text-red-500 mr-2" /> Atención Requerida</h3>
                    <div className="relative flex-1 sm:min-w-[180px]">
                        <input type="text" placeholder="Buscar..." value={retentionSearch} onChange={(e) => setRetentionSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 w-full focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"/>
                        <Search className="w-4 h-4 text-gray-500 absolute left-2 top-2.5"/>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 max-h-[400px]">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                         <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                             <tr>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase cursor-pointer" onClick={() => requestRetentionSort('clientName')}>Cliente</th>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase cursor-pointer" onClick={() => requestRetentionSort('lastServiceName')}>Último Trat.</th>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase cursor-pointer" onClick={() => requestRetentionSort('recommendedReturnDate')}>Fecha Rec.</th>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase cursor-pointer" onClick={() => requestRetentionSort('status')}>Estado</th>
                             </tr>
                         </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredMetrics.filter(m => m.status !== 'ontime').map(metric => (
                                <tr key={metric.clientId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-3 py-2 text-sm font-medium"><button onClick={() => onViewClient(metric.clientId)} className="hover:text-teal-600 dark:text-gray-200 dark:hover:text-teal-400">{metric.clientName}</button></td>
                                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{metric.lastServiceName}</td>
                                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{format(new Date(metric.recommendedReturnDate), 'dd MMM yyyy', {locale: es})}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${metric.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                            {metric.status === 'overdue' ? `+${metric.daysOverdue} d` : 'Pronto'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </div>
    </div>
  );
};

export const FinancialReport: React.FC<AnalyticsDashboardProps> = ({ clients, appointments, services, statuses, staff, onViewClient }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
    const [subTab, setSubTab] = useState<'general' | 'team' | 'clients'>('general');
    const [teamServiceFilter, setTeamServiceFilter] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [teamSortConfig, setTeamSortConfig] = useState<SortConfig>(null);
    const [clientFinancialsSortConfig, setClientFinancialsSortConfig] = useState<SortConfig>(null);

    const handlePrev = () => {
        if (period === 'week') setCurrentDate(addWeeks(currentDate, -1));
        else if (period === 'month') setCurrentDate(addMonths(currentDate, -1));
        else if (period === 'year') setCurrentDate(addYears(currentDate, -1));
    };

    const handleNext = () => {
        if (period === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else if (period === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (period === 'year') setCurrentDate(addYears(currentDate, 1));
    };

    const dateRange = useMemo(() => {
        if (period === 'all') return { start: null, end: null, label: 'Todo el histórico' };
        let start: Date, end: Date, label: string;
        if (period === 'week') {
            start = getStartOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            label = `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy', { locale: es })}`;
        } else if (period === 'month') {
            start = getStartOfMonth(currentDate);
            end = endOfMonth(currentDate);
            label = format(currentDate, 'MMMM yyyy', { locale: es });
        } else {
            start = getStartOfYear(currentDate);
            end = endOfYear(currentDate);
            label = format(currentDate, 'yyyy');
        }
        return { start, end, label };
    }, [currentDate, period]);

    const filteredAppointments = useMemo(() => {
        const { start, end } = dateRange;
        return appointments.filter(apt => {
            if (!start || !end) return true;
            return isWithinInterval(new Date(apt.date), { start, end });
        });
    }, [appointments, dateRange]);

    const isBillable = (statusId: string) => statuses.find(s => s.id === statusId)?.isBillable || false;

    const summaryMetrics = useMemo(() => {
        let revenue = 0;
        let pending = 0;
        let cost = 0;
        let attendedClientIds = new Set<string>();
        let totalHours = 0;

        filteredAppointments.forEach(apt => {
            const status = statuses.find(s => s.id === apt.statusId);
            const staffMember = staff.find(s => s.id === apt.staffId);
            const isCancelled = status?.name.toLowerCase().includes('cancel') || status?.name.toLowerCase().includes('anul');

            if (isCancelled) return;

            if (status?.isBillable) {
                revenue += apt.price;
                attendedClientIds.add(apt.clientId);
                totalHours += apt.durationMinutes / 60;
            } else {
                if (apt.bookingFeePaid) {
                    revenue += apt.bookingFeeAmount;
                    pending += (apt.price - apt.bookingFeeAmount);
                } else {
                    pending += apt.price;
                }
            }

            if (staffMember && status?.isBillable) {
                const hours = apt.durationMinutes / 60;
                const hourlyRate = staffMember.rates?.[apt.serviceTypeId] ?? staffMember.defaultRate;
                cost += hours * hourlyRate;
            }
        });

        const profit = revenue - cost;
        const attendedClientsCount = attendedClientIds.size;

        return {
            revenue, pending, cost, profit, attendedClientsCount, totalHours,
            profitPerClient: attendedClientsCount > 0 ? profit / attendedClientsCount : 0,
            profitPerHour: totalHours > 0 ? profit / totalHours : 0
        };
    }, [filteredAppointments, statuses, staff]);

    const efficiencyMetrics = useMemo(() => {
        const metrics: Record<string, { name: string, revenue: number, hours: number }> = {};
        filteredAppointments.forEach(apt => {
            if (!isBillable(apt.statusId)) return;
            if (!metrics[apt.serviceTypeId]) {
                const s = services.find(srv => srv.id === apt.serviceTypeId);
                metrics[apt.serviceTypeId] = { name: s?.name || 'Unknown', revenue: 0, hours: 0 };
            }
            metrics[apt.serviceTypeId].revenue += apt.price;
            metrics[apt.serviceTypeId].hours += (apt.durationMinutes / 60);
        });
        return Object.values(metrics).sort((a,b) => b.revenue - a.revenue);
    }, [filteredAppointments, services, statuses]);

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 pb-20">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Informe Financiero</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Considerando pagos de reserva e ingresos realizados.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                        <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex">
                            {['week', 'month', 'year', 'all'].map(val => (
                                <button key={val} onClick={() => setPeriod(val as any)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === val ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-teal-600'}`}>
                                    {val === 'week' ? 'Semana' : val === 'month' ? 'Mes' : val === 'year' ? 'Año' : 'Todo'}
                                </button>
                            ))}
                        </div>
                        {period !== 'all' && (
                            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0.5">
                                <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                                <span className="px-4 text-sm font-medium min-w-[140px] text-center capitalize text-gray-700 dark:text-gray-200">{dateRange.label}</span>
                                <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                            <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">Realizado</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryMetrics.revenue)}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Cobrado (incl. reservas)</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg"><PiggyBank className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
                            <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">Pendiente</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryMetrics.pending)}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Por cobrar de citas</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"><Briefcase className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryMetrics.cost)}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Coste Salarial Equipo</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
                        </div>
                        <div className={`text-2xl font-bold ${summaryMetrics.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{formatCurrency(summaryMetrics.profit)}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Beneficio Neto</p>
                    </div>
                </div>

                <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <button onClick={() => setSubTab('general')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'general' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-teal-600'}`}>General</button>
                    <button onClick={() => setSubTab('team')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'team' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-teal-600'}`}>Equipo</button>
                    <button onClick={() => setSubTab('clients')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'clients' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-teal-600'}`}>Clientes</button>
                </div>

                {subTab === 'general' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Eficiencia de Tratamientos</h3>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={efficiencyMetrics}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                                    <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} />
                                    <YAxis yAxisId="left" orientation="left" stroke="#9ca3af" tick={{fontSize: 12}} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" tick={{fontSize: 12}} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="revenue" name="Ingresos (€)" fill="#0f766e" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="hours" name="Horas" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
