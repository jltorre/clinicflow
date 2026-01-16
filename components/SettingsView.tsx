
import React, { useState, useEffect } from 'react';
import { AppStatus, AppSettings } from '../types';
import { Check, Plus, Trash2, Edit2, Save, RotateCcw, Wallet } from 'lucide-react';

interface SettingsViewProps {
  statuses: AppStatus[];
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onSaveStatus: (status: Partial<AppStatus>) => void;
  onDeleteStatus: (id: string) => void;
  onRestartTour?: () => void;
}

const PRESET_COLORS = [
    { value: 'bg-gray-100 text-gray-800', label: 'Gris', display: 'bg-gray-100' },
    { value: 'bg-blue-100 text-blue-800', label: 'Azul', display: 'bg-blue-100' },
    { value: 'bg-green-100 text-green-800', label: 'Verde', display: 'bg-green-100' },
    { value: 'bg-yellow-100 text-yellow-800', label: 'Amarillo', display: 'bg-yellow-100' },
    { value: 'bg-red-100 text-red-800', label: 'Rojo', display: 'bg-red-100' },
    { value: 'bg-purple-100 text-purple-800', label: 'Morado', display: 'bg-purple-100' },
    { value: 'bg-pink-100 text-pink-800', label: 'Rosa', display: 'bg-pink-100' },
    { value: 'bg-indigo-100 text-indigo-800', label: 'Índigo', display: 'bg-indigo-100' },
    { value: 'bg-orange-100 text-orange-800', label: 'Naranja', display: 'bg-orange-100' },
    { value: 'bg-teal-100 text-teal-800', label: 'Verde Azulado', display: 'bg-teal-100' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ statuses, settings, onSaveSettings, onSaveStatus, onDeleteStatus, onRestartTour }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState<Partial<AppStatus>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [bookingFee, setBookingFee] = useState(settings.defaultBookingFee);

  // Synchronize local state with settings when they change
  useEffect(() => {
      setBookingFee(settings.defaultBookingFee);
  }, [settings.defaultBookingFee]);

  const handleEdit = (status: AppStatus) => {
      setEditingId(status.id);
      setStatusForm(status);
      setIsCreating(false);
  };

  const handleCreate = () => {
      setEditingId(null);
      setStatusForm({
          name: '',
          color: 'bg-gray-100 text-gray-800',
          isBillable: false,
          isDefault: false
      });
      setIsCreating(true);
  };

  const handleSaveStatus = () => {
      if (!statusForm.name) return;
      onSaveStatus(statusForm);
      setEditingId(null);
      setIsCreating(false);
      setStatusForm({});
  };

  const handleCancel = () => {
      setEditingId(null);
      setIsCreating(false);
      setStatusForm({});
  };

  const handleSaveBookingFee = () => {
      onSaveSettings({ ...settings, defaultBookingFee: bookingFee });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajustes</h1>
           <p className="text-sm text-gray-600 dark:text-gray-400">Personaliza los estados y opciones de la app</p>
        </div>
        
        {onRestartTour && (
            <button 
                onClick={onRestartTour}
                className="flex items-center text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Reiniciar Tour
            </button>
        )}
      </div>

      {/* Global Booking Fee Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configuración de Pagos</h2>
        </div>
        <div className="p-6">
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Importe de Reserva por defecto (€)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="flex-1 rounded-md border-gray-300 dark:border-gray-600 shadow-sm p-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white"
                value={bookingFee}
                onChange={e => setBookingFee(Number(e.target.value))}
              />
              <button 
                onClick={handleSaveBookingFee}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center"
              >
                <Save className="w-4 h-4 mr-1.5" /> Guardar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">Este importe aparecerá por defecto al marcar una cita con "Pago de Reserva".</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Estados de Cita</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Crea estados personalizados y define cuáles generan ingresos.</p>
          </div>
          {!isCreating && (
              <button onClick={handleCreate} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center shadow-sm">
                  <Plus className="w-4 h-4 mr-1.5" /> Nuevo Estado
              </button>
          )}
        </div>
        
        <div className="p-4 space-y-4">
            {(isCreating || editingId) && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border-2 border-teal-500 mb-4 animate-fade-in-up">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{isCreating ? 'Nuevo Estado' : 'Editar Estado'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                            <input type="text" className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm p-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white" value={statusForm.name || ''} onChange={e => setStatusForm({...statusForm, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <input type="checkbox" className="rounded border-gray-300 text-teal-600 h-5 w-5" checked={statusForm.isBillable || false} onChange={e => setStatusForm({...statusForm, isBillable: e.target.checked})} />
                                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">¿Es Facturable?</span>
                            </label>
                            {statusForm.isBillable && (
                                <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ml-4 border-l-2 border-gray-300 dark:border-gray-500">
                                    <input type="checkbox" className="rounded border-gray-300 text-teal-600 h-4 w-4" checked={statusForm.isDefault || false} onChange={e => setStatusForm({...statusForm, isDefault: e.target.checked})} />
                                    <span className="text-xs text-gray-700 dark:text-gray-300">Usar por defecto para "Completar Rápido"</span>
                                </label>
                            )}
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map(c => (
                                <button key={c.value} onClick={() => setStatusForm({...statusForm, color: c.value})} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${c.display} ${statusForm.color === c.value ? 'border-gray-600 scale-110' : 'border-transparent'}`}>
                                    {statusForm.color === c.value && <Check className="w-4 h-4 text-gray-800 opacity-60" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                        <button onClick={handleCancel} className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">Cancelar</button>
                        <button onClick={handleSaveStatus} className="px-4 py-1.5 bg-teal-600 text-white text-sm rounded-md shadow-sm flex items-center"><Save className="w-4 h-4 mr-1.5" /> Guardar</button>
                    </div>
                </div>
            )}
            <div className="grid gap-3">
                {statuses.map(status => (
                    <div key={status.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                             <span className={`px-2 py-1 rounded-md text-xs font-bold ${status.color}`}>{status.name}</span>
                             <div className="flex gap-1">
                                {status.isBillable && <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-1.5 py-0.5 rounded">Facturable</span>}
                                {status.isDefault && <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded">Por Defecto</span>}
                             </div>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => handleEdit(status)} className="p-1.5 text-gray-600 hover:bg-white dark:hover:bg-gray-600 rounded shadow-sm"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => onDeleteStatus(status.id)} className="p-1.5 text-red-600 hover:bg-white dark:hover:bg-gray-600 rounded shadow-sm"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
