
import React, { useMemo, useState } from 'react';
import { Client, Appointment, ServiceType, ClientRetentionMetric, AppStatus, Staff, AppSettings, InventoryItem, InventoryMovement } from '../types';
import { dataService } from '../services/dataService';
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
  inventory: InventoryItem[];
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
  const [retentionCurrentPage, setRetentionCurrentPage] = useState(1);
  const retentionItemsPerPage = 10;

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
      if (isNaN(lastDate.getTime())) return null;

      const recommendedDate = addDays(lastDate, service.recurrenceDays || 30); // Default to 30 if missing
      if (isNaN(recommendedDate.getTime())) return null;

      const daysDiff = differenceInDays(today, recommendedDate);

      const threshold = service.upcomingThresholdDays || 7;

      let status: ClientRetentionMetric['status'] = 'ontime';
      if (daysDiff > 0) status = 'overdue';
      else if (daysDiff > -threshold) status = 'upcoming';

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
    setRetentionCurrentPage(1);
  };

  const activeRetentionMetrics = useMemo(() => {
    return filteredMetrics.filter(m => m.status !== 'ontime');
  }, [filteredMetrics]);

  const retentionTotalPages = Math.ceil(activeRetentionMetrics.length / retentionItemsPerPage);
  const retentionIndexOfLastItem = retentionCurrentPage * retentionItemsPerPage;
  const retentionIndexOfFirstItem = retentionIndexOfLastItem - retentionItemsPerPage;
  const currentRetentionMetrics = activeRetentionMetrics.slice(retentionIndexOfFirstItem, retentionIndexOfLastItem);

  return (
    <div className="flex-1 overflow-y-auto">
        <div className="space-y-8 pb-20">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analítica de Retención</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Identifica oportunidades de re-contacto.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center mb-3"><Info className="w-5 h-5 text-teal-600 mr-2"/> Cómo funciona</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-700 dark:text-gray-300">
                <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 mb-1">Al día</span>
                    <p>Tratamiento reciente. No aparecerá en la lista de atención hasta que se acerque su fecha de recurrencia.</p>
                </div>
                <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 mb-1">Próximos</span>
                    <p>Clientes cuya fecha de recurrencia está cerca (según el margen configurado en cada tratamiento).</p>
                </div>
                <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 mb-1">Vencidos</span>
                    <p>Clientes que ya deberían haber vuelto pero no tienen ninguna cita facturable posterior.</p>
                </div>
            </div>
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
                        <input type="text" placeholder="Buscar..." value={retentionSearch} onChange={(e) => { setRetentionSearch(e.target.value); setRetentionCurrentPage(1); }} className="pl-8 pr-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 w-full focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"/>
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
                            {currentRetentionMetrics.map(metric => (
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
                {retentionTotalPages > 1 && (
                    <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                        <div className="text-[10px] text-gray-500">
                            Mostrando <span className="font-medium">{retentionIndexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(retentionIndexOfLastItem, activeRetentionMetrics.length)}</span> de <span className="font-medium">{activeRetentionMetrics.length}</span>
                        </div>
                        <div className="flex space-x-1">
                            <button onClick={() => setRetentionCurrentPage(p => Math.max(1, p - 1))} disabled={retentionCurrentPage === 1} className="px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700">Ant.</button>
                            <button onClick={() => setRetentionCurrentPage(p => Math.min(retentionTotalPages, p + 1))} disabled={retentionCurrentPage === retentionTotalPages} className="px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700">Sig.</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    </div>
  );
};

export const FinancialReport: React.FC<AnalyticsDashboardProps> = ({ clients, appointments, services, statuses, staff, inventory, onViewClient }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('day');
    const [subTab, setSubTab] = useState<'general' | 'team' | 'clients' | 'inventory'>('general');
    const [teamServiceFilter, setTeamServiceFilter] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [teamSortConfig, setTeamSortConfig] = useState<SortConfig>(null);
    const [clientFinancialsSortConfig, setClientFinancialsSortConfig] = useState<SortConfig>(null);
    const [teamCurrentPage, setTeamCurrentPage] = useState(1);
    const [clientCurrentPage, setClientCurrentPage] = useState(1);
    const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handlePrev = () => {
        if (period === 'day') setCurrentDate(addDays(currentDate, -1));
        else if (period === 'week') setCurrentDate(addWeeks(currentDate, -1));
        else if (period === 'month') setCurrentDate(addMonths(currentDate, -1));
        else if (period === 'year') setCurrentDate(addYears(currentDate, -1));
    };

    const handleNext = () => {
        if (period === 'day') setCurrentDate(addDays(currentDate, 1));
        else if (period === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else if (period === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (period === 'year') setCurrentDate(addYears(currentDate, 1));
    };

    const dateRange = useMemo(() => {
        if (period === 'all') return { start: null, end: null, label: 'Todo el histórico' };
        let start: Date, end: Date, label: string;
        if (period === 'day') {
            start = new Date(currentDate); start.setHours(0,0,0,0);
            end = new Date(currentDate); end.setHours(23,59,59,999);
            label = format(currentDate, 'd MMM yyyy', { locale: es });
        } else if (period === 'week') {
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
        let cashRevenue = 0;
        let cardRevenue = 0;

        filteredAppointments.forEach(apt => {
            const status = statuses.find(s => s.id === apt.statusId);
            const staffMember = staff.find(s => s.id === apt.staffId);
            const isCancelled = status?.name.toLowerCase().includes('cancel') || status?.name.toLowerCase().includes('anul');

            if (isCancelled) return;

            // Product Sales
            const appointmentProductRevenue = apt.inventoryTotal || 0;
            const appointmentProductCost = (apt.inventoryItems || []).reduce((acc, sale) => {
                const item = inventory.find(i => i.id === sale.itemId);
                return acc + (item ? item.costPrice * sale.quantity : 0);
            }, 0);

            // Determine payment method for the "in-clinic" payment
            const method = apt.paymentMethod || 'card';

            if (status?.isBillable) {
                const totalForApt = apt.price + appointmentProductRevenue;
                revenue += totalForApt;
                
                // If booking fee was paid, subtract it from the "in-clinic" payment
                const prepaid = apt.bookingFeePaid ? (apt.bookingFeeAmount || 0) : 0;
                const remainder = totalForApt - prepaid;

                // Handle Booking Fee Payment Method
                if (prepaid > 0) {
                    // Default to 'card' if not specified (legacy behavior for "Paid Online")
                    const feeMethod = apt.bookingFeePaymentMethod || 'card';
                    if (feeMethod === 'cash') cashRevenue += prepaid;
                    else cardRevenue += prepaid;
                }

                // Handle Remainder Payment Method
                const remainderMethod = apt.paymentMethod || 'card';
                if (method === 'cash') cashRevenue += remainder; // Note: 'method' var was defined as apt.paymentMethod above in original code, ensuring consistency
                else cardRevenue += remainder;

                cost += appointmentProductCost;
                attendedClientIds.add(apt.clientId);
                totalHours += apt.durationMinutes / 60;
            } else {
                if (apt.bookingFeePaid) {
                    revenue += apt.bookingFeeAmount;
                    
                     // Default to 'card' if not specified
                    const feeMethod = apt.bookingFeePaymentMethod || 'card';
                    if (feeMethod === 'cash') cashRevenue += apt.bookingFeeAmount;
                    else cardRevenue += apt.bookingFeeAmount;

                    pending += (apt.price - apt.bookingFeeAmount) + appointmentProductRevenue;
                } else {
                    pending += apt.price + appointmentProductRevenue;
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
            revenue, pending, cost, profit, attendedClientsCount, totalHours, cashRevenue, cardRevenue,
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
            metrics[apt.serviceTypeId].revenue += apt.price + (apt.inventoryTotal || 0);
            metrics[apt.serviceTypeId].hours += (apt.durationMinutes / 60);
        });
        return Object.values(metrics).sort((a,b) => b.revenue - a.revenue);
    }, [filteredAppointments, services, statuses]);

    const teamMetrics = useMemo(() => {
        const metrics: Record<string, { id: string, name: string, count: number, hours: number, revenue: number, cost: number, profit: number }> = {};
        
        staff.forEach(s => {
            metrics[s.id] = { id: s.id, name: s.name, count: 0, hours: 0, revenue: 0, cost: 0, profit: 0 };
        });

        filteredAppointments.forEach(apt => {
            if (!apt.staffId || !metrics[apt.staffId]) return;
            const status = statuses.find(s => s.id === apt.statusId);
            if (!status?.isBillable) return;

            const hours = apt.durationMinutes / 60;
            const staffMember = staff.find(s => s.id === apt.staffId);
            const hourlyRate = staffMember?.rates?.[apt.serviceTypeId] ?? staffMember?.defaultRate ?? 0;
            
            const appointmentProductRevenue = apt.inventoryTotal || 0;
            const appointmentProductCost = (apt.inventoryItems || []).reduce((acc, sale) => {
                const item = inventory.find(i => i.id === sale.itemId);
                return acc + (item ? item.costPrice * sale.quantity : 0);
            }, 0);

            metrics[apt.staffId].count += 1;
            metrics[apt.staffId].hours += hours;
            metrics[apt.staffId].revenue += apt.price + appointmentProductRevenue;
            metrics[apt.staffId].cost += (hours * hourlyRate) + appointmentProductCost;
        });

        return Object.values(metrics).map(m => ({
            ...m,
            profit: m.revenue - m.cost
        })).sort((a, b) => {
            if (!teamSortConfig) return b.profit - a.profit;
            const { key, direction } = teamSortConfig;
            let valA = (a as any)[key];
            let valB = (b as any)[key];
            if (typeof valA === 'string') return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return direction === 'asc' ? valA - valB : valB - valA;
        });
    }, [filteredAppointments, staff, statuses, inventory, teamSortConfig]);

    const teamTotalPages = Math.ceil(teamMetrics.length / itemsPerPage);
    const teamIndexOfLastItem = teamCurrentPage * itemsPerPage;
    const teamIndexOfFirstItem = teamIndexOfLastItem - itemsPerPage;
    const currentTeamMetrics = teamMetrics.slice(teamIndexOfFirstItem, teamIndexOfLastItem);

    const clientFinancials = useMemo(() => {
        const financials: Record<string, { id: string, name: string, email: string, appointments: number, revenue: number, pending: number }> = {};
        
        clients.forEach(c => {
            financials[c.id] = { id: c.id, name: c.name, email: c.email, appointments: 0, revenue: 0, pending: 0 };
        });

        filteredAppointments.forEach(apt => {
            if (!financials[apt.clientId]) return;
            const status = statuses.find(s => s.id === apt.statusId);
            const isCancelled = status?.name.toLowerCase().includes('cancel') || status?.name.toLowerCase().includes('anul');
            if (isCancelled) return;

            financials[apt.clientId].appointments += 1;
            
            if (status?.isBillable) {
                financials[apt.clientId].revenue += apt.price + (apt.inventoryTotal || 0);
            } else {
                if (apt.bookingFeePaid) {
                    financials[apt.clientId].revenue += apt.bookingFeeAmount;
                    financials[apt.clientId].pending += (apt.price - apt.bookingFeeAmount) + (apt.inventoryTotal || 0);
                } else {
                    financials[apt.clientId].pending += apt.price + (apt.inventoryTotal || 0);
                }
            }
        });

        return Object.values(financials)
            .filter(c => {
                const search = clientSearch.toLowerCase();
                return c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search);
            })
            .sort((a, b) => {
                if (!clientFinancialsSortConfig) return b.revenue - a.revenue;
                const { key, direction } = clientFinancialsSortConfig;
                const valA = (a as any)[key];
                const valB = (b as any)[key];
                if (typeof valA === 'string') {
                    return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                return direction === 'asc' ? valA - valB : valB - valA;
            });
    }, [filteredAppointments, clients, statuses, clientSearch, clientFinancialsSortConfig]);

    const clientTotalPages = Math.ceil(clientFinancials.length / itemsPerPage);
    const clientIndexOfLastItem = clientCurrentPage * itemsPerPage;
    const clientIndexOfFirstItem = clientIndexOfLastItem - itemsPerPage;
    const currentClientFinancials = clientFinancials.slice(clientIndexOfFirstItem, clientIndexOfLastItem);

    const [allMovements, setAllMovements] = useState<InventoryMovement[]>([]);
    
    React.useEffect(() => {
        const fetchMovements = async () => {
            const uid = (window as any).currentUserUid || 'guest';
            const data = await dataService.getInventoryMovements(uid);
            setAllMovements(data);
        };
        fetchMovements();
    }, [inventory]);

    const inventoryFinancialMetrics = useMemo(() => {
        const { start, end } = dateRange;
        const periodMovements = allMovements.filter(m => {
            if (!start || !end) return true;
            return isWithinInterval(new Date(m.date), { start, end });
        });

        const totalStockValue = inventory.reduce((acc, item) => acc + (item.stock * item.costPrice), 0);
        let purchaseInvestment = 0;
        let salesRevenue = 0;
        let cogs = 0; // Cost of Goods Sold

        const productBreakdown: Record<string, { name: string, bought: number, sold: number, revenue: number, profit: number }> = {};
        inventory.forEach(item => {
            productBreakdown[item.id] = { name: item.name, bought: 0, sold: 0, revenue: 0, profit: 0 };
        });

        periodMovements.forEach(m => {
            if (!productBreakdown[m.itemId]) return;
            if (m.type === 'purchase') {
                const amount = m.quantity * (m.price || 0);
                purchaseInvestment += amount;
                productBreakdown[m.itemId].bought += amount;
            } else if (m.type === 'sale') {
                const qty = Math.abs(m.quantity);
                const rev = qty * (m.price || 0);
                const item = inventory.find(i => i.id === m.itemId);
                const cost = qty * (item?.costPrice || 0);
                
                salesRevenue += rev;
                cogs += cost;
                productBreakdown[m.itemId].sold += qty;
                productBreakdown[m.itemId].revenue += rev;
                productBreakdown[m.itemId].profit += (rev - cost);
            }
        });

        return {
            totalStockValue,
            purchaseInvestment,
            salesRevenue,
            netProfit: salesRevenue - cogs,
            breakdown: Object.values(productBreakdown).sort((a,b) => b.revenue - a.revenue)
        };
    }, [allMovements, inventory, dateRange]);

    const inventoryTotalPages = Math.ceil(inventoryFinancialMetrics.breakdown.length / itemsPerPage);
    const inventoryIndexOfLastItem = inventoryCurrentPage * itemsPerPage;
    const inventoryIndexOfFirstItem = inventoryIndexOfLastItem - itemsPerPage;
    const currentInventoryBreakdown = inventoryFinancialMetrics.breakdown.slice(inventoryIndexOfFirstItem, inventoryIndexOfLastItem);

    const requestTeamSort = (key: string) => {
        setTeamSortConfig(prev => ({
            key,
            direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc'
        }));
        setTeamCurrentPage(1);
    };

    const requestClientSort = (key: string) => {
        setClientFinancialsSortConfig(prev => ({
            key,
            direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc'
        }));
        setClientCurrentPage(1);
    };

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
                            {['day', 'week', 'month', 'year', 'all'].map(val => (
                                <button key={val} onClick={() => { setPeriod(val as any); setTeamCurrentPage(1); setClientCurrentPage(1); setInventoryCurrentPage(1); }} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === val ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-teal-600'}`}>
                                    {val === 'day' ? 'Día' : val === 'week' ? 'Semana' : val === 'month' ? 'Mes' : val === 'year' ? 'Año' : 'Todo'}
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
                        <div className="flex items-center gap-3 mt-1">
                             <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                {formatCurrency(summaryMetrics.cardRevenue)} (T)
                             </div>
                             <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                {formatCurrency(summaryMetrics.cashRevenue)} (E)
                             </div>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Cobrado (incl. reservas)</p>
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
                    <button onClick={() => setSubTab('inventory')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'inventory' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-teal-600'}`}>Inventario</button>
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

                {subTab === 'team' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Rendimiento (Beneficio Neto)</h3>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={teamMetrics}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                                        <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} />
                                        <YAxis stroke="#9ca3af" tick={{fontSize: 12}} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
                                            itemStyle={{ fontSize: '12px' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="profit" name="Beneficio Neto" fill="#0f766e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="cost" name="Coste Salarial" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="revenue" name="Ingresos Generados" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Detalle Numérico</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestTeamSort('name')}>
                                                <div className="flex items-center">Miembro {teamSortConfig?.key === 'name' && (teamSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestTeamSort('count')}>
                                                <div className="flex items-center justify-center">Citas {teamSortConfig?.key === 'count' && (teamSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestTeamSort('hours')}>
                                                <div className="flex items-center justify-center">Horas {teamSortConfig?.key === 'hours' && (teamSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestTeamSort('revenue')}>
                                                <div className="flex items-center justify-end">Ingresos {teamSortConfig?.key === 'revenue' && (teamSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestTeamSort('cost')}>
                                                <div className="flex items-center justify-end">Coste {teamSortConfig?.key === 'cost' && (teamSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                            <th className="px-6 py-3 font-semibold text-teal-600 dark:text-teal-400 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestTeamSort('profit')}>
                                                <div className="flex items-center justify-end">Beneficio {teamSortConfig?.key === 'profit' && (teamSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {currentTeamMetrics.map(m => (
                                            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{m.name}</td>
                                                <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{m.count}</td>
                                                <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{m.hours.toFixed(1)}h</td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(m.revenue)}</td>
                                                <td className="px-6 py-4 text-right text-red-500 font-medium">-{formatCurrency(m.cost)}</td>
                                                <td className="px-6 py-4 text-right font-bold text-teal-600 dark:text-teal-400">{formatCurrency(m.profit)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {teamTotalPages > 1 && (
                                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        Mostrando <span className="font-medium">{teamIndexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(teamIndexOfLastItem, teamMetrics.length)}</span> de <span className="font-medium">{teamMetrics.length}</span>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => setTeamCurrentPage(p => Math.max(1, p - 1))} disabled={teamCurrentPage === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Anterior</button>
                                        <button onClick={() => setTeamCurrentPage(p => Math.min(teamTotalPages, p + 1))} disabled={teamCurrentPage === teamTotalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Siguiente</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {subTab === 'clients' && (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Desglose por Cliente</h3>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar cliente, email o t..."
                                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={clientSearch}
                                        onChange={e => { setClientSearch(e.target.value); setClientCurrentPage(1); }}
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestClientSort('name')}>
                                                <div className="flex items-center">CLIENTE {clientFinancialsSortConfig?.key === 'name' && (clientFinancialsSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestClientSort('appointments')}>
                                                <div className="flex items-center justify-center">CITAS {clientFinancialsSortConfig?.key === 'appointments' && (clientFinancialsSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestClientSort('revenue')}>
                                                <div className="flex items-center justify-end text-[10px] leading-tight text-left">REALIZADO<br/>(COBRADO) {clientFinancialsSortConfig?.key === 'revenue' && (clientFinancialsSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestClientSort('pending')}>
                                                <div className="flex items-center justify-end text-[10px] leading-tight text-left">FUTURO<br/>(PENDIENTE) {clientFinancialsSortConfig?.key === 'pending' && (clientFinancialsSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {currentClientFinancials.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => onViewClient(c.id)}>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                                                    <div className="text-xs text-gray-500">{c.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{c.appointments}</td>
                                                <td className="px-6 py-4 text-right font-bold text-teal-600 dark:text-teal-400">{formatCurrency(c.revenue)}</td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-600 dark:text-gray-400">{formatCurrency(c.pending)}</td>
                                            </tr>
                                        ))}
                                        {clientFinancials.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">No se han encontrado clientes en este periodo</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {clientTotalPages > 1 && (
                                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        Mostrando <span className="font-medium">{clientIndexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(clientIndexOfLastItem, clientFinancials.length)}</span> de <span className="font-medium">{clientFinancials.length}</span>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => setClientCurrentPage(p => Math.max(1, p - 1))} disabled={clientCurrentPage === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Anterior</button>
                                        <button onClick={() => setClientCurrentPage(p => Math.min(clientTotalPages, p + 1))} disabled={clientCurrentPage === clientTotalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Siguiente</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {subTab === 'inventory' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Valor Stock (Costo)</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(inventoryFinancialMetrics.totalStockValue)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-red-500 uppercase font-bold mb-1">Inversión Compras</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(inventoryFinancialMetrics.purchaseInvestment)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-emerald-500 uppercase font-bold mb-1">Ingresos Ventas</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(inventoryFinancialMetrics.salesRevenue)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-teal-500 uppercase font-bold mb-1">Beneficio Neto Prod.</div>
                                <div className="text-xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(inventoryFinancialMetrics.netProfit)}</div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Análisis de Movimientos</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={inventoryFinancialMetrics.breakdown.slice(0, 10)}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                                        <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 10}} />
                                        <YAxis stroke="#9ca3af" tick={{fontSize: 10}} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="revenue" name="Ingresos por Ventas" fill="#0f766e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="profit" name="Beneficio Real" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Rendimiento por Producto</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400">Producto</th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-center">Invertido</th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-center">Vendido (u.)</th>
                                            <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">Ingreso</th>
                                            <th className="px-6 py-3 font-semibold text-teal-600 dark:text-teal-400 text-right">Beneficio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {currentInventoryBreakdown.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                                <td className="px-6 py-4 text-center text-red-500">{formatCurrency(p.bought)}</td>
                                                <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{p.sold}</td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(p.revenue)}</td>
                                                <td className="px-6 py-4 text-right font-bold text-teal-600 dark:text-teal-400">{formatCurrency(p.profit)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {inventoryTotalPages > 1 && (
                                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        Mostrando <span className="font-medium">{inventoryIndexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(inventoryIndexOfLastItem, inventoryFinancialMetrics.breakdown.length)}</span> de <span className="font-medium">{inventoryFinancialMetrics.breakdown.length}</span>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => setInventoryCurrentPage(p => Math.max(1, p - 1))} disabled={inventoryCurrentPage === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Anterior</button>
                                        <button onClick={() => setInventoryCurrentPage(p => Math.min(inventoryTotalPages, p + 1))} disabled={inventoryCurrentPage === inventoryTotalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Siguiente</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
