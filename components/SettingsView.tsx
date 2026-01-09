

import React, { useState } from 'react';
import { AppStatus } from '../types';
import { Check, Plus, Trash2, Edit2, Save, RotateCcw } from 'lucide-react';

interface SettingsViewProps {
  statuses: AppStatus[];
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

export const SettingsView: React.FC<SettingsViewProps> = ({ statuses, onSaveStatus, onDeleteStatus, onRestartTour }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<AppStatus>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handleEdit = (status: AppStatus) => {
      setEditingId(status.id);
      setForm(status);
      setIsCreating(false);
  };

  const handleCreate = () => {
      setEditingId(null);
      setForm({
          name: '',
          color: 'bg-gray-100 text-gray-800',
          isBillable: false,
          isDefault: false
      });
      setIsCreating(true);
  };

  const handleSave = () => {
      if (!form.name) return;
      onSaveStatus(form);
      setEditingId(null);
      setIsCreating(false);
      setForm({});
  };

  const handleCancel = () => {
      setEditingId(null);
      setIsCreating(false);
      setForm({});
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
                Reiniciar Tour de Bienvenida
            </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Estados de Cita</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
               Crea estados personalizados y define cuáles generan ingresos.
            </p>
          </div>
          {!isCreating && (
              <button 
                onClick={handleCreate}
                className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center shadow-sm"
              >
                  <Plus className="w-4 h-4 mr-1.5" /> Nuevo Estado
              </button>
          )}
        </div>
        
        <div className="p-4 space-y-4">
            
            {/* Creation/Edit Form */}
            {(isCreating || editingId) && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border-2 border-teal-500 mb-4 animate-fade-in-up">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                        {isCreating ? 'Nuevo Estado' : 'Editar Estado'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                            <input 
                                type="text" 
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm p-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white"
                                value={form.name || ''}
                                onChange={e => setForm({...form, name: e.target.value})}
                                placeholder="Ej: Confirmada"
                            />
                        </div>
                        <div className="space-y-2">
                             {/* Billable Checkbox */}
                            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <input 
                                    type="checkbox"
                                    className="rounded border-gray-300 text-teal-600 shadow-sm focus:border-teal-300 focus:ring focus:ring-teal-200 focus:ring-opacity-50 h-5 w-5"
                                    checked={form.isBillable || false}
                                    onChange={e => setForm({...form, isBillable: e.target.checked})}
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">¿Es Facturable?</span>
                            </label>

                            {/* Default Status Checkbox - Only visible if Billable is checked */}
                            {form.isBillable && (
                                <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ml-4 border-l-2 border-gray-300 dark:border-gray-500">
                                    <input 
                                        type="checkbox"
                                        className="rounded border-gray-300 text-teal-600 shadow-sm h-4 w-4"
                                        checked={form.isDefault || false}
                                        onChange={e => setForm({...form, isDefault: e.target.checked})}
                                    />
                                    <span className="text-xs text-gray-700 dark:text-gray-300">Usar por defecto para "Completar Rápido"</span>
                                </label>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Color de Etiqueta</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setForm({...form, color: c.value})}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${c.display} ${form.color === c.value ? 'border-gray-600 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                                >
                                    {form.color === c.value && <Check className="w-4 h-4 text-gray-800 opacity-60" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end space-x-2">
                        <button onClick={handleCancel} className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Cancelar</button>
                        <button onClick={handleSave} className="px-4 py-1.5 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 shadow-sm flex items-center">
                            <Save className="w-4 h-4 mr-1.5" /> Guardar
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="grid gap-3">
                {statuses.map(status => (
                    <div key={status.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 transition-all">
                        <div className="flex items-center space-x-3">
                             <span className={`px-2 py-1 rounded-md text-xs font-bold ${status.color}`}>
                                 {status.name}
                             </span>
                             <div className="flex gap-1">
                                {status.isBillable && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                        Facturable
                                    </span>
                                )}
                                {status.isDefault && (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                        Por Defecto
                                    </span>
                                )}
                             </div>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button 
                                onClick={() => handleEdit(status)}
                                className="p-1.5 text-gray-600 hover:bg-white dark:hover:bg-gray-600 rounded shadow-sm"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => { if(window.confirm('¿Eliminar estado?')) onDeleteStatus(status.id) }}
                                className="p-1.5 text-red-600 hover:bg-white dark:hover:bg-gray-600 rounded shadow-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};