import React, { useState, useEffect } from 'react';
// FIX: Using firebase/app for types and auth methods to align with v8 SDK.
// FIX: Using compat imports to get correct types and namespaces.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from './firebase';
import { Layout } from './components/Layout';
import { CalendarView } from './components/CalendarView';
import { ClientList, ServiceList, StaffList } from './components/ManagementViews';
import { AnalyticsDashboard, FinancialReport } from './components/AnalyticsDashboard';
import { LoginView } from './components/LoginView';
import { SettingsView } from './components/SettingsView';
import { ClientSelect } from './components/ClientSelect';
import { OnboardingTour } from './components/OnboardingTour';
import { ClientDetailPage } from './components/ClientDetailPage';
import { ServiceDetailPage } from './components/ServiceDetailPage'; 
import { StaffDetailPage } from './components/StaffDetailPage';
import { dataService } from './services/dataService';
import { Client, ServiceType, Appointment, AppStatus, Staff, UserProfile } from './types';
import { X, Check, Copy, ArrowRight, Trash, LogOut, Mail, Phone, Calendar as CalendarIcon, Move, Edit2, EyeOff, Eye, Lightbulb, Plus, AlertTriangle } from 'lucide-react';
// Adds missing parseISO to the date-fns import
// FIX: Removed parseISO as it's not exported in the user's environment. new Date() is used instead.
import { format, addDays, isFuture, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';


const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
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

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Helper to check billable status (defined here to be accessible by helpers)
const isBillable = (statusId: string, allStatuses: AppStatus[]) => allStatuses.find(s => s.id === statusId)?.isBillable || false;

// New type for pending appointment context
type PendingAppointmentContext = {
    clientId: string;
    serviceTypeId: string;
    recommendedDate: Date;
};

const App: React.FC = () => {
  // FIX: Corrected Firebase User type to firebase.User
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // New state for user profile
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [previousTab, setPreviousTab] = useState('clients'); // For dynamic back navigation
  
  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statuses, setStatuses] = useState<AppStatus[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Tour State
  const [showTour, setShowTour] = useState(false);

  // Dark Mode
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('clinicflow-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => { // Made async
      if (currentUser) {
          setUser(currentUser);
          setIsGuest(false);
          // Call the new service to ensure user profile exists in Firestore
          const profile = await dataService.getUserProfile(currentUser);
          setUserProfile(profile);
      } else {
          setUser(null);
          setUserProfile(null); // Reset user profile on logout
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check Tour
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
            const [c, s, a, st, sf] = await Promise.all([
                dataService.getClients(uid),
                dataService.getServices(uid),
                dataService.getAppointments(uid),
                dataService.getStatuses(uid),
                dataService.getStaff(uid)
            ]);
            setClients(c);
            setServices(s);
            setAppointments(a);
            setStatuses(st);
            setStaff(sf);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setDataLoading(false);
        }
      };
      loadData();
    } else {
        setClients([]);
        setServices([]);
        setAppointments([]);
        setStatuses([]);
        setStaff([]);
    }
  }, [user, isGuest]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('clinicflow-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('clinicflow-theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Modals & State
  const [isAptModalOpen, setAptModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isServiceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [isStaffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedClientIdForDetailView, setSelectedClientIdForDetailView] = useState<string | null>(null);
  const [selectedServiceIdForDetailView, setSelectedServiceIdForDetailView] = useState<string | null>(null);
  const [selectedStaffIdForDetailView, setSelectedStaffIdForDetailView] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<{ apt: Appointment, date: Date, time: string } | null>(null);
  const [confirmModalProps, setConfirmModalProps] = useState({
    isOpen: false,
    title: '',
    message: '' as React.ReactNode,
    onConfirm: () => {},
  });
  
  // Forms
  const [aptForm, setAptForm] = useState<Partial<Appointment> & { endTime?: string }>({});
  const [clientForm, setClientForm] = useState<Partial<Client>>({});
  const [serviceForm, setServiceForm] = useState<Partial<ServiceType>>({});
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({});
  
  // New state for contextual appointment creation
  const [pendingAppointmentContext, setPendingAppointmentContext] = useState<PendingAppointmentContext | null>(null);


  const getUid = () => isGuest ? 'guest' : user?.uid;
  const handleLogout = () => { 
      setIsGuest(false); 
      auth.signOut().catch(error => console.error("Error logging out:", error)); 
  };
  
  // Dynamic navigation logic
  const handleViewClient = (id: string) => {
      setPreviousTab(activeTab); // Store where we came from
      setSelectedClientIdForDetailView(id);
      setActiveTab('client-detail');
  };
  const handleBackFromDetail = () => {
      setSelectedClientIdForDetailView(null);
      setSelectedServiceIdForDetailView(null);
      setSelectedStaffIdForDetailView(null);
      setActiveTab(previousTab); // Go back to the stored tab
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
  
  // New handler for scheduling from detail pages
  const handleScheduleFromDetail = (context: PendingAppointmentContext) => {
    setPendingAppointmentContext(context);
    setActiveTab('calendar');
  };


  // --- Appointment Logic ---
  // Helper to calculate final price
  const calculateFinalPrice = (basePrice: number, discountPercentage: number) => {
    return basePrice * (1 - (discountPercentage / 100));
  };

  // Updated handleOpenAptModal to accept initialFormValues
  const handleOpenAptModal = (apt?: Appointment, date?: Date, time?: string, options?: { clientId?: string; serviceTypeId?: string }) => {
    const defaultStatus = statuses.find(s => s.isDefault) || statuses[0];
    if (apt) {
      setEditingApt(apt);
      const [h, m] = apt.startTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + apt.durationMinutes;
      const endH = Math.floor(totalMinutes / 60);
      const endM = totalMinutes % 60;
      setAptForm({ 
          ...apt, 
          endTime: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`,
          basePrice: apt.basePrice, 
          discountPercentage: apt.discountPercentage,
          price: apt.price, // This is the final calculated price
          notes: apt.notes || '' // Initialize notes for editing
      });
    } else {
      setEditingApt(null);
      const startT = time || '09:00';
      const [h, m] = startT.split(':').map(Number);
      const totalMinutes = h * 60 + m + 60;
      const endH = Math.floor(totalMinutes / 60);
      const endM = totalMinutes % 60;

      // Initial values for new appointment, will be updated by dropdowns
      // Prioritize values from options, then first available service/client
      const defaultService = options?.serviceTypeId ? services.find(s => s.id === options.serviceTypeId) : (services.length > 0 ? services[0] : null);
      const defaultClient = options?.clientId ? clients.find(c => c.id === options.clientId) : (clients.length > 0 ? clients[0] : null);

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
        notes: '', // Initialize notes for new appointment
        endTime: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`,
      });
    }
    setAptModalOpen(true);
  };

  // Recalculate appointment prices when client or service changes in the form
  useEffect(() => {
    if (isAptModalOpen && aptForm.clientId && aptForm.serviceTypeId) {
      const selectedService = services.find(s => s.id === aptForm.serviceTypeId);
      const selectedClient = clients.find(c => c.id === aptForm.clientId);

      const newBasePrice = selectedService?.defaultPrice || 0;
      const newDiscountPercentage = selectedClient?.discountPercentage || 0;
      const newFinalPrice = calculateFinalPrice(newBasePrice, newDiscountPercentage);

      setAptForm(prev => ({
        ...prev,
        basePrice: newBasePrice,
        discountPercentage: newDiscountPercentage,
        price: newFinalPrice,
        durationMinutes: selectedService?.defaultDuration || 60 // Also update duration if service changes
      }));
    }
  }, [aptForm.clientId, aptForm.serviceTypeId, isAptModalOpen, services, clients]);


  const handleSaveApt = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = getUid();
    if (!uid || !aptForm.clientId || !aptForm.serviceTypeId || !aptForm.date || !aptForm.statusId) {
        alert("Por favor, rellena todos los campos obligatorios (Cliente, Tratamiento, Fecha, Estado).");
        return;
    }

    const saved = await dataService.saveAppointment({
      id: editingApt?.id || '',
      clientId: aptForm.clientId,
      serviceTypeId: aptForm.serviceTypeId,
      staffId: aptForm.staffId,
      statusId: aptForm.statusId,
      date: aptForm.date,
      startTime: aptForm.startTime || '09:00',
      durationMinutes: Number(aptForm.durationMinutes) || 60,
      basePrice: Number(aptForm.basePrice) || 0, // Save basePrice
      discountPercentage: Number(aptForm.discountPercentage) || 0, // Save discount
      price: Number(aptForm.price) || 0, // Save final calculated price
      notes: aptForm.notes || '' // Save notes
    }, uid);
    if (editingApt) setAppointments(appointments.map(a => a.id === saved.id ? saved : a));
    else setAppointments([...appointments, saved]);
    setAptModalOpen(false);
  };

  const handleUpdateAppointment = async (apt: Appointment) => {
      const uid = getUid();
      if (!uid) return;
      setAppointments(appointments.map(a => a.id === apt.id ? apt : a));
      await dataService.saveAppointment(apt, uid);
  };

  // UPDATED: Quick Complete Handler (Prioritizes Default Status)
  const handleQuickComplete = async (apt: Appointment) => {
      const uid = getUid();
      if (!uid) return;
      
      // Look for a status marked as 'isDefault', otherwise just the first billable one
      const targetStatus = statuses.find(s => s.isDefault && s.isBillable) || statuses.find(s => s.isBillable);
      
      if (!targetStatus) {
          alert("No hay ningún estado configurado como 'Facturable' en Ajustes.");
          return;
      }

      const updated = { ...apt, statusId: targetStatus.id };
      setAppointments(appointments.map(a => a.id === apt.id ? updated : a));
      await dataService.saveAppointment(updated, uid);
  };

  const handleDeleteApt = async () => {
      const uid = getUid(); if(!editingApt || !uid) return;
      if (window.confirm("¿Eliminar cita?")) { await dataService.deleteAppointment(editingApt.id, uid); setAppointments(appointments.filter(a => a.id !== editingApt.id)); setAptModalOpen(false); }
  };

  // --- Move/Copy Logic ---
  const handleDropAppointment = (apt: Appointment, date: Date, time: string) => {
      setMoveRequest({ apt, date, time });
  };
  const executeMove = async () => { if(!moveRequest) return; const uid = getUid(); if(!uid) return; const updated = { ...moveRequest.apt, date: moveRequest.date.toISOString(), startTime: moveRequest.time }; setAppointments(appointments.map(a => a.id === updated.id ? updated : a)); await dataService.saveAppointment(updated, uid); setMoveRequest(null); };
  const executeCopy = async () => { if(!moveRequest) return; const uid = getUid(); if(!uid) return; const { id, ...rest } = moveRequest.apt; const copied = { ...rest, date: moveRequest.date.toISOString(), startTime: moveRequest.time }; const saved = await dataService.saveAppointment(copied as Appointment, uid); setAppointments([...appointments, saved]); setMoveRequest(null); };

  // --- Staff Logic ---
  const handleSaveStaff = async (e: React.FormEvent) => { e.preventDefault(); const uid = getUid(); if(!uid || !staffForm.name) return; const saved = await dataService.saveStaff({ id: editingStaff?.id || '', name: staffForm.name, defaultRate: Number(staffForm.defaultRate) || 0, rates: staffForm.rates || {}, specialties: staffForm.specialties || [], color: staffForm.color || 'bg-gray-100 text-gray-800', createdAt: Date.now() }, uid); if (editingStaff) setStaff(staff.map(s => s.id === saved.id ? saved : s)); else setStaff([...staff, saved]); setStaffModalOpen(false); };
  
  const handleDeleteStaffRequest = (staffMember: Staff) => {
    const futureAppointments = appointments.filter(apt => apt.staffId === staffMember.id && isFuture(new Date(apt.date)));
    
    let message: React.ReactNode = `¿Estás seguro de que quieres eliminar a "${staffMember.name}"?`;
    if (futureAppointments.length > 0) {
        message = (
            <>
                <p>{`¿Estás seguro de que quieres eliminar a "${staffMember.name}"?`}</p>
                <p className="mt-4 font-bold text-amber-600 dark:text-amber-400">
                    ADVERTENCIA: Este miembro del equipo tiene {futureAppointments.length} cita(s) futura(s) programada(s).
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
            if (selectedStaffIdForDetailView === staffMember.id) {
                handleBackFromDetail();
            }
        },
    });
  };

  // --- Status Logic (UPDATED for Exclusivity) ---
  const handleSaveStatus = async (status: Partial<AppStatus>) => {
      const uid = getUid(); if(!uid) return;

      // Handle exclusivity of default status locally to avoid race conditions visually
      let updatedStatuses = [...statuses];
      if (status.isDefault) {
          // Unset default from others
          updatedStatuses = updatedStatuses.map(s => {
              if (s.id !== status.id && s.isDefault) {
                  // We also need to save this change to DB
                  dataService.saveStatus({ ...s, isDefault: false }, uid);
                  return { ...s, isDefault: false };
              }
              return s;
          });
      }

      const saved = await dataService.saveStatus(status as AppStatus, uid);
      const exists = updatedStatuses.find(s => s.id === saved.id);
      
      if (exists) {
          setStatuses(updatedStatuses.map(s => s.id === saved.id ? saved : s));
      } else {
          setStatuses([...updatedStatuses, saved]);
      }
  };
  
  const handleDeleteStatus = async (id: string) => { const uid = getUid(); if(!uid) return; await dataService.deleteStatus(id, uid); setStatuses(statuses.filter(s => s.id !== id)); };

  // --- Client Logic ---
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
      // If client was edited from detail page, update detail view
      if (selectedClientIdForDetailView === saved.id) {
          setSelectedClientIdForDetailView(null); // Force re-render of detail page with fresh data
          setTimeout(() => setSelectedClientIdForDetailView(saved.id), 0);
      }
  };

  const handleDeleteClientRequest = (client: Client) => {
    const clientApts = appointments.filter(apt => apt.clientId === client.id && isFuture(new Date(apt.date)));

    let message: React.ReactNode = `¿Estás seguro de que quieres eliminar a "${client.name}"? Se borrarán todas sus citas e historial.`;
    if (clientApts.length > 0) {
        message = (
            <>
                <p>{`¿Estás seguro de que quieres eliminar a "${client.name}"? Se borrarán todas sus citas e historial.`}</p>
                <p className="mt-4 font-bold text-amber-600 dark:text-amber-400">
                    ADVERTENCIA: Este cliente tiene {clientApts.length} cita(s) futura(s) programada(s).
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
            if (selectedClientIdForDetailView === client.id) {
                handleBackFromDetail();
            }
        }
    });
  };
  
  // --- New: Treatment Finished Logic ---
  const handleToggleTreatmentFinished = async (clientId: string, serviceId: string) => {
      const uid = getUid();
      if (!uid) return;

      const clientToUpdate = clients.find(c => c.id === clientId);
      if (!clientToUpdate) return;

      const finished = clientToUpdate.finishedTreatments || [];
      const isFinished = finished.includes(serviceId);
      
      const newFinishedTreatments = isFinished
          ? finished.filter(id => id !== serviceId)
          : [...finished, serviceId];
      
      const updatedClient = { ...clientToUpdate, finishedTreatments: newFinishedTreatments };

      const saved = await dataService.saveClient(updatedClient, uid);
      setClients(clients.map(c => c.id === saved.id ? saved : c));
  };


  // --- Service Logic ---
  const handleSaveService = async (e: React.FormEvent) => { e.preventDefault(); const uid = getUid(); if(!uid) return; const saved = await dataService.saveService({...serviceForm, id: editingService?.id || ''} as ServiceType, uid); if(editingService) setServices(services.map(s=>s.id===saved.id?saved:s)); else setServices([...services, saved]); setServiceModalOpen(false); };
  
  const handleDeleteServiceRequest = (service: ServiceType & { activeCount: number }) => {
    let message: React.ReactNode = `¿Estás seguro de que quieres eliminar el tratamiento "${service.name}"?`;
    if (service.activeCount > 0) {
        message = (
            <>
                <p>{`¿Estás seguro de que quieres eliminar "${service.name}"?`}</p>
                <p className="mt-4 font-bold text-amber-600 dark:text-amber-400">
                    ADVERTENCIA: Este tratamiento tiene {service.activeCount} cliente(s) con un ciclo activo.
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
        },
    });
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
      darkMode={darkMode} 
      toggleDarkMode={toggleDarkMode} 
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
            />
        }
        {activeTab === 'clients' && 
            <ClientList 
                clients={clients}
                appointments={appointments}
                statuses={statuses}
                onAdd={() => {setEditingClient(null); setClientForm({discountPercentage: 0}); setClientModalOpen(true)}} 
                onEdit={(c) => {setEditingClient(c); setClientForm(c); setClientModalOpen(true)}} 
                onDeleteRequest={handleDeleteClientRequest} 
                onViewClient={handleViewClient} 
            />
        }
        {activeTab === 'client-detail' && currentClientInDetailView && (
            <ClientDetailPage
                client={currentClientInDetailView}
                clients={clients} // Pass all clients for general context if needed
                appointments={appointments}
                services={services}
                statuses={statuses}
                staff={staff}
                onBack={handleBackFromDetail}
                onEditClient={(c) => {setEditingClient(c); setClientForm(c); setClientModalOpen(true); }}
                onSchedule={handleScheduleFromDetail}
                calculateFinalPrice={calculateFinalPrice}
                onToggleTreatmentFinished={handleToggleTreatmentFinished}
            />
        )}
        {activeTab === 'services' && 
            <ServiceList 
                services={services}
                clients={clients}
                appointments={appointments}
                // FIX: Passed statuses prop to resolve error.
                statuses={statuses}
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
        {activeTab === 'analytics' && <AnalyticsDashboard clients={clients} appointments={appointments} services={services} statuses={statuses} staff={staff} onViewClient={handleViewClient} />}
        {activeTab === 'financial' && <FinancialReport clients={clients} appointments={appointments} services={services} statuses={statuses} staff={staff} onViewClient={handleViewClient} />}
        
        {/* Pass RestartTour handler to Settings */}
        {activeTab === 'settings' && <SettingsView statuses={statuses} onSaveStatus={handleSaveStatus} onDeleteStatus={handleDeleteStatus} onRestartTour={handleRestartTour} />}

        {/* --- TOUR --- */}
        <OnboardingTour isOpen={showTour} onClose={handleTourClose} />

        {/* --- MODALS --- */}
        <ConfirmationModal
            isOpen={confirmModalProps.isOpen}
            onClose={() => setConfirmModalProps({ ...confirmModalProps, isOpen: false })}
            onConfirm={confirmModalProps.onConfirm}
            title={confirmModalProps.title}
            message={confirmModalProps.message}
        />

        {/* --- APPOINTMENT MODAL --- */}
        <Modal isOpen={isAptModalOpen} onClose={() => setAptModalOpen(false)} title={editingApt ? "Editar Cita" : "Nueva Cita"}>
            <form onSubmit={handleSaveApt} className="space-y-4">
                <div>
                    <label className={labelClass}>Cliente</label>
                    <ClientSelect 
                        clients={clients}
                        appointments={appointments}
                        statuses={statuses}
                        value={aptForm.clientId || ''}
                        onChange={(id) => setAptForm(prev => ({...prev, clientId: id}))} // Use functional update
                        required
                    />
                    {aptForm.clientId && (
                        <button 
                            type="button" 
                            onClick={() => { setAptModalOpen(false); handleViewClient(aptForm.clientId!); }}
                            className="mt-2 flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400"
                        >
                            <ArrowRight className="w-4 h-4 mr-1" /> Ver perfil completo del cliente
                        </button>
                    )}
                </div>
                <div>
                    <label className={labelClass}>Tratamiento</label>
                    <select required className={inputClass} value={aptForm.serviceTypeId || ''} onChange={e => {
                        const s = services.find(srv => srv.id === e.target.value);
                        setAptForm(prev => ({ 
                            ...prev, 
                            serviceTypeId: e.target.value, 
                            basePrice: s?.defaultPrice || 0,
                            durationMinutes: s?.defaultDuration || 60 
                        })); // price is updated by useEffect
                    }}>
                        <option value="">Seleccionar Tratamiento</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Asignar a (Personal)</label>
                    <select className={inputClass} value={aptForm.staffId || ''} onChange={e => setAptForm({...aptForm, staffId: e.target.value})}>
                        <option value="">Sin asignar / Cualquiera</option>
                        <optgroup label="Especialistas Recomendados">
                            {staff.filter(s => s.specialties.includes(aptForm.serviceTypeId || '')).map(s => (
                                <option key={s.id} value={s.id}>{s.name} ★</option>
                            ))}
                        </optgroup>
                        <optgroup label="Otros Miembros">
                            {staff.filter(s => !s.specialties.includes(aptForm.serviceTypeId || '')).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="date" required className={inputClass} value={aptForm.date?.split('T')[0] || ''} onChange={e => setAptForm({...aptForm, date: new Date(e.target.value).toISOString()})} />
                    <input type="time" required className={inputClass} value={aptForm.startTime || ''} onChange={e => setAptForm({...aptForm, startTime: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Duración (min)</label><input type="number" min="1" className={inputClass} value={aptForm.durationMinutes || 0} onChange={e => setAptForm({...aptForm, durationMinutes: Number(e.target.value)})} /></div>
                    <div>
                        <label className={labelClass}>Precio Base (€)</label>
                        <input 
                            type="number" 
                            className={inputClass} 
                            value={aptForm.basePrice || 0} 
                            onChange={e => {
                                const newBasePrice = Number(e.target.value);
                                const newFinalPrice = calculateFinalPrice(newBasePrice, aptForm.discountPercentage || 0);
                                setAptForm(prev => ({...prev, basePrice: newBasePrice, price: newFinalPrice}));
                            }} 
                        />
                        {aptForm.basePrice !== undefined && (
                            <div className="mt-1 text-xs text-gray-700 dark:text-gray-400">
                                ({aptForm.discountPercentage || 0}% desc.) Precio Final: <span className="font-bold text-gray-900 dark:text-gray-200">{formatCurrency(aptForm.price || 0)}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Estado</label>
                    <div className="flex gap-2">
                        <select className={inputClass} value={aptForm.statusId} onChange={e => setAptForm({...aptForm, statusId: e.target.value})}>
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button 
                            type="button"
                            onClick={() => {
                                const target = statuses.find(s => s.isDefault && s.isBillable) || statuses.find(s => s.isBillable);
                                if (target) setAptForm({...aptForm, statusId: target.id});
                            }}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 p-2 rounded-md mt-1 border border-emerald-200 dark:border-emerald-800 transition-colors"
                            title="Marcar como Realizada (Facturable)"
                        >
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Notas</label>
                    <textarea 
                        className={`${inputClass} h-24`} 
                        value={aptForm.notes || ''} 
                        onChange={e => setAptForm({...aptForm, notes: e.target.value})} 
                        placeholder="Añadir notas sobre la cita..."
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    {editingApt && <button type="button" onClick={handleDeleteApt} className="flex-1 bg-red-100 text-red-600 p-2 rounded">Eliminar</button>}
                    <button type="submit" className="flex-[2] bg-teal-600 text-white p-2 rounded">Guardar</button>
                </div>
            </form>
        </Modal>

        {/* ... Other Modals (Staff, Client, Service) ... */}
        <Modal isOpen={isStaffModalOpen} onClose={() => setStaffModalOpen(false)} title={editingStaff ? "Editar Miembro" : "Nuevo Miembro"}>
            <form onSubmit={handleSaveStaff} className="space-y-4">
                <div><label className={labelClass}>Nombre</label><input type="text" required className={inputClass} value={staffForm.name || ''} onChange={e => setStaffForm({...staffForm, name: e.target.value})} /></div>
                <div><label className={labelClass}>Coste Hora Base (€)</label><input type="number" required className={inputClass} value={staffForm.defaultRate || ''} onChange={e => setStaffForm({...staffForm, defaultRate: Number(e.target.value)})} /></div>
                <div>
                    <label className={labelClass}>Especialidades y Tarifas Específicas</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {services.map(s => {
                            const isChecked = staffForm.specialties?.includes(s.id) || false;
                            const specificRate = staffForm.rates?.[s.id];
                            return (
                                <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                                    <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input type="checkbox" checked={isChecked} onChange={e => {
                                            const specs = staffForm.specialties || [];
                                            setStaffForm({ ...staffForm, specialties: e.target.checked ? [...specs, s.id] : specs.filter(id => id !== s.id) });
                                        }} className="rounded text-teal-600 focus:ring-teal-500" />
                                        <span className={isChecked ? 'font-medium' : ''}>{s.name}</span>
                                    </label>
                                    {isChecked && (
                                        <div className="flex items-center space-x-1">
                                            <span className="text-xs text-gray-600">€/h:</span>
                                            <input type="number" className="w-16 p-1 text-sm border rounded bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-700 dark:text-white" placeholder={staffForm.defaultRate?.toString()} value={specificRate ?? ''} onChange={e => { const val = e.target.value ? Number(e.target.value) : undefined; const newRates = { ...(staffForm.rates || {}) }; if (val !== undefined) newRates[s.id] = val; else delete newRates[s.id]; setStaffForm({ ...staffForm, rates: newRates }); }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
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
                    <input 
                        type="number" 
                        min="0" 
                        max="100"
                        className={inputClass} 
                        value={clientForm.discountPercentage ?? 0} 
                        onChange={e => setClientForm({...clientForm, discountPercentage: Number(e.target.value)})} 
                    />
                </div>
                <div><label className={labelClass}>Notas</label><textarea className={inputClass} value={clientForm.notes || ''} onChange={e => setClientForm({...clientForm, notes: e.target.value})} /></div>
                <button type="submit" className="w-full bg-teal-600 text-white p-2 rounded">Guardar</button>
            </form>
        </Modal>
        
        <Modal isOpen={isServiceModalOpen} onClose={() => setServiceModalOpen(false)} title="Tratamiento">
             <form onSubmit={handleSaveService} className="space-y-4">
                <div><label className={labelClass}>Nombre</label><input type="text" required className={inputClass} value={serviceForm.name || ''} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className={labelClass}>Precio</label><input type="number" min="0" className={inputClass} value={serviceForm.defaultPrice || 0} onChange={e => setServiceForm({...serviceForm, defaultPrice: Number(e.target.value)})} /></div>
                   <div><label className={labelClass}>Duración (min)</label><input type="number" min="1" className={inputClass} value={serviceForm.defaultDuration || 0} onChange={e => setServiceForm({...serviceForm, defaultDuration: Number(e.target.value)})} /></div>
                </div>
                <div><label className={labelClass}>Recurrencia (Días)</label><input type="number" min="0" className={inputClass} value={serviceForm.recurrenceDays || 0} onChange={e => setServiceForm({...serviceForm, recurrenceDays: Number(e.target.value)})} /></div>
                <button type="submit" className="w-full bg-teal-600 text-white p-2 rounded">Guardar</button>
            </form>
        </Modal>

        <MoveCopyModal isOpen={!!moveRequest} onClose={() => setMoveRequest(null)} onMove={executeMove} onCopy={executeCopy} />
        
    </Layout>
  );
};

export default App;