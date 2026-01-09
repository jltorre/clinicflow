import React, { useState, useMemo } from 'react';
import { Client, ServiceType, Staff, Appointment, AppStatus } from '../types';
import { Plus, Trash2, Edit2, Mail, Phone, Calendar, Clock, Search, BadgeCheck, DollarSign, ArrowUp, ArrowDown, Eye, EyeOff, BarChart2, CheckSquare, Users, TrendingUp, Briefcase } from 'lucide-react';
// Fix: Correct import syntax for format
// FIX: Removed subMonths from date-fns import as it's not available in the user's environment.
import { format, isFuture, isPast } from 'date-fns';
// Fix: Correct import syntax for es
import { es } from 'date-fns/locale';

// FIX: Added helper function for subMonths as it's not available in the user's environment.
function subMonths(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - amount);
  return d;
}

// --- Client Management ---

interface ClientListProps {
  clients: Client[];
  appointments: Appointment[];
  statuses: AppStatus[];
  onAdd: () => void;
  onEdit: (c: Client) => void;
  onDeleteRequest: (c: Client) => void;
  onViewClient: (id: string) => void; 
}

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

const isBillable = (statusId: string, allStatuses: AppStatus[]) => allStatuses.find(s => s.id === statusId)?.isBillable || false;

const KPIWidget: React.FC<{ icon: React.ReactNode; label: string; value: string | number; }> = ({ icon, label, value }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">{icon}</div>
            <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
            </div>
        </div>
    </div>
);

export const ClientList: React.FC<ClientListProps> = ({ clients, appointments, statuses, onAdd, onEdit, onDeleteRequest, onViewClient }) => {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'totalSpent', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const clientsWithStats = useMemo(() => {
    return clients.map(client => {
      const clientApts = appointments.filter(apt => apt.clientId === client.id);
      const billableApts = clientApts.filter(apt => isBillable(apt.statusId, statuses));
      
      const totalSpent = billableApts.reduce((sum, apt) => sum + apt.price, 0);
      const visits = billableApts.length;
      
      const futureApts = clientApts
        .filter(apt => isFuture(new Date(apt.date)))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let lastVisit: string | null = null;
      if (visits > 0) {
        const lastAptDate = billableApts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
        if(lastAptDate) lastVisit = new Date(lastAptDate).toISOString();
      }

      return {
        ...client,
        totalSpent,
        visits,
        lastVisit,
        nextVisit: futureApts.length > 0 ? futureApts[0].date : null
      };
    });
  }, [clients, appointments, statuses]);

  const sortedClients = useMemo(() => {
    let sortableClients = [...clientsWithStats];
    
    // Apply search filter
    if (search) {
        const lowerSearch = search.toLowerCase();
        sortableClients = sortableClients.filter(c => 
            c.name.toLowerCase().includes(lowerSearch) ||
            c.email.toLowerCase().includes(lowerSearch) ||
            c.phone.toLowerCase().includes(lowerSearch)
        );
    }

    if (sortConfig) {
        sortableClients.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'name': aValue = a.name; bValue = b.name; break;
                case 'visits': aValue = a.visits; bValue = b.visits; break;
                case 'totalSpent': aValue = a.totalSpent; bValue = b.totalSpent; break;
                case 'lastVisit':
                    aValue = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
                    bValue = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
                    break;
                case 'nextVisit':
                    aValue = a.nextVisit ? new Date(a.nextVisit).getTime() : Infinity;
                    bValue = b.nextVisit ? new Date(b.nextVisit).getTime() : Infinity;
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
    return sortableClients;
  }, [clientsWithStats, search, sortConfig]);

  // Client KPIs
  const clientKPIs = useMemo(() => {
    const totalVisits = clientsWithStats.reduce((sum, c) => sum + c.visits, 0);
    const totalRevenue = clientsWithStats.reduce((sum, c) => sum + c.totalSpent, 0);
    const threeMonthsAgo = subMonths(new Date(), 3);
    const activeClients = new Set(
        appointments.filter(a => isBillable(a.statusId, statuses) && new Date(a.date) > threeMonthsAgo).map(a => a.clientId)
    ).size;

    return {
        totalClients: clients.length,
        totalVisits,
        averageTicket: totalVisits > 0 ? formatCurrency(totalRevenue / totalVisits) : formatCurrency(0),
        activeClients
    }
  }, [clients, clientsWithStats, appointments, statuses]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedClients.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClients = sortedClients.slice(indexOfFirstItem, indexOfLastItem);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
        return null;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  return (
    <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Base de datos de pacientes</p>
                </div>
                <button onClick={onAdd} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center shadow-sm shrink-0 md:order-last">
                    <Plus className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Nuevo Cliente</span>
                </button>
            </div>

             {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPIWidget icon={<Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Clientes Totales" value={clientKPIs.totalClients} />
                <KPIWidget icon={<BarChart2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Visitas Realizadas" value={clientKPIs.totalVisits} />
                <KPIWidget icon={<TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Ticket Medio" value={clientKPIs.averageTicket} />
                <KPIWidget icon={<CheckSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Activos (3m)" value={clientKPIs.activeClients} />
            </div>

             <div className="relative">
                <input 
                    type="text" 
                    placeholder="Buscar nombre, email o teléfono..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('name')}>
                                    <div className="flex items-center">Cliente {getSortIndicator('name')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('visits')}>
                                    <div className="flex items-center">Visitas {getSortIndicator('visits')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('totalSpent')}>
                                    <div className="flex items-center">Gastado {getSortIndicator('totalSpent')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('nextVisit')}>
                                    <div className="flex items-center">Próx. Visita {getSortIndicator('nextVisit')}</div>
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {currentClients.map(client => (
                                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => onViewClient(client.id)}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-lg shrink-0">
                                                {client.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white text-sm">{client.name}</h3>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                    <Phone className="w-3 h-3 text-gray-400 shrink-0"/>
                                                    <span>{client.phone || 'N/A'}</span>
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                    <Mail className="w-3 h-3 text-gray-400 shrink-0"/>
                                                    <span>{client.email || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{client.visits}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(client.totalSpent)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                        {client.nextVisit ? format(new Date(client.nextVisit), 'dd MMM yyyy', {locale: es}) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex space-x-2 justify-end">
                                            <button onClick={(e) => { e.stopPropagation(); onEdit(client); }} className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(client); }} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, sortedClients.length)}</span> de <span className="font-medium">{sortedClients.length}</span>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Anterior</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Siguiente</button>
                        </div>
                    </div>
                 )}
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-4 grid-cols-1 md:hidden">
                {currentClients.map(client => (
                    <div key={client.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700" onClick={() => onViewClient(client.id)}>
                        <div className="flex items-start justify-between">
                             <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-lg shrink-0">
                                    {client.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-base">{client.name}</h3>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">{client.phone}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">{client.email}</div>
                                </div>
                            </div>
                             <div className="flex space-x-1">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(client); }} className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(client); }} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                       
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2 text-center">
                           <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Visitas</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{client.visits}</div>
                           </div>
                           <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Gastado</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatCurrency(client.totalSpent)}</div>
                           </div>
                           <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Próx. Visita</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    {client.nextVisit ? format(new Date(client.nextVisit), 'd MMM yy', {locale: es}) : '-'}
                                </div>
                           </div>
                        </div>
                    </div>
                ))}
            </div>

             {/* Mobile Pagination */}
             {totalPages > 1 && (
                 <div className="md:hidden mt-6 flex items-center justify-between">
                     <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">Anterior</button>
                     <div className="text-sm text-gray-600 dark:text-gray-400">
                         Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                     </div>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">Siguiente</button>
                 </div>
             )}

            {sortedClients.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    No se encontraron clientes.
                </div>
            )}
        </div>
    </div>
  );
};

// --- Staff Management ---

interface StaffListProps {
    staff: Staff[];
    services: ServiceType[];
    appointments: Appointment[];
    statuses: AppStatus[];
    onAdd: () => void;
    onEdit: (s: Staff) => void;
    onDeleteRequest: (s: Staff) => void;
    onViewStaff: (id: string) => void;
}

export const StaffList: React.FC<StaffListProps> = ({ staff, services, appointments, statuses, onAdd, onEdit, onDeleteRequest, onViewStaff }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'realizedRevenue', direction: 'desc' });

    const staffWithStats = useMemo(() => {
        return staff.map(member => {
            const memberApts = appointments.filter(a => a.staffId === member.id);
            let realizedRevenue = 0;
            let scheduledRevenue = 0;
            let realizedHours = 0;
            let scheduledHours = 0;

            memberApts.forEach(apt => {
                const status = statuses.find(s => s.id === apt.statusId);
                const isCancelled = status?.name.toLowerCase().includes('cancel') || status?.name.toLowerCase().includes('anul');
                
                if (isCancelled) return;

                if (isBillable(apt.statusId, statuses)) {
                    realizedRevenue += apt.price;
                    realizedHours += apt.durationMinutes / 60;
                } else if (isFuture(new Date(apt.date))) {
                    scheduledRevenue += apt.price;
                    scheduledHours += apt.durationMinutes / 60;
                }
            });
            return {
                ...member,
                realizedRevenue,
                scheduledRevenue,
                realizedHours: Number(realizedHours.toFixed(1)),
                scheduledHours: Number(scheduledHours.toFixed(1)),
            };
        });
    }, [staff, appointments, statuses]);

    const sortedStaff = useMemo(() => {
        let sortableStaff = [...staffWithStats];
        if (sortConfig) {
            sortableStaff.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (sortConfig.key) {
                    case 'name': aValue = a.name; bValue = b.name; break;
                    case 'realizedHours': aValue = a.realizedHours; bValue = b.realizedHours; break;
                    case 'scheduledHours': aValue = a.scheduledHours; bValue = b.scheduledHours; break;
                    case 'realizedRevenue': aValue = a.realizedRevenue; bValue = b.realizedRevenue; break;
                    case 'scheduledRevenue': aValue = a.scheduledRevenue; bValue = b.scheduledRevenue; break;
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
        return sortableStaff;
    }, [staffWithStats, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 pb-20">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipo</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Gestiona especialistas y analiza su rendimiento</p>
                    </div>
                    <button onClick={onAdd} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Nuevo Miembro
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('name')}>
                                        <div className="flex items-center">Miembro {getSortIndicator('name')}</div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('realizedHours')}>
                                        <div className="flex items-center">Horas Realizadas {getSortIndicator('realizedHours')}</div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('scheduledHours')}>
                                        <div className="flex items-center">Horas Programadas {getSortIndicator('scheduledHours')}</div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('realizedRevenue')}>
                                        <div className="flex items-center">Ingresos Realizados {getSortIndicator('realizedRevenue')}</div>
                                    </th>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('scheduledRevenue')}>
                                        <div className="flex items-center">Ingresos Programados {getSortIndicator('scheduledRevenue')}</div>
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedStaff.map(member => (
                                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-shadow cursor-pointer" onClick={() => onViewStaff(member.id)}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 ${member.color}`}>
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">{member.name}</h3>
                                                    <p className="text-xs text-gray-500">Coste base: {formatCurrency(member.defaultRate)}/h</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{member.realizedHours}h</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{member.scheduledHours}h</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(member.realizedRevenue)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatCurrency(member.scheduledRevenue)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex space-x-2 justify-end">
                                                <button onClick={(e) => { e.stopPropagation(); onEdit(member); }} className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(member); }} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Service Management ---
type ServiceWithStats = ServiceType & { 
    activeCount: number; 
    finishedCount: number;
    realizedRevenue: number;
    scheduledRevenue: number;
};

interface ServiceListProps {
  services: ServiceType[];
  clients: Client[];
  appointments: Appointment[];
  // FIX: Added statuses prop to fix undefined variable error.
  statuses: AppStatus[];
  onAdd: () => void;
  onEdit: (s: ServiceType) => void;
  onDeleteRequest: (s: ServiceWithStats) => void;
  onViewService: (id: string) => void;
}

// FIX: Added statuses to destructuring props.
export const ServiceList: React.FC<ServiceListProps> = ({ services, clients, appointments, statuses, onAdd, onEdit, onDeleteRequest, onViewService }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'realizedRevenue', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const servicesWithStats = useMemo(() => {
        return services.map(service => {
            const clientIdsWithService = new Set<string>();
            let realizedRevenue = 0;
            let scheduledRevenue = 0;

            appointments.forEach(apt => {
                if (apt.serviceTypeId === service.id) {
                    clientIdsWithService.add(apt.clientId);
                    // FIX: statuses is now defined and can be used here.
                    if (isBillable(apt.statusId, statuses)) {
                        realizedRevenue += apt.price;
                    } else if (isFuture(new Date(apt.date))) {
                        scheduledRevenue += apt.price;
                    }
                }
            });

            let activeCount = 0;
            let finishedCount = 0;

            clientIdsWithService.forEach(clientId => {
                const client = clients.find(c => c.id === clientId);
                if (client?.finishedTreatments?.includes(service.id)) {
                    finishedCount++;
                } else {
                    activeCount++;
                }
            });

            return { ...service, activeCount, finishedCount, realizedRevenue, scheduledRevenue };
        });
        // FIX: Added statuses to dependency array.
    }, [services, clients, appointments, statuses]);

    const serviceKPIs = useMemo(() => {
        const totalRealized = servicesWithStats.reduce((sum, s) => sum + s.realizedRevenue, 0);
        const totalScheduled = servicesWithStats.reduce((sum, s) => sum + s.scheduledRevenue, 0);
        const mostProfitable = [...servicesWithStats].sort((a,b) => b.realizedRevenue - a.realizedRevenue)[0];
        return {
            totalTreatments: services.length,
            totalRealized: formatCurrency(totalRealized),
            totalScheduled: formatCurrency(totalScheduled),
            mostProfitable: mostProfitable?.name || 'N/A'
        };
    }, [servicesWithStats, services.length]);

    const sortedServices = useMemo(() => {
        let sortableServices: ServiceWithStats[] = [...servicesWithStats];
        if (sortConfig) {
            sortableServices.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (sortConfig.key) {
                    case 'name': aValue = a.name; bValue = b.name; break;
                    case 'activeCount': aValue = a.activeCount; bValue = b.activeCount; break;
                    case 'realizedRevenue': aValue = a.realizedRevenue; bValue = b.realizedRevenue; break;
                    case 'scheduledRevenue': aValue = a.scheduledRevenue; bValue = b.scheduledRevenue; break;
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
        return sortableServices;
    }, [servicesWithStats, sortConfig]);

    const totalPages = Math.ceil(sortedServices.length / itemsPerPage);
    const currentServices = sortedServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };

  return (
    <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tratamientos</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Catálogo de servicios y análisis de rendimiento</p>
                </div>
                <button onClick={onAdd} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPIWidget icon={<Briefcase className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Tratamientos" value={serviceKPIs.totalTreatments} />
                <KPIWidget icon={<DollarSign className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Ingresos Realizados" value={serviceKPIs.totalRealized} />
                <KPIWidget icon={<Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Ingresos Programados" value={serviceKPIs.totalScheduled} />
                <KPIWidget icon={<TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Trat. Más Rentable" value={serviceKPIs.mostProfitable} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('name')}>
                                    <div className="flex items-center">Nombre {getSortIndicator('name')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('activeCount')}>
                                    <div className="flex items-center">Clientes Activos {getSortIndicator('activeCount')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('realizedRevenue')}>
                                    <div className="flex items-center">Ingresos Realizados {getSortIndicator('realizedRevenue')}</div>
                                </th>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('scheduledRevenue')}>
                                    <div className="flex items-center">Ingresos Programados {getSortIndicator('scheduledRevenue')}</div>
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {currentServices.map(service => (
                                <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => onViewService(service.id)}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${service.color}`}>
                                            {service.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center">
                                            <Users className="w-4 h-4 mr-1.5 text-green-500" />
                                            {service.activeCount}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-semibold">{formatCurrency(service.realizedRevenue)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatCurrency(service.scheduledRevenue)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex space-x-2 justify-end">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onEdit(service); }} 
                                                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDeleteRequest(service); }}
                                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedServices.length)}</span> de <span className="font-medium">{sortedServices.length}</span>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Anterior</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Siguiente</button>
                        </div>
                    </div>
                 )}
            </div>
        </div>
    </div>
  );
};