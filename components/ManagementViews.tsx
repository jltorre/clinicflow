import React, { useState, useMemo } from 'react';
import { Client, ServiceType, Staff, Appointment, AppStatus, InventoryItem, InventoryMovement } from '../types';
import { Plus, Trash2, Edit2, Mail, Phone, Calendar as CalendarIcon, Clock, Search, BadgeCheck, DollarSign, ArrowUp, ArrowDown, Eye, EyeOff, BarChart2, CheckSquare, Users, TrendingUp, Briefcase, User, Filter, ChevronUp, ChevronDown, MoreHorizontal, CheckCircle, AlertCircle, ArrowRight, Box, History, PackageOpen, Download, Wallet, ArrowLeft } from 'lucide-react';
import { dataService } from '../services/dataService';
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

const KPIWidget: React.FC<{ icon: any; label: string; value: string | number; }> = ({ icon: Icon, label, value }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                {React.isValidElement(Icon) ? Icon : (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null && 'render' in Icon)) ? <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400" /> : null}
            </div>
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
      const billableApts = appointments.filter(apt => apt.clientId === client.id && isBillable(apt.statusId, statuses));
      const totalSpent = billableApts.reduce((sum, apt) => sum + apt.price + (apt.inventoryTotal || 0), 0);
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

// --- Inventory Management ---

interface InventoryListProps {
  inventory: InventoryItem[];
  appointments: Appointment[];
  year: number;
  onYearChange: (year: number) => void;
  onAdd: () => void;
  onEdit: (item: InventoryItem) => void;
  onUpdate?: (item: InventoryItem) => void;
  onViewHistory: (item: InventoryItem) => void;
  onDeleteRequest: (item: InventoryItem) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ inventory, appointments, year, onYearChange, onAdd, onEdit, onUpdate, onViewHistory, onDeleteRequest }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [addStockItem, setAddStockItem] = useState<InventoryItem | null>(null);
  const [addStockAmount, setAddStockAmount] = useState(1);
  const [addStockCost, setAddStockCost] = useState(0);
  const [allMovements, setAllMovements] = useState<InventoryMovement[]>([]);

  const fetchAllMovements = async () => {
    const uid = (window as any).currentUserUid || 'guest';
    const data = await dataService.getInventoryMovements(uid);
    setAllMovements(data);
  };

  React.useEffect(() => {
    fetchAllMovements();
  }, [inventory]);

  const handleAddStock = async () => {
      if (!addStockItem) return;
      const uid = (window as any).currentUserUid || 'guest';
      const updatedItem = { ...addStockItem, stock: addStockItem.stock + addStockAmount };
      await dataService.saveInventoryItem(updatedItem, uid);
      
      await dataService.saveInventoryMovement({
          id: '',
          itemId: addStockItem.id,
          type: 'purchase',
          quantity: addStockAmount,
          date: new Date().toISOString(),
          price: addStockCost,
          notes: `Entrada de stock: ${addStockAmount} unidades compradas a ${addStockCost}€`,
          createdAt: Date.now()
      }, uid);

      if (onUpdate) {
          onUpdate(updatedItem);
      }
      setAddStockItem(null);
  };

  const filteredInventory = useMemo(() => {
    let result = [...inventory];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(lower) || i.category?.toLowerCase().includes(lower));
    }

    result.sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [inventory, searchTerm, sortConfig]);

  const requestSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return <MoreHorizontal className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // Financial Metrics
  const yearMovements = useMemo(() => {
    return allMovements.filter(m => new Date(m.date).getFullYear() === year);
  }, [allMovements, year]);

  const productMetrics = useMemo(() => {
    const metrics: Record<string, { sold: number, revenue: number, spent: number }> = {};
    
    inventory.forEach(item => {
        metrics[item.id] = { sold: 0, revenue: 0, spent: 0 };
    });

    yearMovements.forEach(m => {
        if (!metrics[m.itemId]) return;
        if (m.type === 'sale') {
            metrics[m.itemId].sold += Math.abs(m.quantity);
            metrics[m.itemId].revenue += Math.abs(m.quantity) * (m.price || 0);
        } else if (m.type === 'purchase') {
            metrics[m.itemId].spent += m.quantity * (m.price || 0);
        }
    });

    return metrics;
  }, [inventory, yearMovements]);

  const totalStockValue = inventory.reduce((acc, item) => acc + (item.stock * item.costPrice), 0);
  const totalPotentialRevenue = inventory.reduce((acc, item) => acc + (item.stock * item.salePrice), 0);
  
  const totalRealRevenue = (Object.values(productMetrics) as Array<{revenue: number}>).reduce((acc, m) => acc + m.revenue, 0);
  const totalRealSpent = (Object.values(productMetrics) as Array<{spent: number}>).reduce((acc, m) => acc + m.spent, 0);
  const totalRealProfit = totalRealRevenue - totalRealSpent;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventario</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Gestiona tus productos, stock y precios de venta.</p>
        </div>
        <div className="flex items-center gap-3">
            <select 
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                value={year}
                onChange={e => onYearChange(Number(e.target.value))}
            >
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={onAdd} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Nuevo Producto</span>
            </button>
        </div>
      </div>

      {addStockItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Añadir Stock</h3>
                      <p className="text-sm text-gray-500">{addStockItem.name}</p>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                          <input type="number" min="1" className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-sm text-gray-900 dark:text-white" value={addStockAmount} onChange={e => setAddStockAmount(Number(e.target.value))} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Unitario (€)</label>
                          <input type="number" step="0.01" className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-sm text-gray-900 dark:text-white" value={addStockCost} onChange={e => setAddStockCost(Number(e.target.value))} />
                      </div>
                  </div>
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                      <button onClick={() => setAddStockItem(null)} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium">Cancelar</button>
                      <button onClick={handleAddStock} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold">Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget icon={<Box className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Valor Stock (Costo)" value={formatCurrency(totalStockValue)} />
        <KPIWidget icon={<TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label={`Ventas Reales (${year})`} value={formatCurrency(totalRealRevenue)} />
        <KPIWidget icon={<ArrowDown className="w-5 h-5 text-red-600 dark:text-red-400" />} label={`Compras Reales (${year})`} value={formatCurrency(totalRealSpent)} />
        <KPIWidget icon={<DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} label={`Beneficio Real (${year})`} value={formatCurrency(totalRealProfit)} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o categoría..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestSort('name')}>
                  <div className="flex items-center gap-2 whitespace-nowrap">Producto {getSortIndicator('name')}</div>
                </th>
                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestSort('category')}>
                  <div className="flex items-center gap-2 whitespace-nowrap">Categoría {getSortIndicator('category')}</div>
                </th>
                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-right" onClick={() => requestSort('stock')}>
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">Stock {getSortIndicator('stock')}</div>
                </th>
                <th className="px-6 py-4 font-semibold text-teal-600 dark:text-teal-400 text-right whitespace-nowrap">Vendido ({year})</th>
                <th className="px-6 py-4 font-semibold text-teal-600 dark:text-teal-400 text-right whitespace-nowrap">Ingreso ({year})</th>
                <th className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">Bf. Real ({year})</th>
                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestSort('costPrice')}>
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">Costo {getSortIndicator('costPrice')}</div>
                </th>
                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestSort('salePrice')}>
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">PVP {getSortIndicator('salePrice')}</div>
                </th>
                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInventory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                      {item.description && <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                      {item.category || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`font-bold ${item.stock <= (item.minStock || 5) ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {item.stock}
                    </div>
                    {item.stock <= (item.minStock || 5) && <div className="text-[10px] text-red-500 uppercase font-bold">Stock Bajo</div>}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{productMetrics[item.id]?.sold || 0}</td>
                  <td className="px-6 py-4 text-right font-medium text-teal-600 dark:text-teal-400">{formatCurrency(productMetrics[item.id]?.revenue || 0)}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency((productMetrics[item.id]?.revenue || 0) - (productMetrics[item.id]?.spent || 0))}</td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.costPrice)}</td>
                  <td className="px-6 py-4 text-right font-medium text-teal-600 dark:text-teal-400">{formatCurrency(item.salePrice)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setAddStockItem(item); setAddStockCost(item.costPrice); setAddStockAmount(1); }} 
                            className="p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded"
                            title="Añadir Stock"
                        >
                            <PackageOpen className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onViewHistory(item); }} 
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                            title="Ver Historial"
                        >
                            <History className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(item); }} 
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Editar"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteRequest(item); }} 
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

      {/* Removed old combined history/add modal logic */}
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
                        realizedRevenue += apt.price + (apt.inventoryTotal || 0);
                    } else if (isFuture(new Date(apt.date))) {
                        scheduledRevenue += apt.price + (apt.inventoryTotal || 0);
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
                <KPIWidget icon={<CalendarIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />} label="Ingresos Programados" value={serviceKPIs.totalScheduled} />
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

export const InventoryMovementDetailPage: React.FC<{
    item: InventoryItem;
    onBack: () => void;
    onDeleteMovement: (movement: InventoryMovement) => Promise<any>;
    onSaveMovement: (movement: InventoryMovement, oldQuantity: number) => Promise<any>;
    formatCurrency: (amount: number) => string;
    initialYear?: number;
}> = ({ item, onBack, onDeleteMovement, onSaveMovement, formatCurrency, initialYear }) => {
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [editingMovement, setEditingMovement] = useState<InventoryMovement | null>(null);
    const [editForm, setEditForm] = useState({ quantity: 0, price: 0, notes: '', date: '' });
    const [yearFilter, setYearFilter] = useState<number>(initialYear || new Date().getFullYear());
    const [typeFilter, setTypeFilter] = useState<'all' | 'purchase' | 'sale' | 'adjustment'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMovements = async () => {
        setLoading(true);
        const uid = (window as any).currentUserUid || 'guest';
        const data = await dataService.getInventoryMovements(uid, item.id);
        setMovements(data.sort((a,b) => b.createdAt - a.createdAt));
        setLoading(false);
    };

    React.useEffect(() => {
        fetchMovements();
    }, [item.id]);

    const handleEdit = (m: InventoryMovement) => {
        setEditingMovement(m);
        setEditForm({ 
            quantity: m.quantity, 
            price: m.price || 0, 
            notes: m.notes || '',
            date: format(new Date(m.date), "yyyy-MM-dd'T'HH:mm")
        });
    };

    const handleSaveEdit = async () => {
        if (!editingMovement) return;
        const oldQty = editingMovement.quantity;
        const updated = { ...editingMovement, ...editForm, date: new Date(editForm.date).toISOString() };
        await onSaveMovement(updated, oldQty);
        setEditingMovement(null);
        fetchMovements();
    };

    const handleDelete = async (m: InventoryMovement) => {
        const result = await onDeleteMovement(m);
        if (result) {
            fetchMovements();
        }
    };

    const filteredMovements = useMemo(() => {
        return movements.filter(m => {
            const matchesYear = new Date(m.date).getFullYear() === yearFilter;
            const matchesType = typeFilter === 'all' || m.type === typeFilter;
            const matchesSearch = !searchTerm || m.notes?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesYear && matchesType && matchesSearch;
        });
    }, [movements, yearFilter, typeFilter, searchTerm]);

    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
    const currentMovements = filteredMovements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Historial: {item.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Stock actual: <span className="font-bold">{item.stock}</span></p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar en notas..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        className="flex-1 md:flex-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        value={yearFilter}
                        onChange={e => setYearFilter(Number(e.target.value))}
                    >
                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        className="flex-1 md:flex-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as any)}
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="purchase">Compras</option>
                        <option value="sale">Ventas</option>
                        <option value="adjustment">Ajustes</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Fecha</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Tipo</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right">Cantidad</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right">Precio/Costo</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Notas</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Cargando...</td></tr>
                            ) : currentMovements.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No hay movimientos registrados.</td></tr>
                            ) : (
                                currentMovements.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                            {format(new Date(m.date), 'dd/MM/yyyy HH:mm', { locale: es })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                m.type === 'purchase' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                m.type === 'sale' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                            }`}>
                                                {m.type === 'purchase' ? 'Compra' : m.type === 'sale' ? 'Venta' : 'Ajuste'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-gray-400">
                                            {m.price ? formatCurrency(m.price) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                            {m.notes}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {m.type === 'purchase' && (
                                                <div className="flex justify-end space-x-2">
                                                    <button onClick={() => handleEdit(m)} className="p-1 px-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-xs flex items-center gap-1">
                                                        <Edit2 className="w-3 h-3" /> Editar
                                                    </button>
                                                    <button onClick={() => handleDelete(m)} className="p-1 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-xs flex items-center gap-1">
                                                        <Trash2 className="w-3 h-3" /> Borrar
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50">Anterior</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50">Siguiente</button>
                        </div>
                    </div>
                )}
            </div>

            {editingMovement && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Editar Compra</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad</label>
                                <input type="number" min="1" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Costo Unitario (€)</label>
                                <input type="number" step="0.01" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={editForm.price} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas</label>
                                <textarea className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Compra</label>
                                <input type="datetime-local" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSaveEdit} className="flex-1 bg-teal-600 text-white p-2 rounded">Guardar</button>
                                <button onClick={() => setEditingMovement(null)} className="flex-1 border p-2 rounded">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};