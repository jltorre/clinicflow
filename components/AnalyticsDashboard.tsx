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

// FIX: Add helper functions for date-fns functions that are not found in the user's environment.
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

  // Helper to check billable status
  const isBillable = (statusId: string) => statuses.find(s => s.id === statusId)?.isBillable || false;

  // Retention Metrics
  const retentionMetrics = useMemo(() => {
    return clients.map(client => {
      // Get all billable appointments for this client
      const clientApts = appointments
        .filter(a => a.clientId === client.id && isBillable(a.statusId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (clientApts.length === 0) return null;
      
      const lastApt = clientApts[0]; // Most recent
      const service = services.find(s => s.id === lastApt.serviceTypeId);
      if (!service) return null;

      // NEW LOGIC: Exclude if the last treatment is marked as finished
      if (client.finishedTreatments?.includes(lastApt.serviceTypeId)) {
          return null;
      }

      const lastDate = new Date(lastApt.date);
      const recommendedDate = addDays(lastDate, service.recurrenceDays);
      const daysDiff = differenceInDays(today, recommendedDate);

      let status: ClientRetentionMetric['status'] = 'ontime';
      // If today is past recommended date -> Overdue (positive diff)
      if (daysDiff > 0) status = 'overdue';
      // If today is close to recommended date (within 7 days) -> Upcoming (negative diff but > -7)
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
        // Sort: Overdue first, then Upcoming, then Ontime
        const priority = { 'overdue': 0, 'upcoming': 1, 'ontime': 2 };
        if (priority[a.status] !== priority[b.status]) {
            return priority[a.status] - priority[b.status];
        }
        // If status same, sort by days overdue (desc) for overdue, or date (asc) for others
        if (a.status === 'overdue') return b.daysOverdue - a.daysOverdue;
        return new Date(a.recommendedReturnDate).getTime() - new Date(b.recommendedReturnDate).getTime();
    });
  }, [clients, appointments, services, statuses]);

  const filteredMetrics = useMemo(() => {
      let result = retentionMetrics;

      // Apply search filter
      if(retentionSearch) {
          result = result.filter(m => {
            const client = clients.find(c => c.id === m.clientId);
            const lowerSearch = retentionSearch.toLowerCase();
            return m.clientName.toLowerCase().includes(lowerSearch) ||
                   client?.email?.toLowerCase().includes(lowerSearch) ||
                   client?.phone?.toLowerCase().includes(lowerSearch);
          });
      }

      // Apply sorting
      if (retentionSortConfig) {
          result.sort((a, b) => {
              let aValue: any;
              let bValue: any;
              
              switch (retentionSortConfig.key) {
                  case 'clientName':
                      aValue = a.clientName;
                      bValue = b.clientName;
                      break;
                  case 'lastServiceName':
                      aValue = a.lastServiceName;
                      bValue = b.lastServiceName;
                      break;
                  case 'recommendedReturnDate':
                      aValue = new Date(a.recommendedReturnDate);
                      bValue = new Date(b.recommendedReturnDate);
                      break;
                  case 'status':
                      const priority = { 'overdue': 0, 'upcoming': 1, 'ontime': 2 };
                      aValue = priority[a.status];
                      bValue = priority[b.status];
                      break;
                  default:
                      return 0;
              }

              if (typeof aValue === 'string' && typeof bValue === 'string') {
                  return retentionSortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
              } else if (aValue instanceof Date && bValue instanceof Date) {
                  return retentionSortConfig.direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
              } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                  return retentionSortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
              }
              return 0;
          });
      }

      return result;
  }, [retentionMetrics, retentionSearch, clients, retentionSortConfig]);

  // Pie chart data
  const chartData = [
    { name: 'Vencidos', value: retentionMetrics.filter(m => m.status === 'overdue').length, color: '#EF4444' },
    { name: 'Próximos', value: retentionMetrics.filter(m => m.status === 'upcoming').length, color: '#F59E0B' },
    { name: 'Al día', value: retentionMetrics.filter(m => m.status === 'ontime').length, color: '#10B981' },
  ];

    // Sorting Logic for Retention Table
    const requestRetentionSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (retentionSortConfig && retentionSortConfig.key === key && retentionSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setRetentionSortConfig({ key, direction });
    };

    const getRetentionSortIndicator = (key: string) => {
        if (!retentionSortConfig || retentionSortConfig.key !== key) {
            return null;
        }
        return retentionSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };


  return (
    <div className="flex-1 overflow-y-auto">
        <div className="space-y-8 pb-20">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analítica de Retención</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Identifica oportunidades de re-contacto con clientes que deberían volver.</p>
        </div>

        {/* Explanation Block */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center mb-3"><Info className="w-5 h-5 text-teal-600 mr-2"/> Cómo funciona esta pantalla</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
                El sistema analiza automáticamente la fecha de la última visita de cada cliente para un tratamiento recurrente. Si un tratamiento se marca como <strong>"Finalizado"</strong> en la ficha del cliente, dejará de aparecer aquí.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start"><strong className="text-red-500 w-24 shrink-0">Vencidos:</strong> Clientes cuya fecha de retorno recomendada ya ha pasado.</li>
                <li className="flex items-start"><strong className="text-amber-500 w-24 shrink-0">Próximos:</strong> Clientes que deberían volver en los próximos 7 días.</li>
                <li className="flex items-start"><strong className="text-emerald-500 w-24 shrink-0">Al día:</strong> Clientes con tratamientos activos que no requieren atención inmediata.</li>
            </ul>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow ring-1 ring-gray-200 dark:ring-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Estado de la Cartera</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={chartData} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={60} 
                                outerRadius={80} 
                                dataKey="value"
                                label={({ value }) => value > 0 ? `${value}` : ''}
                            >
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
                        <input type="text" placeholder="Buscar por cliente, email o teléfono..." value={retentionSearch} onChange={(e) => setRetentionSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 w-full"/>
                        <Search className="w-4 h-4 text-gray-500 absolute left-2 top-2.5"/>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 max-h-[400px]">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                         <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                             <tr>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestRetentionSort('clientName')}>
                                     <div className="flex items-center">Cliente {getRetentionSortIndicator('clientName')}</div>
                                 </th>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestRetentionSort('lastServiceName')}>
                                     <div className="flex items-center">Último Trat. {getRetentionSortIndicator('lastServiceName')}</div>
                                 </th>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestRetentionSort('recommendedReturnDate')}>
                                     <div className="flex items-center">Fecha Rec. {getRetentionSortIndicator('recommendedReturnDate')}</div>
                                 </th>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestRetentionSort('status')}>
                                     <div className="flex items-center">Estado {getRetentionSortIndicator('status')}</div>
                                 </th>
                             </tr>
                         </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredMetrics.filter(m => m.status !== 'ontime').map(metric => (
                                <tr key={metric.clientId}>
                                    <td className="px-3 py-2 text-sm font-medium"><button onClick={() => onViewClient(metric.clientId)} className="hover:text-teal-600 dark:text-white dark:hover:text-teal-400">{metric.clientName}</button></td>
                                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{metric.lastServiceName}</td>
                                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{format(new Date(metric.recommendedReturnDate), 'dd MMM yyyy', {locale: es})}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${metric.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                            {metric.status === 'overdue' ? `+${metric.daysOverdue} días` : 'Pronto'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredMetrics.filter(m => m.status !== 'ontime').length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                        No hay clientes con atención requerida en esta vista.
                                    </td>
                                </tr>
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

export const FinancialReport: React.FC<AnalyticsDashboardProps> = ({ clients, appointments, services, statuses, staff, onViewClient }) => {
    // State for Time Navigation
    const [currentDate, setCurrentDate] = useState(new Date());
    const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
    
    // State for Filters/Tabs
    const [subTab, setSubTab] = useState<'general' | 'team' | 'clients'>('general');
    const [teamServiceFilter, setTeamServiceFilter] = useState('');
    const [clientSearch, setClientSearch] = useState('');

    // Sorting State for Team and Client Financials Tables
    const [teamSortConfig, setTeamSortConfig] = useState<SortConfig>(null);
    const [clientFinancialsSortConfig, setClientFinancialsSortConfig] = useState<SortConfig>(null);


    // --- Time Navigation Helpers ---
    const handlePrev = () => {
        // FIX: Replace sub... functions with add... functions with negative values.
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
            // FIX: Use helper function
            start = getStartOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            label = `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy', { locale: es })}`;
        } else if (period === 'month') {
            // FIX: Use helper function
            start = getStartOfMonth(currentDate);
            end = endOfMonth(currentDate);
            label = format(currentDate, 'MMMM yyyy', { locale: es });
        } else {
            // FIX: Use helper function
            start = getStartOfYear(currentDate);
            end = endOfYear(currentDate);
            label = format(currentDate, 'yyyy');
        }
        return { start, end, label };
    }, [currentDate, period]);

    // --- Main Data Filtering ---
    const filteredAppointments = useMemo(() => {
        const { start, end } = dateRange;
        return appointments.filter(apt => {
            if (!start || !end) return true;
            return isWithinInterval(new Date(apt.date), { start, end });
        });
    }, [appointments, dateRange]);

    const isBillable = (statusId: string) => statuses.find(s => s.id === statusId)?.isBillable || false;

    // --- KPI Summary Calculation ---
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

            // Revenue / Pending / Attended Clients / Hours
            if (status?.isBillable) {
                revenue += apt.price;
                attendedClientIds.add(apt.clientId);
                totalHours += apt.durationMinutes / 60;
            } else if (!isCancelled) {
                pending += apt.price;
            }

            // Cost Calculation
            if (staffMember && status?.isBillable) { // Only count cost for completed appointments
                const hours = apt.durationMinutes / 60;
                const hourlyRate = staffMember.rates?.[apt.serviceTypeId] ?? staffMember.defaultRate;
                cost += hours * hourlyRate;
            }
        });

        const profit = revenue - cost;
        const attendedClientsCount = attendedClientIds.size;

        return {
            revenue,
            pending,
            cost,
            profit,
            attendedClientsCount,
            totalHours,
            profitPerClient: attendedClientsCount > 0 ? profit / attendedClientsCount : 0,
            profitPerHour: totalHours > 0 ? profit / totalHours : 0
        };
    }, [filteredAppointments, statuses, staff]);


    // --- Chart Data ---
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

    const staffPerformance = useMemo(() => {
        let stats = staff.map(member => {
            const memberApts = filteredAppointments.filter(a => 
                a.staffId === member.id && 
                isBillable(a.statusId) &&
                (teamServiceFilter === '' || a.serviceTypeId === teamServiceFilter)
            );
            
            let revenue = 0;
            let totalCost = 0;
            let totalHours = 0;

            memberApts.forEach(apt => {
                const hours = apt.durationMinutes / 60;
                const hourlyRate = member.rates?.[apt.serviceTypeId] ?? member.defaultRate;
                
                revenue += apt.price;
                totalCost += hours * hourlyRate;
                totalHours += hours;
            });

            return {
                name: member.name,
                revenue,
                cost: totalCost,
                profit: revenue - totalCost,
                hours: Number(totalHours.toFixed(1)),
                count: memberApts.length
            };
        });

        if (teamSortConfig) {
            stats.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (teamSortConfig.key) {
                    case 'name': aValue = a.name; bValue = b.name; break;
                    case 'count': aValue = a.count; bValue = b.count; break;
                    case 'hours': aValue = a.hours; bValue = b.hours; break;
                    case 'revenue': aValue = a.revenue; bValue = b.revenue; break;
                    case 'cost': aValue = a.cost; bValue = b.cost; break;
                    case 'profit': aValue = a.profit; bValue = b.profit; break;
                    default: return 0;
                }

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return teamSortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return teamSortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0;
            });
        } else {
            // Default sort
            stats.sort((a,b) => b.profit - a.profit);
        }

        return stats;
    }, [filteredAppointments, staff, statuses, teamServiceFilter, teamSortConfig]);

    const clientFinancials = useMemo(() => {
        let map: Record<string, { id: string, name: string, spent: number, pending: number, count: number }> = {};
        clients.forEach(c => map[c.id] = { id: c.id, name: c.name, spent: 0, pending: 0, count: 0 });
        
        filteredAppointments.forEach(apt => {
            if(!map[apt.clientId]) return;
            
            const status = statuses.find(s => s.id === apt.statusId);
            if (!status) return;
            const isCancelled = status.name.toLowerCase().includes('cancel') || status.name.toLowerCase().includes('anul');

            if (isCancelled) return;

            if (status.isBillable) {
                map[apt.clientId].spent += apt.price;
            } else {
                map[apt.clientId].pending += apt.price;
            }
            map[apt.clientId].count += 1;
        });

        let results = Object.values(map)
            .filter(c => c.spent > 0 || c.pending > 0)
            .filter(c => {
                const lowerSearch = clientSearch.toLowerCase();
                const client = clients.find(cl => cl.id === c.id);
                return c.name.toLowerCase().includes(lowerSearch) ||
                       client?.email?.toLowerCase().includes(lowerSearch) ||
                       client?.phone?.toLowerCase().includes(lowerSearch);
            });

        if (clientFinancialsSortConfig) {
            results.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (clientFinancialsSortConfig.key) {
                    case 'name': aValue = a.name; bValue = b.name; break;
                    case 'count': aValue = a.count; bValue = b.count; break;
                    case 'spent': aValue = a.spent; bValue = b.spent; break;
                    case 'pending': aValue = a.pending; bValue = b.pending; break;
                    default: return 0;
                }

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return clientFinancialsSortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return clientFinancialsSortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0;
            });
        } else {
            // Default sort
            results.sort((a,b) => (b.spent + b.pending) - (a.spent + a.pending));
        }

        return results;
    }, [filteredAppointments, clients, statuses, clientSearch, clientFinancialsSortConfig]);

    // Sorting Logic
    const requestTeamSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (teamSortConfig && teamSortConfig.key === key && teamSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setTeamSortConfig({ key, direction });
    };

    const getTeamSortIndicator = (key: string) => {
        if (!teamSortConfig || teamSortConfig.key !== key) return null;
        return teamSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    const requestClientFinancialsSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (clientFinancialsSortConfig && clientFinancialsSortConfig.key === key && clientFinancialsSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setClientFinancialsSortConfig({ key, direction });
    };

    const getClientFinancialsSortIndicator = (key: string) => {
        if (!clientFinancialsSortConfig || clientFinancialsSortConfig.key !== key) return null;
        return clientFinancialsSortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 pb-20">
                {/* 1. Header & Time Controls */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Informe Financiero</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Analiza el rendimiento económico y del equipo</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                         {/* Period Type Selector */}
                        <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex">
                            {([['week', 'Semana'], ['month', 'Mes'], ['year', 'Año'], ['all', 'Todo']] as const).map(([val, label]) => (
                                <button 
                                    key={val} 
                                    onClick={() => setPeriod(val as any)} 
                                    className={`px-3 py-1.5 capitalize text-sm rounded-md transition-colors ${period === val ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-400 font-medium shadow-sm' : 'text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Date Navigation */}
                        {period !== 'all' && (
                            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0.5">
                                <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" /></button>
                                <span className="px-4 text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[140px] text-center capitalize">
                                    {dateRange.label}
                                </span>
                                <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" /></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. KPI Summary Widget */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Realizado</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryMetrics.revenue)}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Ingresos facturados</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <PiggyBank className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Proyección</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryMetrics.pending)}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Pendiente de cobro</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <Briefcase className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Gastos</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryMetrics.cost)}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Coste Salarial Equipo</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Neto</span>
                        </div>
                        <div className={`text-2xl font-bold ${summaryMetrics.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(summaryMetrics.profit)}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Beneficio antes de impuestos</p>
                    </div>
                </div>

                {/* NEW: Profitability KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Users className="w-3 h-3 mr-1"/> Clientes Atendidos</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{summaryMetrics.attendedClientsCount}</div>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Clock className="w-3 h-3 mr-1"/> Horas Realizadas</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{summaryMetrics.totalHours.toFixed(1)}h</div>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Target className="w-3 h-3 mr-1"/> Beneficio / Cliente</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryMetrics.profitPerClient)}</div>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Beneficio / Hora</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(summaryMetrics.profitPerHour)}</div>
                    </div>
                </div>


                {/* Sub-navigation Tabs */}
                <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <button onClick={() => setSubTab('general')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${subTab === 'general' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'}`}>
                        <TrendingUp className="w-4 h-4 mr-2" /> General
                    </button>
                    <button onClick={() => setSubTab('team')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${subTab === 'team' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'}`}>
                        <Users className="w-4 h-4 mr-2" /> Equipo
                    </button>
                    <button onClick={() => setSubTab('clients')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${subTab === 'clients' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'}`}>
                        <DollarSign className="w-4 h-4 mr-2" /> Clientes
                    </button>
                </div>

                {/* --- TAB CONTENT --- */}
                
                {/* 1. GENERAL TAB */}
                {subTab === 'general' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                        <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Eficiencia: Ingresos vs Horas Invertidas</h3>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={efficiencyMetrics}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#0f766e" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                                    <Tooltip formatter={(val, name, props) => [name === 'Ingresos (€)' ? formatCurrency(val as number) : `${(val as number).toFixed(1)} h`, name]} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="revenue" name="Ingresos (€)" fill="#0f766e" barSize={30} radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="hours" name="Horas Invertidas" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* 2. TEAM TAB */}
                {subTab === 'team' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                             <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rendimiento (Beneficio Neto)</h3>
                             <select 
                                className="text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm p-2"
                                value={teamServiceFilter}
                                onChange={e => setTeamServiceFilter(e.target.value)}
                             >
                                 <option value="">Todos los tratamientos</option>
                                 {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                        </div>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={staffPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(val) => formatCurrency(val as number)} />
                                    <Legend />
                                    <Bar dataKey="revenue" name="Ingresos Generados" fill="#0f766e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" name="Coste Salarial" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="profit" name="Beneficio Neto" fill="#10B981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8">
                            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Detalle Numérico</h4>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 text-left rounded-l-lg cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => requestTeamSort('name')}>
                                                <div className="flex items-center text-gray-600 dark:text-gray-400">Miembro {getTeamSortIndicator('name')}</div>
                                            </th>
                                            <th className="px-4 py-2 text-right cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => requestTeamSort('count')}>
                                                <div className="flex items-center justify-end text-gray-600 dark:text-gray-400">Citas {getTeamSortIndicator('count')}</div>
                                            </th>
                                            <th className="px-4 py-2 text-right cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => requestTeamSort('hours')}>
                                                <div className="flex items-center justify-end text-gray-600 dark:text-gray-400">Horas {getTeamSortIndicator('hours')}</div>
                                            </th>
                                            <th className="px-4 py-2 text-right cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => requestTeamSort('revenue')}>
                                                <div className="flex items-center justify-end text-gray-600 dark:text-gray-400">Ingresos {getTeamSortIndicator('revenue')}</div>
                                            </th>
                                            <th className="px-4 py-2 text-right cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => requestTeamSort('cost')}>
                                                <div className="flex items-center justify-end text-gray-600 dark:text-gray-400">Coste {getTeamSortIndicator('cost')}</div>
                                            </th>
                                            <th className="px-4 py-2 text-right font-bold text-teal-600 rounded-r-lg cursor-pointer hover:text-teal-900 dark:hover:text-teal-400" onClick={() => requestTeamSort('profit')}>
                                                <div className="flex items-center justify-end">Beneficio {getTeamSortIndicator('profit')}</div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {staffPerformance.map(s => (
                                            <tr key={s.name}>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                                                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{s.count}</td>
                                                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{s.hours}h</td>
                                                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(s.revenue)}</td>
                                                <td className="px-4 py-3 text-right text-red-600 dark:text-red-500">-{formatCurrency(s.cost)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-teal-600 dark:text-teal-400">{formatCurrency(s.profit)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. CLIENTS TAB */}
                {subTab === 'clients' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700 flex flex-col h-[600px] animate-fade-in-up">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Desglose por Cliente</h3>
                            <div className="relative w-full sm:w-auto">
                                <input 
                                    type="text" 
                                    placeholder="Buscar cliente, email o teléfono..." 
                                    value={clientSearch}
                                    onChange={e => setClientSearch(e.target.value)}
                                    className="pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-teal-500 focus:border-teal-500 w-full"
                                />
                                <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-3" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => requestClientFinancialsSort('name')}>
                                            <div className="flex items-center">Cliente {getClientFinancialsSortIndicator('name')}</div>
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => requestClientFinancialsSort('count')}>
                                            <div className="flex items-center justify-end">Citas {getClientFinancialsSortIndicator('count')}</div>
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => requestClientFinancialsSort('spent')}>
                                            <div className="flex items-center justify-end">Realizado (Cobrado) {getClientFinancialsSortIndicator('spent')}</div>
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => requestClientFinancialsSort('pending')}>
                                            <div className="flex items-center justify-end">Futuro (Pendiente) {getClientFinancialsSortIndicator('pending')}</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {clientFinancials.map((client) => (
                                        <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button onClick={() => onViewClient(client.id)} className="text-sm font-medium text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400">
                                                    {client.name}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">{client.count}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-teal-600 dark:text-teal-400">{formatCurrency(client.spent)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-600 dark:text-gray-400">{formatCurrency(client.pending)}</td>
                                        </tr>
                                    ))}
                                    {clientFinancials.length === 0 && (
                                        <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-600 dark:text-gray-400">No hay datos financieros para este periodo.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};