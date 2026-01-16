
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  format, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addWeeks, 
  isWeekend, 
  endOfMonth, 
  addMonths, 
  addDays,
  isSameMonth,
  isWithinInterval
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Filter, ZoomIn, ZoomOut, User, LayoutGrid, List as ListIcon, Calendar as CalendarIcon, Clock, Search, CheckCircle, ArrowUp, ArrowDown, Briefcase } from 'lucide-react';
import { Appointment, Client, ServiceType, AppStatus, Staff } from '../types';

interface CalendarViewProps {
  appointments: Appointment[];
  clients: Client[];
  services: ServiceType[];
  statuses: AppStatus[];
  staff: Staff[];
  onAddAppointment: (date?: Date, time?: string, options?: { clientId?: string; serviceTypeId?: string }) => void;
  onEditAppointment: (apt: Appointment) => void;
  onAppointmentDrop?: (apt: Appointment, newDate: Date, newTime: string) => void;
  onAppointmentUpdate?: (apt: Appointment) => void;
  onViewClient: (clientId: string) => void;
  onQuickComplete?: (apt: Appointment) => void;
  pendingContext: { clientId: string; serviceTypeId: string; recommendedDate: Date } | null;
  onClearPendingContext: () => void;
}

type ViewMode = 'list' | 'day' | 'week' | 'month';
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

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  appointments, 
  clients, 
  services,
  statuses,
  staff,
  onAddAppointment, 
  onEditAppointment,
  onAppointmentDrop,
  onAppointmentUpdate,
  onViewClient,
  onQuickComplete,
  pendingContext,
  onClearPendingContext
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showWeekends, setShowWeekends] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [listScope, setListScope] = useState<'week' | 'all'>('week');
  const [now, setNow] = useState(new Date());
  const [slotHeight, setSlotHeight] = useState(64);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const [draggedAptId, setDraggedAptId] = useState<string | null>(null);
  const [resizingAptId, setResizingAptId] = useState<string | null>(null);
  const [resizeType, setResizeType] = useState<'top' | 'bottom' | null>(null);
  const [resizeInitialY, setResizeInitialY] = useState(0);
  const [resizeInitialDuration, setResizeInitialDuration] = useState(0);
  const [resizeInitialStartTime, setResizeInitialStartTime] = useState("");
  const [tempResizeHeight, setTempResizeHeight] = useState<number | null>(null);
  const [tempResizeTop, setTempResizeTop] = useState<number | null>(null);

  const skipNextClick = useRef(false);

  useEffect(() => {
    if (pendingContext) {
      setCurrentDate(pendingContext.recommendedDate);
      onAddAppointment(
        pendingContext.recommendedDate, 
        '09:00',
        { 
          clientId: pendingContext.clientId, 
          serviceTypeId: pendingContext.serviceTypeId 
        }
      );
      onClearPendingContext();
    }
  }, [pendingContext, onAddAppointment, onClearPendingContext]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTreatments, selectedStatuses, appointments, searchText, listScope, currentDate]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!resizingAptId || !resizeType) return;
        const deltaY = e.clientY - resizeInitialY;
        const deltaMinutes = (deltaY / slotHeight) * 60;
        if (resizeType === 'bottom') {
            const newDuration = Math.max(15, resizeInitialDuration + deltaMinutes);
            const height = (newDuration / 60) * slotHeight;
            setTempResizeHeight(height);
        } else if (resizeType === 'top') {
            const newDuration = Math.max(15, resizeInitialDuration - deltaMinutes);
            setTempResizeTop(deltaY); 
            setTempResizeHeight((newDuration / 60) * slotHeight);
        }
    };
    const handleMouseUp = (e: MouseEvent) => {
        if (!resizingAptId || !resizeType) return;
        skipNextClick.current = true;
        setTimeout(() => { skipNextClick.current = false; }, 100);
        const deltaY = e.clientY - resizeInitialY;
        const rawMinutes = (deltaY / slotHeight) * 60;
        const snappedMinutes = Math.round(rawMinutes / 15) * 15;
        const apt = appointments.find(a => a.id === resizingAptId);
        if (apt && onAppointmentUpdate) {
            let newApt = { ...apt };
            if (resizeType === 'bottom') {
                newApt.durationMinutes = Math.max(15, resizeInitialDuration + snappedMinutes);
            } else if (resizeType === 'top') {
                const [h, m] = resizeInitialStartTime.split(':').map(Number);
                const currentTotalMinutes = h * 60 + m;
                const newTotalMinutes = currentTotalMinutes + snappedMinutes;
                if (newTotalMinutes >= 8 * 60 && newTotalMinutes <= 20 * 60) {
                    const newH = Math.floor(newTotalMinutes / 60);
                    const newM = newTotalMinutes % 60;
                    newApt.startTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
                    newApt.durationMinutes = Math.max(15, resizeInitialDuration - snappedMinutes);
                }
            }
            onAppointmentUpdate(newApt);
        }
        setResizingAptId(null);
        setResizeType(null);
        setTempResizeHeight(null);
        setTempResizeTop(null);
    };
    if (resizingAptId) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [resizingAptId, resizeType, resizeInitialY, resizeInitialDuration, resizeInitialStartTime, slotHeight, appointments, onAppointmentUpdate]);

  const visibleDays = useMemo(() => {
    let start: Date, end: Date;
    switch (viewMode) {
      case 'month':
        const startOfM = getStartOfMonth(currentDate);
        start = getStartOfWeek(startOfM, { weekStartsOn: 1 });
        const endOfM = endOfMonth(currentDate);
        end = endOfWeek(endOfM, { locale: es, weekStartsOn: 1 });
        break;
      case 'day':
        start = currentDate;
        end = currentDate;
        break;
      case 'week':
      case 'list': 
        start = getStartOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { locale: es, weekStartsOn: 1 });
        break;
      default:
        start = getStartOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { locale: es, weekStartsOn: 1 });
    }
    const days = eachDayOfInterval({ start, end });
    if (showWeekends || viewMode === 'month') return days;
    return days.filter(d => !isWeekend(d));
  }, [currentDate, showWeekends, viewMode]);

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, -1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, -1));
    else setCurrentDate(addDays(currentDate, -1));
  };
  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const toggleStatusFilter = (id: string) => {
    setSelectedStatuses(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const toggleTreatmentFilter = (id: string) => {
    setSelectedTreatments(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };
  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Desconocido';
  const getService = (id: string) => services.find(s => s.id === id);
  const getStatus = (id: string) => statuses.find(s => s.id === id);
  const getStaff = (id: string) => staff.find(s => s.id === id);

  const sortedAppointments = useMemo(() => {
    let result = appointments.map(apt => ({
        ...apt,
        clientName: getClientName(apt.clientId),
        serviceName: getService(apt.serviceTypeId)?.name || 'Desconocido',
        staffName: getStaff(apt.staffId || '')?.name || 'N/A',
        statusName: getStatus(apt.statusId)?.name || 'Desconocido'
    }));
    if (selectedTreatments.length > 0) result = result.filter(apt => selectedTreatments.includes(apt.serviceTypeId));
    if (selectedStatuses.length > 0) result = result.filter(apt => selectedStatuses.includes(apt.statusId));
    if (searchText) {
        const lowerSearch = searchText.toLowerCase();
        result = result.filter(apt => 
            apt.clientName.toLowerCase().includes(lowerSearch) ||
            apt.serviceName.toLowerCase().includes(lowerSearch) ||
            apt.staffName.toLowerCase().includes(lowerSearch) ||
            apt.statusName.toLowerCase().includes(lowerSearch) ||
            apt.notes?.toLowerCase().includes(lowerSearch)
        );
    }
    if (viewMode === 'list' && listScope === 'week') {
        const start = getStartOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { locale: es, weekStartsOn: 1 });
        end.setHours(23, 59, 59, 999);
        result = result.filter(apt => isWithinInterval(new Date(apt.date), { start, end }));
    }
    if (sortConfig) {
        result.sort((a, b) => {
            let aValue: any; let bValue: any;
            switch (sortConfig.key) {
                case 'date':
                    aValue = new Date(`${a.date.split('T')[0]}T${a.startTime}`);
                    bValue = new Date(`${b.date.split('T')[0]}T${b.startTime}`);
                    break;
                case 'clientName': aValue = a.clientName; bValue = b.clientName; break;
                case 'serviceName': aValue = a.serviceName; bValue = b.serviceName; break;
                case 'staffName': aValue = a.staffName; bValue = b.staffName; break;
                case 'price': aValue = a.price; bValue = b.price; break;
                case 'statusName': aValue = a.statusName; bValue = b.statusName; break;
                default: return 0;
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            } else if (aValue instanceof Date && bValue instanceof Date) {
                return sortConfig.direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
            }
            return 0;
        });
    } else {
        result.sort((a, b) => {
            const dateA = new Date(`${a.date.split('T')[0]}T${a.startTime}`);
            const dateB = new Date(`${b.date.split('T')[0]}T${b.startTime}`);
            return dateA.getTime() - dateB.getTime();
        });
    }
    return result;
  }, [appointments, selectedTreatments, selectedStatuses, viewMode, searchText, clients, listScope, currentDate, sortConfig, services, staff, statuses]);

  const getAppointmentsForDay = (day: Date) => {
    return sortedAppointments
      .filter(apt => isSameDay(new Date(apt.date), day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Fecha', 'Hora', 'Duración', 'Cliente', 'Tratamiento', 'Personal', 'Precio', 'Estado', 'Notas'];
    const rows = sortedAppointments.map(apt => {
        const service = getService(apt.serviceTypeId);
        const st = getStatus(apt.statusId);
        const s = getStaff(apt.staffId || '');
        return [
            apt.id, format(new Date(apt.date), 'yyyy-MM-dd'), apt.startTime, apt.durationMinutes,
            `"${getClientName(apt.clientId)}"`, `"${service?.name || ''}"`, `"${s?.name || ''}"`,
            `"${formatCurrency(apt.price)}"`, st?.name || '', `"${apt.notes || ''}"`
        ].join(',');
    });
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n'); 
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `citas_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const handleDragStart = (e: React.DragEvent, apt: Appointment) => {
      setDraggedAptId(apt.id); e.dataTransfer.effectAllowed = "copyMove"; e.dataTransfer.setData("text/plain", apt.id);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
      e.preventDefault(); e.stopPropagation();
      skipNextClick.current = true; setTimeout(() => { skipNextClick.current = false; }, 100);
      const aptId = e.dataTransfer.getData("text/plain");
      const apt = appointments.find(a => a.id === aptId);
      if (apt && onAppointmentDrop) onAppointmentDrop(apt, day, `${hour.toString().padStart(2, '0')}:00`);
      setDraggedAptId(null);
  };
  const handleResizeStart = (e: React.MouseEvent, apt: Appointment, type: 'top' | 'bottom') => {
      e.preventDefault(); e.stopPropagation(); 
      setResizingAptId(apt.id); setResizeType(type); setResizeInitialY(e.clientY);
      setResizeInitialDuration(apt.durationMinutes); setResizeInitialStartTime(apt.startTime);
      setTempResizeHeight((apt.durationMinutes / 60) * slotHeight); setTempResizeTop(0);
  };
  const handleSlotClick = (day: Date, time: string) => { if (skipNextClick.current) return; onAddAppointment(day, time); };

  const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => i + 8);
  const getTopOffset = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (hours < 8 || hours > 20) return -1;
    const minutesFromStart = (hours - 8) * 60 + minutes;
    return (minutesFromStart / 60) * slotHeight;
  };

  const renderListView = () => {
    const totalPages = Math.ceil(sortedAppointments.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedAppointments.slice(indexOfFirstItem, indexOfLastItem);
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
             <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <input type="text" placeholder="Buscar..." value={searchText} onChange={e => setSearchText(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg shrink-0">
                        <button onClick={() => setListScope('week')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${listScope === 'week' ? 'bg-white dark:bg-gray-600 shadow text-teal-600' : 'text-gray-700 dark:text-gray-400'}`}>Esta Semana</button>
                        <button onClick={() => setListScope('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${listScope === 'all' ? 'bg-white dark:bg-gray-600 shadow text-teal-600' : 'text-gray-700 dark:text-gray-400'}`}>Todo</button>
                    </div>
                </div>
                <button onClick={exportToCSV} className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
                    <ListIcon className="w-4 h-4 mr-2" /> CSV
                </button>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('date')}><div className="flex items-center">Fecha / Hora {getSortIndicator('date')}</div></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('clientName')}><div className="flex items-center">Cliente {getSortIndicator('clientName')}</div></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('serviceName')}><div className="flex items-center">Tratamiento {getSortIndicator('serviceName')}</div></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('staffName')}><div className="flex items-center">Personal {getSortIndicator('staffName')}</div></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('price')}><div className="flex items-center">Precio {getSortIndicator('price')}</div></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => requestSort('statusName')}><div className="flex items-center">Estado {getSortIndicator('statusName')}</div></th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentItems.map(apt => {
                            const service = getService(apt.serviceTypeId); const status = getStatus(apt.statusId); const staffMember = getStaff(apt.staffId || '');
                            const bgClass = service?.color.split(' ')[0] || 'bg-gray-100'; const textClass = service?.color.split(' ')[1] || 'text-gray-800';
                            return (
                                <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-white">{format(new Date(apt.date), 'dd MMM yyyy', {locale: es})}</div><div className="text-sm text-gray-600 dark:text-gray-400">{apt.startTime}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium"><button onClick={() => onViewClient(apt.clientId)} className="hover:underline hover:text-teal-600">{apt.clientName}</button></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgClass} ${textClass}`}>{apt.serviceName}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap">{staffMember ? (<div className="flex items-center"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${staffMember.color}`}>{staffMember.name.charAt(0)}</div><span className="text-sm text-gray-700 dark:text-gray-300">{apt.staffName}</span></div>) : <span className="text-sm text-gray-500 dark:text-gray-400">-</span>}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatCurrency(apt.price)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded text-xs font-medium ${status?.color || 'bg-gray-100 text-gray-700'}`}>{apt.statusName}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex items-center justify-end space-x-3">{!status?.isBillable && onQuickComplete && (<button onClick={(e) => { e.stopPropagation(); onQuickComplete(apt); }} className="text-gray-500 hover:text-emerald-500 transition-colors" title="Marcar como Realizada"><CheckCircle className="w-5 h-5" /></button>)}<button onClick={() => onEditAppointment(apt)} className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-200">Editar</button></div></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, sortedAppointments.length)}</span></div>
                    <div className="flex space-x-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Anterior</button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Siguiente</button>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderMonthGrid = () => {
      const days = visibleDays; const weeks = [];
      for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
      return (
          <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                      <div key={d} className="py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{d}</div>
                  ))}
              </div>
              <div className="flex-1 grid grid-rows-5 md:grid-rows-auto">
                  {weeks.map((week, i) => (
                      <div key={i} className="grid grid-cols-7 h-full">
                          {week.map(day => {
                              const dayApts = getAppointmentsForDay(day); const isCurrMonth = isSameMonth(day, currentDate); const isToday = isSameDay(day, new Date());
                              return (
                                  <div key={day.toISOString()} className={`border-b border-r border-gray-100 dark:border-gray-700 p-1 min-h-[80px] relative hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${!isCurrMonth ? 'bg-gray-50/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400' : ''}`} onClick={() => onAddAppointment(day)} onDragOver={(e) => { e.preventDefault(); }} onDrop={(e) => handleDrop(e, day, 9)}>
                                      <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-teal-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-800 dark:text-gray-200'}`}>{format(day, 'd')}</div>
                                      <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                                          {dayApts.map(apt => {
                                              const service = getService(apt.serviceTypeId); const status = getStatus(apt.statusId);
                                              return (
                                                  <div key={apt.id} draggable onDragStart={(e) => handleDragStart(e, apt)} onClick={(e) => { e.stopPropagation(); if (skipNextClick.current) return; onEditAppointment(apt); }} className={`text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer shadow-sm border-l-2 ${service?.color.split(' ')[0]} ${service?.color.split(' ')[1]} ${status?.isBillable ? 'border-l-emerald-500' : 'border-l-transparent'}`}>
                                                      {apt.startTime} {getClientName(apt.clientId)}
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const renderTimeGrid = () => {
      const nowOffset = (now.getHours() - 8) * 60 + now.getMinutes();
      const nowTop = nowOffset >= 0 && nowOffset <= 12 * 60 ? (nowOffset / 60) * slotHeight : null;
      return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 overflow-hidden relative">
            <div className="absolute top-2 right-4 z-20 flex bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <button onClick={() => setSlotHeight(Math.max(40, slotHeight - 10))} className="p-1.5 text-gray-600 hover:text-teal-600 border-r border-gray-200 dark:border-gray-700"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={() => setSlotHeight(Math.min(120, slotHeight + 10))} className="p-1.5 text-gray-600 hover:text-teal-600"><ZoomIn className="w-4 h-4" /></button>
            </div>
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-y-scroll scrollbar-hide shrink-0 ml-14">
                <div className={`grid w-full ${viewMode === 'day' ? 'grid-cols-1' : (showWeekends ? 'grid-cols-7' : 'grid-cols-5')}`}>
                    {visibleDays.map(day => (
                        <div key={day.toISOString()} className={`py-3 text-center border-l border-gray-100 dark:border-gray-700 ${isSameDay(day, new Date()) ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}>
                            <div className="text-xs uppercase font-medium text-gray-600 dark:text-gray-400">{format(day, 'EEE', { locale: es })}</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{format(day, 'd')}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto relative">
                <div className="flex" style={{ minHeight: TIME_SLOTS.length * slotHeight }}>
                    <div className="w-14 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky left-0 z-10 flex flex-col items-center">
                        {TIME_SLOTS.map(hour => (
                            <div key={hour} className="relative w-full" style={{ height: slotHeight }}>
                                <span className="absolute -top-2.5 right-2 text-xs text-gray-500 font-medium">{hour}:00</span>
                                <div className="absolute top-0 right-0 w-2 border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                        ))}
                    </div>
                    <div className={`grid w-full relative ${viewMode === 'day' ? 'grid-cols-1' : (showWeekends ? 'grid-cols-7' : 'grid-cols-5')}`}>
                        {nowTop !== null && (<div className="absolute left-0 right-0 z-30 pointer-events-none flex items-center" style={{ top: nowTop }}><div className="w-full border-t-2 border-red-500 opacity-60"></div><div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500"></div></div>)}
                        {visibleDays.map(day => {
                            const dayAppointments = getAppointmentsForDay(day);
                            return (
                                <div key={day.toISOString()} className="relative border-l border-gray-100 dark:border-gray-700 group">
                                    {TIME_SLOTS.map(hour => (
                                        <div key={hour} className="border-t border-gray-100 dark:border-gray-700 w-full hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" style={{ height: slotHeight }} onClick={() => handleSlotClick(day, `${hour}:00`)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, day, hour)} />
                                    ))}
                                    {dayAppointments.map(apt => {
                                        const isResizing = resizingAptId === apt.id; const top = getTopOffset(apt.startTime); const height = isResizing && tempResizeHeight ? tempResizeHeight : (apt.durationMinutes / 60) * slotHeight; const visualTop = isResizing && tempResizeTop ? top + tempResizeTop : top; const service = getService(apt.serviceTypeId); const status = getStatus(apt.statusId); const staffMember = getStaff(apt.staffId || '');
                                        if (top === -1) return null;
                                        return (
                                            <div key={apt.id} draggable={!isResizing} onDragStart={(e) => handleDragStart(e, apt)} onClick={(e) => { e.stopPropagation(); if (skipNextClick.current) return; onEditAppointment(apt); }} className={`absolute inset-x-1 rounded-md px-2 py-1 shadow-sm border-l-[3px] cursor-pointer z-10 overflow-hidden transition-shadow ${service?.color.split(' ')[0] || 'bg-gray-100'} ${service?.color.split(' ')[1] || 'text-gray-800'} ${status?.isBillable ? 'ring-1 ring-emerald-400 ring-opacity-50' : ''} ${isResizing ? 'shadow-lg z-50 opacity-90 scale-[1.02]' : 'hover:shadow-md'}`} style={{ top: visualTop, height: Math.max(height, 28), cursor: isResizing ? 'row-resize' : 'grab' }}>
                                                <div className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-20 hover:bg-black/5" onMouseDown={(e) => handleResizeStart(e, apt, 'top')} />
                                                <div className="flex justify-between items-start text-xs pointer-events-none"><span className="font-bold">{apt.startTime}</span>{status?.isBillable && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}</div>
                                                <div className="font-bold text-xs truncate leading-tight mt-0.5 pointer-events-none">{getClientName(apt.clientId)}</div>
                                                <div className="text-[10px] opacity-80 truncate pointer-events-none">{service?.name}</div>
                                                {staffMember && (<div className="absolute bottom-1 right-1"><div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${staffMember.color}`}>{staffMember.name.charAt(0)}</div></div>)}
                                                <div className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize z-20 hover:bg-black/5" onMouseDown={(e) => handleResizeStart(e, apt, 'bottom')} />
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderMobileAgenda = () => {
    return (
        <div className="md:hidden flex-1 overflow-y-auto space-y-4 pb-20">
         {visibleDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day); const isToday = isSameDay(day, new Date());
            return (
                <div key={day.toISOString()} className={`flex gap-3 ${dayAppointments.length === 0 ? 'opacity-60' : ''}`}>
                    <div className="w-14 shrink-0 flex flex-col items-center pt-1">
                        <span className="text-xs uppercase font-bold text-gray-500">{format(day, 'EEE', { locale: es }).replace('.', '')}</span>
                        <div className={`mt-1 w-8 h-8 flex items-center justify-center rounded-full text-lg font-medium ${isToday ? 'bg-teal-600 text-white' : 'text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700'}`}>{format(day, 'd')}</div>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        {dayAppointments.length > 0 ? (
                            <div className="space-y-2">
                                {dayAppointments.map(apt => {
                                    const service = getService(apt.serviceTypeId); const status = getStatus(apt.statusId); const staffMember = getStaff(apt.staffId || '');
                                    return (
                                        <div key={apt.id} onClick={() => onEditAppointment(apt)} className={`rounded-xl p-3 border shadow-sm flex items-center justify-between ${service?.color.split(' ')[0] || 'bg-gray-100'} border-l-[3px] ${status?.isBillable ? 'border-l-emerald-500' : 'border-l-transparent'}`}>
                                           <div className="flex items-center gap-3 overflow-hidden">
                                               <div className="flex flex-col items-center min-w-[3rem] border-r border-black/10 pr-3">
                                                   <span className="font-bold text-sm">{apt.startTime}</span>
                                                   <span className="text-[10px] text-gray-600 dark:text-gray-400">{apt.durationMinutes}m</span>
                                               </div>
                                               <div className="min-w-0"><h4 className="font-bold text-sm truncate">{getClientName(apt.clientId)}</h4><p className="text-xs text-gray-700 dark:text-gray-300 truncate">{service?.name}</p>{staffMember && <p className="text-[10px] text-gray-600 dark:text-gray-400 flex items-center mt-0.5"><User className="w-3 h-3 mr-1"/> {staffMember.name}</p>}</div>
                                           </div>
                                           {status && (<span className={`text-[10px] px-2 py-0.5 rounded-full ${status.color}`}>{status.name}</span>)}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (<div className="h-full pt-2" onClick={() => onAddAppointment(day)}><div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 w-full" /></div>)}
                    </div>
                </div>
            )
         })}
      </div>
    );
  };

  const startDate = visibleDays[0]; const endDate = visibleDays[visibleDays.length - 1];

  return (
    <div className="flex flex-col h-full space-y-3 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
                 <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
                 <div className="hidden md:flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0.5 ml-4">
                     <button onClick={handlePrev} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" /></button>
                     <span className="px-3 text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[140px] text-center capitalize">{viewMode === 'day' ? format(currentDate, 'd MMMM yyyy', {locale: es}) : viewMode === 'month' ? format(currentDate, 'MMMM yyyy', {locale: es}) : `${format(startDate, 'd MMM')} - ${format(endDate, 'd MMM', {locale: es})}`}</span>
                     <button onClick={handleNext} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" /></button>
                 </div>
            </div>
            <p className="md:hidden text-xs md:text-sm text-gray-600 capitalize">{format(currentDate, 'MMMM yyyy', {locale: es})}</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
               <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {([['list', 'Lista', ListIcon], ['day', 'Día', Clock], ['week', 'Semana', LayoutGrid], ['month', 'Mes', CalendarIcon]] as const).map(([mode, label, Icon]) => (
                        <button key={mode} onClick={() => setViewMode(mode)} className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === mode ? 'bg-white dark:bg-gray-700 text-teal-600 shadow-sm' : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'}`}>
                            <Icon className="w-3.5 h-3.5 mr-1.5" />{label}
                        </button>
                    ))}
               </div>
               <button onClick={() => onAddAppointment()} className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-teal-700 shadow-sm transition-colors"><Plus className="w-4 h-4 mr-2"/> Nueva Cita</button>
          </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <Filter className="w-4 h-4 text-gray-500 shrink-0" />
            {statuses.map(status => (
                <button 
                  key={status.id} 
                  onClick={() => toggleStatusFilter(status.id)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedStatuses.includes(status.id) ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:hover:border-gray-500'}`}
                >
                    {status.name}
                </button>
            ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <Briefcase className="w-4 h-4 text-gray-500 shrink-0" /> 
            {services.map(service => (
                <button
                    key={service.id}
                    onClick={() => toggleTreatmentFilter(service.id)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedTreatments.includes(service.id) ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:hover:border-gray-500'}`}
                >
                    {service.name}
                </button>
            ))}
        </div>
      </div>

      <div className="hidden md:flex flex-col flex-1 bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden relative">
          {viewMode === 'list' && renderListView()}
          {viewMode === 'month' && renderMonthGrid()}
          {(viewMode === 'week' || viewMode === 'day') && renderTimeGrid()}
      </div>
      {renderMobileAgenda()}
      <button onClick={() => onAddAppointment()} className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 active:scale-95 transition-transform"><Plus className="w-8 h-8" /></button>
    </div>
  );
};
