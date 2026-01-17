
import React, { useState, useEffect, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from './firebase';
import { Layout } from './components/Layout';
import { CalendarView } from './components/CalendarView';
import { ClientList, ServiceList, StaffList, InventoryList, InventoryMovementDetailPage } from './components/ManagementViews';
import { AnalyticsDashboard, FinancialReport } from './components/AnalyticsDashboard';
import { LoginView } from './components/LoginView';
import { SettingsView } from './components/SettingsView';
import { ClientSelect } from './components/ClientSelect';
import { OnboardingTour } from './components/OnboardingTour';
import { ClientDetailPage } from './components/ClientDetailPage';
import { ServiceDetailPage } from './components/ServiceDetailPage'; 
import { StaffDetailPage } from './components/StaffDetailPage';
import { dataService } from './services/dataService';
import { ALLOWED_EMAILS } from './config';
import { Client, ServiceType, Appointment, AppStatus, Staff, UserProfile, AppSettings, InventoryItem, AppointmentInventorySale, InventoryMovement } from './types';
import { X, Check, Copy, ArrowRight, Trash, LogOut, Mail, Phone, Calendar as CalendarIcon, Move, Edit2, EyeOff, Eye, Lightbulb, Plus, AlertTriangle, Wallet, CheckCircle, Info, AlertCircle, Box, ShoppingCart } from 'lucide-react';
import { format, addDays, isFuture, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

// FIX: Define missing type used in props and state
interface PendingAppointmentContext {
  clientId: string;
  serviceTypeId: string;
  recommendedDate: Date;
}

// Toast Notification System
interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-0 md:p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-lg shadow-xl w-full ${maxWidth} overflow-hidden animate-fade-in-up border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const MoveCopyModal: React.FC<{ isOpen: boolean; onClose: () => void; onMove: () => void; onCopy: () => void }> = ({ isOpen, onClose, onMove, onCopy }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Mover Cita</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">¿Deseas mover la cita original a la nueva hora o crear una copia?</p>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={onMove} className="flex flex-col items-center justify-center p-4 border-2 border-teal-100 dark:border-teal-900/30 bg-teal-50 dark:bg-teal-900/20 rounded-xl hover:border-teal-500 dark:hover:border-teal-500 transition-colors group">
                        <Move className="w-6 h-6 text-teal-600 dark:text-teal-400 mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="font-bold text-teal-700 dark:text-teal-300">Mover</span>
                    </button>
                    <button onClick={onCopy} className="flex flex-col items-center justify-center p-4 border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors group">
                        <Copy className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform"/>
                        <span className="font-bold text-blue-700 dark:text-blue-300">Copiar</span>
                    </button>
                </div>
                <button onClick={onClose} className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800 dark:hover:text-gray-200 text-sm">Cancelar</button>
            </div>
        </div>
    )
}

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        <div className="flex items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
              {title}
            </h3>
            <div className="mt-2">
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{message}</div>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
            onClick={() => { onConfirm(); onClose(); }}
          >
            Confirmar
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [previousTab, setPreviousTab] = useState('clients');
  const [managementYear, setManagementYear] = useState(new Date().getFullYear());
  
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statuses, setStatuses] = useState<AppStatus[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ currency: 'EUR', defaultBookingFee: 20, defaultCalendarView: 'week', theme: 'system' });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [showTour, setShowTour] = useState(false);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
  }, []);

  // FIX: Added missing helper function
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
          // Check if email is allowed
          const userEmail = currentUser.email?.toLowerCase();
          const isAllowed = ALLOWED_EMAILS.some(email => email.toLowerCase() === userEmail);

          if (!isAllowed) {
              await auth.signOut();
              addToast('Tu cuenta no está autorizada para acceder a esta aplicación.', 'error');
              return;
          }

          setUser(currentUser);
          setIsGuest(false);
          const profile = await dataService.getUserProfile(currentUser);
          setUserProfile(profile);
      } else {
          setUser(null);
          setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [addToast]);

  useEffect(() => {
      const tourCompleted = localStorage.getItem('clinicflow-tour-completed');
      if ((user || isGuest) && !tourCompleted) {
          setShowTour(true);
      }
  }, [user, isGuest]);

  const handleTourClose = () => {
      setShowTour(false);
      localStorage.setItem('clinicflow-tour-completed', 'true');
  };

  const handleRestartTour = () => {
      setShowTour(true);
  };

  useEffect(() => {
    if (user || isGuest) {
      setDataLoading(true);
      const uid = isGuest ? 'guest' : user?.uid;
      if (!uid) return;

      const loadData = async () => {
        try {
            const [c, s, a, st, sf, inv] = await Promise.all([
                dataService.getClients(uid),
                dataService.getServices(uid),
                dataService.getAppointments(uid),
                dataService.getStatuses(uid),
                dataService.getStaff(uid),
                dataService.getInventory(uid)
            ]);
            setClients(c);
            setServices(s);
            setAppointments(a);
            setStatuses(st);
            setStaff(sf);
            setInventory(inv);
            
            const savedSettings = localStorage.getItem(`settings-${uid}`);
            if (savedSettings) setSettings(JSON.parse(savedSettings));
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setDataLoading(false);
        }
      };
      loadData();
    }
  }, [user, isGuest]);

  useEffect(() => {
    const root = window.document.documentElement;
    const theme = settings.theme || 'system';
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [settings.theme]);

  const [isAptModalOpen, setAptModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isServiceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [isStaffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isInventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [selectedClientIdForDetailView, setSelectedClientIdForDetailView] = useState<string | null>(null);
  const [selectedServiceIdForDetailView, setSelectedServiceIdForDetailView] = useState<string | null>(null);
  const [selectedStaffIdForDetailView, setSelectedStaffIdForDetailView] = useState<string | null>(null);
  const [selectedInventoryItemIdForDetailView, setSelectedInventoryItemIdForDetailView] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<{ apt: Appointment, date: Date, time: string } | null>(null);
  const [confirmModalProps, setConfirmModalProps] = useState({
    isOpen: false,
    title: '',
    message: '' as React.ReactNode,
    onConfirm: () => {},
  });
  
  const [aptForm, setAptForm] = useState<Partial<Appointment> & { endTime?: string }>({});
  const [clientForm, setClientForm] = useState<Partial<Client>>({});
  const [serviceForm, setServiceForm] = useState<Partial<ServiceType>>({});
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({});
  const [inventoryForm, setInventoryForm] = useState<Partial<InventoryItem>>({});
  
  const [pendingAppointmentContext, setPendingAppointmentContext] = useState<PendingAppointmentContext | null>(null);

  const getUid = () => isGuest ? 'guest' : user?.uid;
  const handleLogout = () => { 
      setIsGuest(false); 
      auth.signOut().catch(error => console.error("Error logging out:", error)); 
  };
  
  const handleViewClient = (id: string) => {
      setPreviousTab(activeTab);
      setSelectedClientIdForDetailView(id);
      setActiveTab('client-detail');
  };
  const handleBackFromDetail = () => {
      setSelectedClientIdForDetailView(null);
      setSelectedServiceIdForDetailView(null);
      setSelectedStaffIdForDetailView(null);
      setSelectedInventoryItemIdForDetailView(null);
      setActiveTab(previousTab);
  };
  
  const handleViewService = (id: string) => {
      setPreviousTab(activeTab);
      setSelectedServiceIdForDetailView(id);
      setActiveTab('service-detail');
  };

  const handleViewStaff = (id: string) => {
      setPreviousTab(activeTab);
      setSelectedStaffIdForDetailView(id);
      setActiveTab('staff-detail');
  };

  const handleViewInventoryHistory = (id: string) => {
      setPreviousTab(activeTab);
      setSelectedInventoryItemIdForDetailView(id);
      setActiveTab('inventory-detail');
  };
  
  const handleScheduleFromDetail = (context: PendingAppointmentContext) => {
    setPendingAppointmentContext(context);
    setActiveTab('calendar');
  };

  const calculateFinalPrice = (basePrice: number, discountPercentage: number) => {
    return basePrice * (1 - (discountPercentage / 100));
  };

  const handleOpenAptModal = (apt?: Appointment, date?: Date, time?: string, options?: { clientId?: string; serviceTypeId?: string }) => {
    const defaultStatus = statuses.find(s => s.isInitial) || statuses.find(s => s.isDefault) || statuses[0];
    if (apt) {
      setEditingApt(apt);
      const [h, m] = apt.startTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + apt.durationMinutes;
      const endH = Math.floor(totalMinutes / 60);
      const endM = totalMinutes % 60;
      
      // Migrate old appointments to serviceItems format
      let serviceItems = apt.serviceItems;
      if (!serviceItems || serviceItems.length === 0) {
          const service = services.find(s => s.id === apt.serviceTypeId);
          if (service) {
              serviceItems = [{
                  instanceId: `srv-${Date.now()}`,
                  serviceId: apt.serviceTypeId,
                  name: service.name,
                  unitPrice: apt.basePrice,
                  durationMinutes: apt.durationMinutes
              }];
          }
      } else {
          // Ensure existing items have instanceId
          serviceItems = serviceItems.map(item => ({
              ...item,
              instanceId: item.instanceId || `srv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }));
      }
      
      setAptForm({ 
          ...apt, 
          endTime: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`,
          basePrice: apt.basePrice, 
          discountPercentage: apt.discountPercentage,
          price: apt.price,
          bookingFeePaid: apt.bookingFeePaid || false,
          bookingFeeAmount: apt.bookingFeeAmount ?? settings.defaultBookingFee,
          notes: apt.notes || '',
          serviceItems: serviceItems
      });
    } else {
      setEditingApt(null);
      const startT = time || '09:00';
      const [h, m] = startT.split(':').map(Number);
      const totalMinutes = h * 60 + m + 60;
      const endH = Math.floor(totalMinutes / 60);
      const endM = totalMinutes % 60;

      const defaultService = options?.serviceTypeId ? services.find(s => s.id === options.serviceTypeId) : null;
      const defaultClient = options?.clientId ? clients.find(c => c.id === options.clientId) : null;

      // Initialize serviceItems if a default service is provided
      const initialServiceItems = defaultService ? [{
          instanceId: `srv-${Date.now()}`,
          serviceId: defaultService.id,
          name: defaultService.name,
          unitPrice: defaultService.defaultPrice,
          durationMinutes: defaultService.defaultDuration
      }] : [];

      const defaultBasePrice = defaultService?.defaultPrice || 0;
      const defaultClientDiscount = defaultClient?.discountPercentage || 0;
      const defaultFinalPrice = calculateFinalPrice(defaultBasePrice, defaultClientDiscount);

      setAptForm({
        date: date ? date.toISOString() : new Date().toISOString(),
        startTime: startT,
        durationMinutes: defaultService?.defaultDuration || 60,
        statusId: defaultStatus?.id || '',
        serviceTypeId: defaultService?.id || '',
        clientId: defaultClient?.id || '',
        basePrice: defaultBasePrice,
        discountPercentage: defaultClientDiscount,
        price: defaultFinalPrice,
        bookingFeePaid: false,
        bookingFeeAmount: settings.defaultBookingFee, // Using the global setting value here
        notes: '',
        endTime: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`,
        serviceItems: initialServiceItems
      });
    }
    setAptModalOpen(true);
  };

  useEffect(() => {
    if (isAptModalOpen && !editingApt && aptForm.clientId && aptForm.serviceTypeId) {
        // ... (existing useEffect logic if any, currently snippet shows only start)
    }
  }, [isAptModalOpen, editingApt]); // Simplified dependency check based on context

// ... (skipping down to JSX update) ...

                        {(aptForm.serviceItems || []).map((service) => (
                            <div key={service.instanceId} className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{service.name}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{service.durationMinutes} min</p>
                                </div>
                                <input 
                                    type="number" 
                                    min="0" 
                                    step="0.01"
                                    className="w-24 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                                    value={service.unitPrice}
                                    onChange={e => handleUpdateServicePrice(service.instanceId!, Number(e.target.value))}
                                />
                                <span className="text-sm font-medium">€</span>
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveServiceFromApt(service.instanceId!)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

  useEffect(() => {
    if (isAptModalOpen && !editingApt && aptForm.clientId && aptForm.serviceTypeId) {
      const selectedService = services.find(s => s.id === aptForm.serviceTypeId);
      const selectedClient = clients.find(c => c.id === aptForm.clientId);

      const newBasePrice = selectedService?.defaultPrice || 0;
      const newDiscountPercentage = selectedClient?.discountPercentage || 0;
      const newFinalPrice = calculateFinalPrice(newBasePrice, newDiscountPercentage);
      const newInventoryTotal = (aptForm.inventoryItems || []).reduce((acc, item) => acc + item.totalPrice, 0);

      setAptForm(prev => ({
        ...prev,
        basePrice: newBasePrice,
        discountPercentage: newDiscountPercentage,
        price: newFinalPrice,
        durationMinutes: selectedService?.defaultDuration || 60,
        inventoryTotal: newInventoryTotal
      }));
    }
  }, [aptForm.clientId, aptForm.serviceTypeId, isAptModalOpen, services, clients, editingApt, aptForm.inventoryItems]);

  const handleAddInventoryToApt = (itemId: string) => {
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;
      if (item.stock <= 0) {
          addToast("No hay stock disponible", "error");
          return;
      }
      const existing = (aptForm.inventoryItems || []).find(i => i.itemId === itemId);
      let updated;
      if (existing) {
          if (existing.quantity >= item.stock) {
              addToast("No hay más stock disponible", "error");
              return;
          }
          updated = aptForm.inventoryItems!.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice } : i);
      } else {
          updated = [...(aptForm.inventoryItems || []), { itemId, name: item.name, quantity: 1, unitPrice: item.salePrice, totalPrice: item.salePrice }];
      }
      const newTotal = updated.reduce((acc, i) => acc + i.totalPrice, 0);
      setAptForm({ ...aptForm, inventoryItems: updated, inventoryTotal: newTotal });
  };

  const handleRemoveInventoryFromApt = (itemId: string) => {
      const updated = (aptForm.inventoryItems || []).map(i => {
          if (i.itemId === itemId) {
              if (i.quantity > 1) return { ...i, quantity: i.quantity - 1, totalPrice: (i.quantity - 1) * i.unitPrice };
              return null;
          }
          return i;
      }).filter(Boolean) as AppointmentInventorySale[];
      const newTotal = updated.reduce((acc, i) => acc + i.totalPrice, 0);
      setAptForm({ ...aptForm, inventoryItems: updated, inventoryTotal: newTotal });
  };

  const handleUpdateInventoryItemPrice = (itemId: string, newPrice: number) => {
    const updated = (aptForm.inventoryItems || []).map(i => {
        if (i.itemId === itemId) {
            return { ...i, unitPrice: newPrice, totalPrice: i.quantity * newPrice };
        }
        return i;
    });
    const newTotal = updated.reduce((acc, i) => acc + i.totalPrice, 0);
    setAptForm({ ...aptForm, inventoryItems: updated, inventoryTotal: newTotal });
  };

  const handleAddServiceToApt = (serviceId: string) => {
      const service = services.find(s => s.id === serviceId);
      if (!service) return;
      
      const newItem = { 
          instanceId: `srv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          serviceId, 
          name: service.name, 
          unitPrice: service.defaultPrice,
          durationMinutes: service.defaultDuration
      };

      const updated = [...(aptForm.serviceItems || []), newItem];
      
      // Recalculate totals
      const newBasePrice = updated.reduce((sum, s) => sum + s.unitPrice, 0);
      const newDuration = updated.reduce((sum, s) => sum + s.durationMinutes, 0);
      const newFinalPrice = calculateFinalPrice(newBasePrice, aptForm.discountPercentage || 0);
      
      setAptForm({ 
          ...aptForm, 
          serviceItems: updated, 
          basePrice: newBasePrice,
          durationMinutes: newDuration,
          price: newFinalPrice
      });
  };

  const handleRemoveServiceFromApt = (instanceId: string) => {
      const updated = (aptForm.serviceItems || []).filter(s => s.instanceId !== instanceId);
      
      // Recalculate totals
      const newBasePrice = updated.reduce((sum, s) => sum + s.unitPrice, 0);
      const newDuration = updated.reduce((sum, s) => sum + s.durationMinutes, 0);
      const newFinalPrice = calculateFinalPrice(newBasePrice, aptForm.discountPercentage || 0);
      
      setAptForm({ 
          ...aptForm, 
          serviceItems: updated, 
          basePrice: newBasePrice,
          durationMinutes: newDuration,
          price: newFinalPrice
      });
  };

  const handleUpdateServicePrice = (instanceId: string, newPrice: number) => {
      const updated = (aptForm.serviceItems || []).map(s => {
          if (s.instanceId === instanceId) {
              return { ...s, unitPrice: newPrice };
          }
          return s;
      });
      
      // Recalculate totals
      const newBasePrice = updated.reduce((sum, s) => sum + s.unitPrice, 0);
      const newFinalPrice = calculateFinalPrice(newBasePrice, aptForm.discountPercentage || 0);
      
      setAptForm({ 
          ...aptForm, 
          serviceItems: updated, 
          basePrice: newBasePrice,
          price: newFinalPrice
      });
  };


    const handleSaveApt = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = getUid();
    
    // Determine primary service ID (legacy support + validation)
    const primaryServiceId = aptForm.serviceTypeId || (aptForm.serviceItems && aptForm.serviceItems.length > 0 ? aptForm.serviceItems[0].serviceId : '');

    if (!uid || !aptForm.clientId || !primaryServiceId || !aptForm.date || !aptForm.statusId) {
        addToast("Por favor, rellena todos los campos obligatorios (Cliente, Fecha, Tratamiento, Estado).", "error");
        return;
    }

    const saved = await dataService.saveAppointment({
      id: editingApt?.id || '',
      clientId: aptForm.clientId,
      serviceTypeId: primaryServiceId,
      staffId: aptForm.staffId,
      statusId: aptForm.statusId,
      date: aptForm.date,
      startTime: aptForm.startTime || '09:00',
      durationMinutes: Number(aptForm.durationMinutes) || 60,
      basePrice: Number(aptForm.basePrice) || 0,
      discountPercentage: Number(aptForm.discountPercentage) || 0,
      price: Number(aptForm.price) || 0,
      bookingFeePaid: aptForm.bookingFeePaid || false,
      bookingFeeAmount: Number(aptForm.bookingFeeAmount) || 0,
      notes: aptForm.notes || '',
      inventoryItems: aptForm.inventoryItems || [],
      inventoryTotal: aptForm.inventoryTotal || 0
    }, uid);

    // Stock Management Logic
    const oldApt = editingApt;
    const newItems = aptForm.inventoryItems || [];
    const oldItems = oldApt?.inventoryItems || [];
    const oldIsBillable = statuses.find(s => s.id === oldApt?.statusId)?.isBillable || false;
    const newIsBillable = statuses.find(s => s.id === aptForm.statusId)?.isBillable || false;

    // Combine all unique item IDs
    const allItemIds = Array.from(new Set([...newItems.map(i => i.itemId), ...oldItems.map(i => i.itemId)]));

    for (const itemId of allItemIds) {
        const newItem = newItems.find(i => i.itemId === itemId);
        const oldItem = oldItems.find(i => i.itemId === itemId);
        
        let stockDiff = 0;
        
        if (!oldIsBillable && newIsBillable) {
            // Transition: Non-billable -> Billable. Deduct all new items.
            stockDiff = (newItem?.quantity || 0);
        } else if (oldIsBillable && !newIsBillable) {
            // Transition: Billable -> Non-billable. Replenish all old items.
            stockDiff = -(oldItem?.quantity || 0);
        } else if (oldIsBillable && newIsBillable) {
            // Transition: Billable -> Billable. Handle difference.
            stockDiff = (newItem?.quantity || 0) - (oldItem?.quantity || 0);
        }
        // If !oldIsBillable && !newIsBillable, no stock change occurs.

        if (stockDiff !== 0) {
            const invItem = inventory.find(i => i.id === itemId);
            if (invItem) {
                const updatedInvItem = { ...invItem, stock: invItem.stock - stockDiff };
                await dataService.saveInventoryItem(updatedInvItem, uid);
                
                // Record movement
                await dataService.saveInventoryMovement({
                    id: '',
                    itemId,
                    type: stockDiff > 0 ? 'sale' : 'adjustment',
                    quantity: -stockDiff,
                    date: aptForm.date || new Date().toISOString(),
                    price: newItem?.unitPrice || oldItem?.unitPrice || invItem.salePrice,
                    appointmentId: saved.id,
                    notes: stockDiff > 0 ? `Venta en cita ${saved.id}` : `Ajuste por edición de cita ${saved.id}`,
                    createdAt: Date.now()
                }, uid);

                // Update local inventory state
                setInventory(prev => prev.map(i => i.id === itemId ? updatedInvItem : i));
            }
        }
    }

    if (editingApt) setAppointments(appointments.map(a => a.id === saved.id ? saved : a));
    else setAppointments([...appointments, saved]);
    setAptModalOpen(false);
    addToast("Cita guardada correctamente");
  };

  const handleUpdateAppointment = async (apt: Appointment) => {
      const uid = getUid();
      if (!uid) return;
      setAppointments(appointments.map(a => a.id === apt.id ? apt : a));
      await dataService.saveAppointment(apt, uid);
      addToast("Cita actualizada");
  };

  const handleQuickComplete = async (apt: Appointment) => {
      const uid = getUid();
      if (!uid) return;
      const targetStatus = statuses.find(s => s.isDefault && s.isBillable) || statuses.find(s => s.isBillable);
      if (!targetStatus) {
          addToast("No hay un estado facturable configurado.", "error");
          return;
      }
      const updated = { ...apt, statusId: targetStatus.id };
      setAppointments(appointments.map(a => a.id === apt.id ? updated : a));
      await dataService.saveAppointment(updated, uid);
      addToast("Cita completada");
  };

  const handleDeleteApt = async () => {
      const uid = getUid(); if(!editingApt || !uid) return;
      setConfirmModalProps({
          isOpen: true,
          title: "¿Eliminar Cita?",
          message: "¿Estás seguro de que quieres borrar esta cita permanentemente?",
          onConfirm: async () => {
             // Replenish stock before deleting ONLY IF it was a billable appointment
             const isBillableToReplenish = statuses.find(s => s.id === editingApt.statusId)?.isBillable || false;
             const items = editingApt.inventoryItems || [];
              if (isBillableToReplenish && items.length > 0) {
                  for (const item of items) {
                      const invItem = inventory.find(i => i.id === item.itemId);
                      if (invItem) {
                          const updated = { ...invItem, stock: invItem.stock + item.quantity };
                          await dataService.saveInventoryItem(updated, uid);
                          
                          // Record movement reversal
                          await dataService.saveInventoryMovement({
                              id: '',
                              itemId: item.itemId,
                              type: 'adjustment',
                              quantity: item.quantity,
                              date: new Date().toISOString(),
                              price: item.unitPrice,
                              appointmentId: editingApt.id,
                              notes: `Devolución por eliminación de cita ${editingApt.id}`,
                              createdAt: Date.now()
                          }, uid);

                          setInventory(prev => prev.map(i => i.id === item.itemId ? updated : i));
                      }
                  }
              }

            await dataService.deleteAppointment(editingApt.id, uid); 
            setAppointments(appointments.filter(a => a.id !== editingApt.id)); 
            setAptModalOpen(false);
            addToast("Cita eliminada", "info");
          }
      });
  };

  const handleDropAppointment = (apt: Appointment, date: Date, time: string) => {
      setMoveRequest({ apt, date, time });
  };
  const executeMove = async () => { if(!moveRequest) return; const uid = getUid(); if(!uid) return; const updated = { ...moveRequest.apt, date: moveRequest.date.toISOString(), startTime: moveRequest.time }; setAppointments(appointments.map(a => a.id === updated.id ? updated : a)); await dataService.saveAppointment(updated, uid); setMoveRequest(null); addToast("Cita movida"); };
  const executeCopy = async () => { if(!moveRequest) return; const uid = getUid(); if(!uid) return; const { id, ...rest } = moveRequest.apt; const copied = { ...rest, date: moveRequest.date.toISOString(), startTime: moveRequest.time }; const saved = await dataService.saveAppointment(copied as Appointment, uid); setAppointments([...appointments, saved]); setMoveRequest(null); addToast("Cita copiada"); };

  const handleSaveStaff = async (e: React.FormEvent) => { e.preventDefault(); const uid = getUid(); if(!uid || !staffForm.name) return; const saved = await dataService.saveStaff({ id: editingStaff?.id || '', name: staffForm.name, defaultRate: Number(staffForm.defaultRate) || 0, rates: staffForm.rates || {}, specialties: staffForm.specialties || [], color: staffForm.color || 'bg-gray-100 text-gray-800', createdAt: Date.now() }, uid); if (editingStaff) setStaff(staff.map(s => s.id === saved.id ? saved : s)); else setStaff([...staff, saved]); setStaffModalOpen(false); addToast("Miembro de equipo guardado"); };
  
  const handleDeleteStaffRequest = (staffMember: Staff) => {
    const futureAppointments = appointments.filter(apt => apt.staffId === staffMember.id && isFuture(new Date(apt.date)));
    let message: React.ReactNode = `¿Estás seguro de que quieres eliminar a "${staffMember.name}"?`;
    if (futureAppointments.length > 0) {
        message = (
            <>
                <p>{`¿Estás seguro de que quieres eliminar a "${staffMember.name}"?`}</p>
                <p className="mt-4 font-bold text-amber-600 dark:text-amber-400">
                    ADVERTENCIA: Este miembro tiene {futureAppointments.length} cita(s) futura(s).
                </p>
            </>
        );
    }
    setConfirmModalProps({
        isOpen: true,
        title: 'Confirmar Eliminación',
        message: message,
        onConfirm: async () => {
            const uid = getUid(); if(!uid) return;
            await dataService.deleteStaff(staffMember.id, uid);
            setStaff(staff.filter(s => s.id !== staffMember.id));
            if (selectedStaffIdForDetailView === staffMember.id) handleBackFromDetail();
            addToast("Personal eliminado", "info");
        },
    });
  };

  const handleSaveStatus = async (status: Partial<AppStatus>) => {
      const uid = getUid(); if(!uid) return;
      let updatedStatuses = [...statuses];
      if (status.isDefault || status.isInitial) {
          updatedStatuses = updatedStatuses.map(s => {
              let updatedS = { ...s };
              if (status.isDefault && s.id !== status.id && s.isDefault) {
                  dataService.saveStatus({ ...s, isDefault: false }, uid);
                  updatedS.isDefault = false;
              }
              if (status.isInitial && s.id !== status.id && s.isInitial) {
                  dataService.saveStatus({ ...s, isInitial: false }, uid);
                  updatedS.isInitial = false;
              }
              return updatedS;
          });
      }
      const saved = await dataService.saveStatus(status as AppStatus, uid);
      const exists = updatedStatuses.find(s => s.id === saved.id);
      if (exists) setStatuses(updatedStatuses.map(s => s.id === saved.id ? saved : s));
      else setStatuses([...updatedStatuses, saved]);
      addToast("Estado guardado");
  };
  
  const handleDeleteStatus = async (id: string) => { const uid = getUid(); if(!uid) return; await dataService.deleteStatus(id, uid); setStatuses(statuses.filter(s => s.id !== id)); addToast("Estado eliminado", "info"); };

  const handleSaveClient = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      const uid = getUid(); 
      if(!uid) return; 
      const saved = await dataService.saveClient({
          ...clientForm, 
          id: editingClient?.id || '', 
          createdAt: editingClient?.createdAt || Date.now(),
          discountPercentage: clientForm.discountPercentage ?? 0,
          finishedTreatments: clientForm.finishedTreatments || [],
      } as Client, uid); 
      if(editingClient) setClients(clients.map(c=>c.id===saved.id?saved:c)); 
      else setClients([...clients, saved]); 
      setClientModalOpen(false); 
      if (selectedClientIdForDetailView === saved.id) {
          setSelectedClientIdForDetailView(null);
          setTimeout(() => setSelectedClientIdForDetailView(saved.id), 0);
      }
      addToast("Cliente guardado");
  };

  const handleDeleteClientRequest = (client: Client) => {
    const clientApts = appointments.filter(apt => apt.clientId === client.id && isFuture(new Date(apt.date)));
    let message: React.ReactNode = `¿Estás seguro de que quieres eliminar a "${client.name}"? Se borrarán todas sus citas e historial.`;
    if (clientApts.length > 0) {
        message = (
            <>
                <p>{`¿Estás seguro de que quieres eliminar a "${client.name}"? Se borrarán todas sus citas e historial.`}</p>
                <p className="mt-4 font-bold text-amber-600 dark:text-amber-400">
                    ADVERTENCIA: Este cliente tiene {clientApts.length} cita(s) futura(s).
                </p>
            </>
        );
    }
    setConfirmModalProps({
        isOpen: true,
        title: `Eliminar Cliente`,
        message,
        onConfirm: async () => {
            const uid = getUid(); if(!uid) return; 
            await dataService.deleteClient(client.id, uid); 
            setClients(clients.filter(c => c.id !== client.id));
            if (selectedClientIdForDetailView === client.id) handleBackFromDetail();
            addToast("Cliente eliminado", "info");
        }
    });
  };
  
  const handleToggleTreatmentFinished = async (clientId: string, serviceId: string) => {
      const uid = getUid();
      if (!uid) return;
      const clientToUpdate = clients.find(c => c.id === clientId);
      if (!clientToUpdate) return;
      const finished = clientToUpdate.finishedTreatments || [];
      const isFinished = finished.includes(serviceId);
      const newFinishedTreatments = isFinished ? finished.filter(id => id !== serviceId) : [...finished, serviceId];
      const updatedClient = { ...clientToUpdate, finishedTreatments: newFinishedTreatments };
      const saved = await dataService.saveClient(updatedClient, uid);
      setClients(clients.map(c => c.id === saved.id ? saved : c));
      addToast(isFinished ? "Seguimiento reactivado" : "Tratamiento finalizado");
  };

  const handleSaveService = async (e: React.FormEvent) => { e.preventDefault(); const uid = getUid(); if(!uid) return; const saved = await dataService.saveService({...serviceForm, id: editingService?.id || ''} as ServiceType, uid); if(editingService) setServices(services.map(s=>s.id===saved.id?saved:s)); else setServices([...services, saved]); setServiceModalOpen(false); addToast("Tratamiento guardado"); };
  
  const handleDeleteServiceRequest = (service: ServiceType & { activeCount: number }) => {
    let message: React.ReactNode = `¿Estás seguro de que quieres eliminar el tratamiento "${service.name}"?`;
    if (service.activeCount > 0) {
        message = (
            <>
                <p>{`¿Estás seguro de que quieres eliminar "${service.name}"?`}</p>
                <p className="mt-4 font-bold text-amber-600 dark:text-amber-400">
                    ADVERTENCIA: Este tratamiento tiene {service.activeCount} cliente(s) activos.
                </p>
            </>
        );
    }
    setConfirmModalProps({
        isOpen: true,
        title: 'Confirmar Eliminación',
        message: message,
        onConfirm: async () => {
            const uid = getUid(); if(!uid) return;
            await dataService.deleteService(service.id, uid);
            setServices(services.filter(s => s.id !== service.id));
            addToast("Tratamiento eliminado", "info");
        },
    });
  };

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = getUid();
    if (!uid || !inventoryForm.name) return;
    const saved = await dataService.saveInventoryItem({
        ...inventoryForm,
        id: editingInventory?.id || '',
        createdAt: editingInventory?.createdAt || Date.now(),
        costPrice: Number(inventoryForm.costPrice) || 0,
        salePrice: Number(inventoryForm.salePrice) || 0,
        stock: Number(inventoryForm.stock) || 0
    } as InventoryItem, uid);
    if (editingInventory) setInventory(inventory.map(i => i.id === saved.id ? saved : i));
    else setInventory([...inventory, saved]);
    setInventoryModalOpen(false);
    addToast("Producto de inventario guardado");
  };

  const handleDeleteInventoryRequest = (item: InventoryItem) => {
    setConfirmModalProps({
        isOpen: true,
        title: 'Eliminar Producto',
        message: `¿Estás seguro de que quieres eliminar "${item.name}" del inventario?`,
        onConfirm: async () => {
            const uid = getUid(); if(!uid) return;
            await dataService.deleteInventoryItem(item.id, uid);
            setInventory(inventory.filter(i => i.id !== item.id));
            addToast("Producto eliminado", "info");
        },
    });
  };

  const handleDeleteMovement = async (movement: InventoryMovement) => {
      const uid = getUid(); if(!uid) return;
      const item = inventory.find(i => i.id === movement.itemId);
      if (!item) return;

      setConfirmModalProps({
          isOpen: true,
          title: 'Eliminar Movimiento',
          message: `¿Estás seguro de que quieres eliminar este movimiento? El stock se ajustará automáticamente.`,
          onConfirm: async () => {
              await dataService.deleteInventoryMovement(movement.id, uid);
              
              // Adjust stock
              let newStock = item.stock;
              if (movement.type === 'purchase') {
                  newStock -= movement.quantity;
              } else if (movement.type === 'sale' || (movement.type === 'adjustment' && movement.quantity < 0)) {
                  // If we delete a sale (stock out), stock goes back up
                  newStock += Math.abs(movement.quantity);
              }

              const updatedItem = { ...item, stock: newStock };
              await dataService.saveInventoryItem(updatedItem, uid);
              setInventory(inventory.map(i => i.id === item.id ? updatedItem : i));
              addToast("Movimiento eliminado y stock ajustado");
              return true; // Used by child to refresh list
          }
      });
  };

  const handleSaveMovement = async (movement: InventoryMovement, oldQuantity: number) => {
      const uid = getUid(); if(!uid) return;
      const item = inventory.find(i => i.id === movement.itemId);
      if (!item) return;

      const saved = await dataService.saveInventoryMovement(movement, uid);
      
      // Adjust stock based on difference
      if (movement.type === 'purchase') {
          const diff = movement.quantity - oldQuantity;
          const updatedItem = { ...item, stock: item.stock + diff };
          await dataService.saveInventoryItem(updatedItem, uid);
          setInventory(inventory.map(i => i.id === item.id ? updatedItem : i));
      }

      addToast("Movimiento actualizado");
      return saved;
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
      const uid = getUid();
      if (!uid) return;
      setSettings(newSettings);
      localStorage.setItem(`settings-${uid}`, JSON.stringify(newSettings));
      addToast("Ajustes guardados");
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user && !isGuest) return <LoginView onGuestLogin={() => setIsGuest(true)} />;

  const inputClass = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  const currentClientInDetailView = selectedClientIdForDetailView ? clients.find(c => c.id === selectedClientIdForDetailView) : null;
  const currentServiceInDetailView = selectedServiceIdForDetailView ? services.find(s => s.id === selectedServiceIdForDetailView) : null;
  const currentStaffInDetailView = selectedStaffIdForDetailView ? staff.find(s => s.id === selectedStaffIdForDetailView) : null;

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      isGuest={isGuest}
      userPhotoUrl={user?.photoURL || null}
      userName={userProfile?.name || user?.displayName || user?.email || 'Usuario'}
      userEmail={userProfile?.email || user?.email || 'N/A'}
      onLogout={handleLogout}
    >
        {activeTab === 'calendar' && 
            <CalendarView 
                appointments={appointments} 
                clients={clients} 
                services={services} 
                statuses={statuses} 
                staff={staff} 
                onAddAppointment={(d,t,o) => handleOpenAptModal(undefined, d, t, o)} 
                onEditAppointment={handleOpenAptModal} 
                onAppointmentDrop={handleDropAppointment}
                onAppointmentUpdate={handleUpdateAppointment}
                onViewClient={handleViewClient} 
                onQuickComplete={handleQuickComplete}
                pendingContext={pendingAppointmentContext}
                onClearPendingContext={() => setPendingAppointmentContext(null)}
                defaultView={settings.defaultCalendarView}
                timeFormat={settings.timeFormat}
            />
        }
        {activeTab === 'clients' && 
            <ClientList 
                clients={clients}
                appointments={appointments}
                statuses={statuses}
                year={managementYear}
                onYearChange={setManagementYear}
                onAdd={() => {setEditingClient(null); setClientForm({discountPercentage: 0}); setClientModalOpen(true)}} 
                onEdit={(c) => {setEditingClient(c); setClientForm(c); setClientModalOpen(true)}} 
                onDeleteRequest={handleDeleteClientRequest} 
                onViewClient={handleViewClient} 
            />
        }
        {activeTab === 'client-detail' && currentClientInDetailView && (
            <ClientDetailPage
                client={currentClientInDetailView}
                clients={clients}
                appointments={appointments}
                services={services}
                statuses={statuses}
                staff={staff}
                onBack={handleBackFromDetail}
                onEditClient={(c) => {setEditingClient(c); setClientForm(c); setClientModalOpen(true); }}
                onSchedule={handleScheduleFromDetail}
                calculateFinalPrice={calculateFinalPrice}
                onToggleTreatmentFinished={handleToggleTreatmentFinished}
                onEditAppointment={handleOpenAptModal}
            />
        )}
        {activeTab === 'services' && 
            <ServiceList 
                services={services}
                clients={clients}
                appointments={appointments}
                statuses={statuses}
                year={managementYear}
                onYearChange={setManagementYear}
                onAdd={() => {setEditingService(null); setServiceForm({color: 'bg-teal-100 text-teal-800'}); setServiceModalOpen(true)}} 
                onEdit={(s) => {setEditingService(s); setServiceForm(s); setServiceModalOpen(true)}} 
                onDeleteRequest={handleDeleteServiceRequest}
                onViewService={handleViewService}
            />
        }
        {activeTab === 'service-detail' && currentServiceInDetailView && (
            <ServiceDetailPage
                service={currentServiceInDetailView}
                clients={clients}
                appointments={appointments}
                services={services}
                statuses={statuses}
                staff={staff}
                onBack={handleBackFromDetail}
                onViewClient={handleViewClient}
                onSchedule={handleScheduleFromDetail}
            />
        )}
        {activeTab === 'staff' && 
            <StaffList 
                staff={staff} 
                services={services} 
                appointments={appointments}
                statuses={statuses}
                year={managementYear}
                onYearChange={setManagementYear}
                onAdd={() => {setEditingStaff(null); setStaffForm({color: 'bg-gray-100 text-gray-800', rates: {}}); setStaffModalOpen(true)}} 
                onEdit={(s) => {setEditingStaff(s); setStaffForm(s); setStaffModalOpen(true)}} 
                onDeleteRequest={handleDeleteStaffRequest}
                onViewStaff={handleViewStaff} 
            />
        }
        {activeTab === 'staff-detail' && currentStaffInDetailView && (
            <StaffDetailPage
                staffMember={currentStaffInDetailView}
                appointments={appointments}
                services={services}
                statuses={statuses}
                clients={clients}
                onBack={handleBackFromDetail}
                onEditStaff={(s) => {setEditingStaff(s); setStaffForm(s); setStaffModalOpen(true)}}
                onOpenAptModal={handleOpenAptModal}
            />
        )}
        { activeTab === 'inventory' && (
            <InventoryList 
                inventory={inventory} 
                appointments={appointments} 
                year={managementYear}
                onYearChange={setManagementYear}
                onAdd={() => {setEditingInventory(null); setInventoryForm({stock: 0, costPrice: 0, salePrice: 0}); setInventoryModalOpen(true)}} 
                onEdit={(item) => {setEditingInventory(item); setInventoryForm(item); setInventoryModalOpen(true)}} 
                onUpdate={(item) => setInventory(inventory.map(i => i.id === item.id ? item : i))}
                onViewHistory={(item) => handleViewInventoryHistory(item.id)}
                onDeleteRequest={handleDeleteInventoryRequest}
                statuses={statuses}
            />
        )}
        {activeTab === 'inventory-detail' && selectedInventoryItemIdForDetailView && (
            <InventoryMovementDetailPage
                item={inventory.find(i => i.id === selectedInventoryItemIdForDetailView)!}
                onBack={handleBackFromDetail}
                onDeleteMovement={handleDeleteMovement}
                onSaveMovement={handleSaveMovement}
                formatCurrency={formatCurrency}
                initialYear={managementYear}
            />
        )}
        {activeTab === 'analytics' && <AnalyticsDashboard clients={clients} appointments={appointments} services={services} statuses={statuses} staff={staff} inventory={inventory} onViewClient={handleViewClient} />}
        {activeTab === 'financial' && <FinancialReport clients={clients} appointments={appointments} services={services} statuses={statuses} staff={staff} inventory={inventory} onViewClient={handleViewClient} />}
        {activeTab === 'settings' && <SettingsView statuses={statuses} settings={settings} onSaveSettings={handleSaveSettings} onSaveStatus={handleSaveStatus} onDeleteStatus={handleDeleteStatus} onRestartTour={handleRestartTour} onLogout={handleLogout} />}

        <OnboardingTour isOpen={showTour} onClose={handleTourClose} />

        <ConfirmationModal
            isOpen={confirmModalProps.isOpen}
            onClose={() => setConfirmModalProps({ ...confirmModalProps, isOpen: false })}
            onConfirm={confirmModalProps.onConfirm}
            title={confirmModalProps.title}
            message={confirmModalProps.message}
        />

        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-[200] flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
            {toasts.map(toast => (
                <div 
                    key={toast.id} 
                    className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-fade-in-up pointer-events-auto ${
                        toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' :
                        toast.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' :
                        'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                    }`}
                >
                    {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
                    {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
                    {toast.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
                    <p className="text-sm font-medium">{toast.message}</p>
                    <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>

        <MoveCopyModal 
            isOpen={moveRequest !== null} 
            onClose={() => setMoveRequest(null)} 
            onMove={executeMove} 
            onCopy={executeCopy} 
        />

        <Modal isOpen={isAptModalOpen} onClose={() => setAptModalOpen(false)} title={editingApt ? "Editar Cita" : "Nueva Cita"} maxWidth="max-w-4xl">
            <form onSubmit={handleSaveApt} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Client & Appointment Details */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Detalles Generales</h4>
                    
                    <div>
                        <label className={labelClass}>Cliente</label>
                        <ClientSelect 
                            clients={clients}
                            appointments={appointments}
                            statuses={statuses}
                            value={aptForm.clientId || ''}
                            onChange={(id) => setAptForm(prev => ({...prev, clientId: id}))}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Fecha</label>
                            <input type="date" required className={inputClass} value={aptForm.date?.split('T')[0] || ''} onChange={e => setAptForm({...aptForm, date: new Date(e.target.value).toISOString()})} />
                        </div>
                        <div>
                            <label className={labelClass}>Hora</label>
                            <input type="time" required className={inputClass} value={aptForm.startTime || ''} onChange={e => setAptForm({...aptForm, startTime: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Asignar a (Personal)</label>
                        <select className={inputClass} value={aptForm.staffId || ''} onChange={e => setAptForm({...aptForm, staffId: e.target.value})}>
                            <option value="">Sin asignar / Cualquiera</option>
                            {staff.map(s => {
                                // Check if staff specializes in any of the added services  
                                const hasSpecialty = (aptForm.serviceItems || []).some(service => 
                                    s.specialties.includes(service.serviceId)
                                );
                                return (
                                    <option key={s.id} value={s.id}>{s.name} {hasSpecialty ? '★' : ''}</option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Estado</label>
                            <div className="flex gap-2">
                                <select required className={inputClass} value={aptForm.statusId || ''} onChange={e => setAptForm({...aptForm, statusId: e.target.value})}>
                                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const target = statuses.find(s => s.isDefault && s.isBillable) || statuses.find(s => s.isBillable);
                                        if (target) setAptForm({...aptForm, statusId: target.id});
                                    }}
                                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 p-2 rounded-md mt-1 border border-emerald-200 dark:border-emerald-800"
                                    title="Marcar como realizado/pagado"
                                >
                                    <Check className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Duración (min)</label>
                            <input type="number" min="1" className={inputClass} value={aptForm.durationMinutes || 0} onChange={e => setAptForm({...aptForm, durationMinutes: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div>
                         <label className={labelClass}>Notas</label>
                         <textarea className={`${inputClass} h-32`} value={aptForm.notes || ''} onChange={e => setAptForm({...aptForm, notes: e.target.value})} placeholder="Notas internas..." />
                    </div>
                </div>

                {/* Right Column: Services & Financials */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Servicios y Facturación</h4>

                    {/* Multiple Services Section */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Tratamientos
                        </label>
                        
                        <div className="space-y-3">
                            <select 
                                className={inputClass}
                                onChange={e => {
                                    if (e.target.value) {
                                        handleAddServiceToApt(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                            >
                                <option value="">Añadir tratamiento...</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            
                            {(!aptForm.serviceItems || aptForm.serviceItems.length === 0) && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    Añade al menos un tratamiento antes de guardar
                                </p>
                            )}
                            
                            {(aptForm.serviceItems || []).map((service) => (
                                <div key={service.instanceId} className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{service.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{service.durationMinutes} min</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            min="0" 
                                            step="0.01"
                                            className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 text-right"
                                            value={service.unitPrice}
                                            onChange={e => handleUpdateServicePrice(service.instanceId!, Number(e.target.value))}
                                        />
                                        <span className="text-xs font-medium">€</span>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveServiceFromApt(service.instanceId!)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            {(aptForm.serviceItems || []).length > 0 && (
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal Tratamientos:</span>
                                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                                        {(aptForm.serviceItems || []).reduce((sum, s) => sum + s.unitPrice, 0).toFixed(2)} €
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Inventory */}
                     <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <Box className="w-4 h-4" /> Productos (Opcional)
                        </label>
                        
                        <div className="space-y-2">
                            <select 
                                className={inputClass}
                                onChange={e => {
                                    if (e.target.value) {
                                        handleAddInventoryToApt(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                value=""
                            >
                                <option value="">Añadir producto...</option>
                                {inventory.map(item => (
                                    <option key={item.id} value={item.id} disabled={item.stock <= 0}>
                                        {item.name} ({item.stock}) - {formatCurrency(item.salePrice)}
                                    </option>
                                ))}
                            </select>

                            {aptForm.inventoryItems && aptForm.inventoryItems.length > 0 && (
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 space-y-2">
                                    {aptForm.inventoryItems.map(item => (
                                        <div key={item.itemId} className="flex items-center justify-between text-xs">
                                            <div className="flex-1 truncate pr-2">
                                                <div className="font-medium text-gray-900 dark:text-white truncate">{item.name}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 h-6">
                                                    <button type="button" onClick={() => handleRemoveInventoryFromApt(item.itemId)} className="px-1.5 hover:bg-gray-100 dark:hover:bg-gray-600">-</button>
                                                    <span className="px-1.5 border-x border-gray-300 dark:border-gray-600">{item.quantity}</span>
                                                    <button type="button" onClick={() => handleAddInventoryToApt(item.itemId)} className="px-1.5 hover:bg-gray-100 dark:hover:bg-gray-600">+</button>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                     <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={(e) => handleUpdateInventoryItemPrice(item.itemId, Number(e.target.value))}
                                                        className="w-16 h-6 text-right text-xs border rounded px-1"
                                                    />
                                                    <span className="text-xs font-bold">€</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg flex flex-col gap-1 border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex-1">
                                <label className="text-xs font-medium block">Descuento (%)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    className="w-full text-sm border rounded p-1"
                                    value={aptForm.discountPercentage || 0} 
                                    onChange={e => {
                                        const newDiscount = Number(e.target.value);
                                        const newFinalPrice = calculateFinalPrice(aptForm.basePrice, newDiscount);
                                        setAptForm(prev => ({...prev, discountPercentage: newDiscount, price: newFinalPrice}));
                                    }} 
                                />
                            </div>
                            <div className="flex-1 text-right">
                                <label className="flex items-center justify-end gap-1 text-xs cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-3 h-3"
                                        checked={aptForm.bookingFeePaid || false}
                                        onChange={e => setAptForm({...aptForm, bookingFeePaid: e.target.checked})}
                                    />
                                    <span className="text-blue-700 dark:text-blue-300">Reserva Pagada</span>
                                </label>
                                {aptForm.bookingFeePaid && (
                                     <input 
                                        type="number" 
                                        className="w-full text-sm border rounded p-1 mt-1 text-right"
                                        value={aptForm.bookingFeeAmount || 0}
                                        onChange={e => setAptForm({...aptForm, bookingFeeAmount: Number(e.target.value)})}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between text-base font-bold text-gray-900 dark:text-white">
                            <span>Total a Cobrar:</span>
                            <span>{formatCurrency((aptForm.price || 0) + (aptForm.inventoryTotal || 0) - (aptForm.bookingFeePaid ? (aptForm.bookingFeeAmount || 0) : 0))}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="col-span-1 md:col-span-2 flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                    {editingApt && (
                        <button 
                            type="button" 
                            onClick={handleDeleteApt} 
                            className="mr-auto px-4 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            Eliminar Cita
                        </button>
                    )}
                    <button type="button" onClick={() => setAptModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]">Guardar Cita</button>
                </div>
            </form>
        </Modal>

        <Modal isOpen={isStaffModalOpen} onClose={() => setStaffModalOpen(false)} title={editingStaff ? "Editar Miembro" : "Nuevo Miembro"}>
            <form onSubmit={handleSaveStaff} className="space-y-4">
                <div><label className={labelClass}>Nombre</label><input type="text" required className={inputClass} value={staffForm.name || ''} onChange={e => setStaffForm({...staffForm, name: e.target.value})} /></div>
                <div><label className={labelClass}>Coste Hora Base (€)</label><input type="number" required className={inputClass} value={staffForm.defaultRate || ''} onChange={e => setStaffForm({...staffForm, defaultRate: Number(e.target.value)})} /></div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    <p className="text-xs font-bold text-gray-500 uppercase px-2 mb-1">Especialidades y Costes Específicos</p>
                    {services.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-100 dark:border-gray-600">
                            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
                                <input type="checkbox" checked={staffForm.specialties?.includes(s.id)} onChange={e => {
                                    const specs = staffForm.specialties || [];
                                    setStaffForm({ ...staffForm, specialties: e.target.checked ? [...specs, s.id] : specs.filter(id => id !== s.id) });
                                }} className="rounded text-teal-600" />
                                <span className="truncate">{s.name}</span>
                            </label>
                            {staffForm.specialties?.includes(s.id) && (
                                <div className="flex items-center gap-1 w-24">
                                    <span className="text-[10px] text-gray-400">€/h</span>
                                    <input 
                                        type="number" 
                                        className="w-full rounded border-gray-300 dark:border-gray-600 text-xs p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        placeholder={staffForm.defaultRate?.toString() || '0'}
                                        value={staffForm.rates?.[s.id] || ''}
                                        onChange={e => {
                                            const newRates = { ...(staffForm.rates || {}) };
                                            if (e.target.value === '') delete newRates[s.id];
                                            else newRates[s.id] = Number(e.target.value);
                                            setStaffForm({ ...staffForm, rates: newRates });
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <button type="submit" className="w-full bg-teal-600 text-white p-2 rounded">Guardar</button>
            </form>
        </Modal>

        <Modal isOpen={isClientModalOpen} onClose={() => setClientModalOpen(false)} title={editingClient ? "Editar Cliente" : "Nuevo Cliente"}>
             <form onSubmit={handleSaveClient} className="space-y-4">
                <div><label className={labelClass}>Nombre</label><input type="text" required className={inputClass} value={clientForm.name || ''} onChange={e => setClientForm({...clientForm, name: e.target.value})} /></div>
                <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={clientForm.email || ''} onChange={e => setClientForm({...clientForm, email: e.target.value})} /></div>
                <div><label className={labelClass}>Teléfono</label><input type="tel" className={inputClass} value={clientForm.phone || ''} onChange={e => setClientForm({...clientForm, phone: e.target.value})} /></div>
                <div>
                    <label className={labelClass}>Descuento al cliente (%)</label>
                    <input type="number" min="0" max="100" className={inputClass} value={clientForm.discountPercentage ?? 0} onChange={e => setClientForm({...clientForm, discountPercentage: Number(e.target.value)})} />
                </div>
                <div><label className={labelClass}>Notas</label><textarea className={inputClass} value={clientForm.notes || ''} onChange={e => setClientForm({...clientForm, notes: e.target.value})} /></div>
                <button type="submit" className="w-full bg-teal-600 text-white p-2 rounded">Guardar</button>
            </form>
        </Modal>
        
        <Modal isOpen={isServiceModalOpen} onClose={() => setServiceModalOpen(false)} title="Tratamiento">
             <form onSubmit={handleSaveService} className="space-y-4">
                <div><label className={labelClass}>Nombre</label><input type="text" required className={inputClass} value={serviceForm.name || ''} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} /></div>
                <div>
                  <label className={labelClass}>Color</label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[
                      { value: 'bg-blue-100 text-blue-800', label: 'Azul' },
                      { value: 'bg-teal-100 text-teal-800', label: 'Turquesa' },
                      { value: 'bg-purple-100 text-purple-800', label: 'Morado' },
                      { value: 'bg-indigo-100 text-indigo-800', label: 'Índigo' },
                      { value: 'bg-orange-100 text-orange-800', label: 'Naranja' },
                      { value: 'bg-rose-100 text-rose-800', label: 'Rosa' },
                      { value: 'bg-green-100 text-green-800', label: 'Verde' },
                      { value: 'bg-amber-100 text-amber-800', label: 'Ámbar' },
                      { value: 'bg-pink-100 text-pink-800', label: 'Rosa Fuerte' },
                      { value: 'bg-cyan-100 text-cyan-800', label: 'Cian' },
                      { value: 'bg-lime-100 text-lime-800', label: 'Lima' },
                      { value: 'bg-emerald-100 text-emerald-800', label: 'Esmeralda' }
                    ].map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setServiceForm({...serviceForm, color: color.value})}
                        className={`p-2 rounded-lg text-xs font-medium transition-all ${color.value} ${serviceForm.color === color.value ? 'ring-2 ring-teal-600 ring-offset-2 dark:ring-offset-gray-900' : 'opacity-60 hover:opacity-100'}`}
                      >
                        {color.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className={labelClass}>Precio</label><input type="number" min="0" className={inputClass} value={serviceForm.defaultPrice || 0} onChange={e => setServiceForm({...serviceForm, defaultPrice: Number(e.target.value)})} /></div>
                   <div><label className={labelClass}>Duración (min)</label><input type="number" min="1" className={inputClass} value={serviceForm.defaultDuration || 0} onChange={e => setServiceForm({...serviceForm, defaultDuration: Number(e.target.value)})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className={labelClass}>Recurrencia (Días)</label><input type="number" min="0" className={inputClass} value={serviceForm.recurrenceDays || 0} onChange={e => setServiceForm({...serviceForm, recurrenceDays: Number(e.target.value)})} /></div>
                   <div><label className={labelClass}>Avisar en "Próximos" (días antes)</label><input type="number" min="0" className={inputClass} value={serviceForm.upcomingThresholdDays || 7} onChange={e => setServiceForm({...serviceForm, upcomingThresholdDays: Number(e.target.value)})} /></div>
                </div>
                <button type="submit" className="w-full bg-teal-600 text-white p-2 rounded">Guardar</button>
            </form>
        </Modal>
        
        <Modal isOpen={isInventoryModalOpen} onClose={() => setInventoryModalOpen(false)} title={editingInventory ? "Editar Producto" : "Nuevo Producto"}>
            <form onSubmit={handleSaveInventory} className="space-y-4">
                <div><label className={labelClass}>Nombre del Producto</label><input type="text" required className={inputClass} value={inventoryForm.name || ''} onChange={e => setInventoryForm({...inventoryForm, name: e.target.value})} placeholder="Ej. Crema Hidratante" /></div>
                <div><label className={labelClass}>Categoría</label><input type="text" className={inputClass} value={inventoryForm.category || ''} onChange={e => setInventoryForm({...inventoryForm, category: e.target.value})} placeholder="Ej. Facial, Corporal..." /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Costo (€)</label><input type="number" step="0.01" className={inputClass} value={inventoryForm.costPrice || ''} onChange={e => setInventoryForm({...inventoryForm, costPrice: Number(e.target.value)})} /></div>
                    <div><label className={labelClass}>Precio Venta (€)</label><input type="number" step="0.01" className={inputClass} value={inventoryForm.salePrice || ''} onChange={e => setInventoryForm({...inventoryForm, salePrice: Number(e.target.value)})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Stock Actual</label><input type="number" required className={inputClass} value={inventoryForm.stock ?? ''} onChange={e => setInventoryForm({...inventoryForm, stock: Number(e.target.value)})} /></div>
                    <div><label className={labelClass}>Stock Mínimo</label><input type="number" className={inputClass} value={inventoryForm.minStock || ''} onChange={e => setInventoryForm({...inventoryForm, minStock: Number(e.target.value)})} /></div>
                </div>
                <div><label className={labelClass}>Descripción</label><textarea className={`${inputClass} h-20`} value={inventoryForm.description || ''} onChange={e => setInventoryForm({...inventoryForm, description: e.target.value})} placeholder="Detalles del producto..." /></div>
                <button type="submit" className="w-full bg-teal-600 text-white p-3 rounded-lg font-bold shadow-lg hover:bg-teal-700 transition-colors mt-2">Guardar Producto</button>
            </form>
        </Modal>

    </Layout>
  );
};

export default App;
