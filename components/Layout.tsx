import React from 'react';
import { Calendar, Users, Briefcase, TrendingUp, DollarSign, Moon, Sun, Settings, BadgeCheck, Menu, LogOut, Box } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isGuest: boolean;
  userPhotoUrl: string | null;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  darkMode, 
  toggleDarkMode, 
  isGuest,
  userPhotoUrl,
  userName,
  userEmail,
  onLogout
}) => {
  
  const menuGroups = [
      {
          label: 'Principal',
          items: [
              { id: 'calendar', label: 'Agenda', icon: Calendar },
          ]
      },
      {
          label: 'Gestión',
          items: [
              { id: 'clients', label: 'Clientes', icon: Users },
              { id: 'services', label: 'Tratamientos', icon: Briefcase },
              { id: 'staff', label: 'Equipo', icon: BadgeCheck },
              { id: 'inventory', label: 'Inventario', icon: Box },
          ]
      },
      {
          label: 'Analítica',
          items: [
              { id: 'analytics', label: 'Retención', icon: TrendingUp },
              { id: 'financial', label: 'Finanzas', icon: DollarSign },
          ]
      },
      {
          label: 'Sistema',
          items: [
              { id: 'settings', label: 'Ajustes', icon: Settings },
          ]
      }
  ];

  // Mobile menu items (flattened for bottom bar)
  const mobileItems = [
      { id: 'calendar', label: 'Agenda', icon: Calendar },
      { id: 'clients', label: 'Clientes', icon: Users },
      { id: 'inventory', label: 'Inventario', icon: Box },
      { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col transition-colors duration-200 shrink-0">
        <div className="p-6 flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-bold text-gray-800 dark:text-white">ClinicFlow</span>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-6 overflow-y-auto">
          {menuGroups.map((group, idx) => (
              <div key={idx}>
                  <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                        const Icon = item.icon;
                        // Special handling for detail tabs: highlight parent tab
                        const isActive = activeTab === item.id || 
                                       (activeTab === 'client-detail' && item.id === 'clients') ||
                                       (activeTab === 'service-detail' && item.id === 'services') ||
                                       (activeTab === 'staff-detail' && item.id === 'staff');
                        return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                            isActive 
                                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' 
                                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon className={`mr-3 h-4 w-4 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-500'}`} />
                            {item.label}
                        </button>
                        );
                    })}
                  </div>
              </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 shrink-0">
           {/* User Profile Section */}
           {!isGuest && (
             <div className="flex flex-col items-center p-3 space-y-2 rounded-lg bg-gray-50 dark:bg-gray-700">
               {userPhotoUrl ? (
                 <img src={userPhotoUrl} alt={userName} className="w-10 h-10 rounded-full object-cover" />
               ) : (
                 <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white text-lg font-bold">
                   {userName.charAt(0).toUpperCase()}
                 </div>
               )}
               <div className="text-center">
                 <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                 <p className="text-xs text-gray-600 dark:text-gray-400">{userEmail}</p>
               </div>
               <button 
                  onClick={onLogout} 
                  className="w-full flex items-center justify-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors border border-gray-200 dark:border-gray-700"
               >
                 <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
               </button>
             </div>
           )}

           {/* Dark Mode Toggle */}
           <button 
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
           >
              <span className="flex items-center">
                  {darkMode ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
                  {darkMode ? 'Oscuro' : 'Claro'}
              </span>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${darkMode ? 'bg-teal-600' : 'bg-gray-400'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden relative pb-16 md:pb-0">
        
        {/* Guest Banner */}
        {isGuest && (
          <div className="bg-indigo-600 text-white text-xs py-1.5 text-center shrink-0 shadow-md px-2 z-30">
             Estás en <strong>Modo Invitado</strong>. Los cambios no se guardarán al recargar.
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center shrink-0 z-20">
          <span className="font-bold text-gray-800 dark:text-white text-lg">ClinicFlow</span>
          <button onClick={toggleDarkMode} className="text-gray-600 dark:text-gray-400">
             {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-h-0 w-full relative">
            <div className="absolute inset-0 p-3 md:p-8 flex flex-col overflow-y-auto">
                 {children}
            </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center px-2 py-2 z-40 safe-area-pb">
            {mobileItems.map((item) => {
                 const Icon = item.icon;
                 // Special handling for detail tabs: highlight parent tab
                 const isActive = activeTab === item.id || 
                                (activeTab === 'client-detail' && item.id === 'clients') ||
                                (activeTab === 'service-detail' && item.id === 'services') ||
                                (activeTab === 'staff-detail' && item.id === 'staff');
                 return (
                     <button 
                        key={item.id} 
                        onClick={() => setActiveTab(item.id)}
                        className={`flex flex-col items-center p-2 rounded-lg w-full ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-gray-500'}`}
                     >
                         <Icon className="h-6 w-6 mb-1" />
                         <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
                     </button>
                 )
            })}
        </div>
      </main>
    </div>
  );
};
