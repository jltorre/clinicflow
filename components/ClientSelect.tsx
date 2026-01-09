import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Client, Appointment, AppStatus } from '../types';
import { Search, ChevronDown, User, DollarSign, Calendar } from 'lucide-react';

interface ClientSelectProps {
  clients: Client[];
  appointments: Appointment[];
  statuses: AppStatus[];
  value: string;
  onChange: (clientId: string) => void;
  required?: boolean;
}

export const ClientSelect: React.FC<ClientSelectProps> = ({ 
  clients, 
  appointments, 
  statuses, 
  value, 
  onChange,
  required 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate stats for each client
  const clientStats = useMemo(() => {
    const stats: Record<string, { count: number; spent: number }> = {};
    
    clients.forEach(c => stats[c.id] = { count: 0, spent: 0 });

    appointments.forEach(apt => {
        if (!stats[apt.clientId]) return;
        const status = statuses.find(s => s.id === apt.statusId);
        // Count all valid appointments (not cancelled)
        if (status && !status.name.toLowerCase().includes('cancel')) {
            stats[apt.clientId].count += 1;
        }
        // Sum billable revenue
        if (status?.isBillable) {
            stats[apt.clientId].spent += apt.price;
        }
    });
    return stats;
  }, [clients, appointments, statuses]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  const selectedClient = clients.find(c => c.id === value);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="relative" ref={wrapperRef}>
        <div 
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 p-2 flex items-center justify-between cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
        >
            {selectedClient ? (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedClient.name}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{selectedClient.email}</span>
                </div>
            ) : (
                <span className="text-sm text-gray-600 dark:text-gray-400">Seleccionar Cliente...</span>
            )}
            <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>

        {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 flex flex-col">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-teal-500"
                            placeholder="Buscar nombre o email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-2" />
                    </div>
                </div>
                <div className="overflow-y-auto flex-1">
                    {filteredClients.map(client => {
                        const stats = clientStats[client.id];
                        return (
                            <div 
                                key={client.id}
                                className={`p-3 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${value === client.id ? 'bg-teal-50 dark:bg-teal-900/30' : ''}`}
                                onClick={() => {
                                    onChange(client.id);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-sm text-gray-900 dark:text-white">{client.name}</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">{client.email}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                            <DollarSign className="w-3 h-3 mr-0.5" />
                                            {formatCurrency(stats?.spent || 0)}
                                        </div>
                                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {stats?.count || 0} citas
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredClients.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-600">No se encontraron clientes.</div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};