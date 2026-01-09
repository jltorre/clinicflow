


import React, { useState } from 'react';
// FIX: Removed v9 import, using v8 style auth call.
import { auth, googleProvider } from '../firebase';
import { Calendar, Activity, ShieldCheck, ArrowRight, User, AlertTriangle } from 'lucide-react';

interface LoginViewProps {
    onGuestLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onGuestLogin }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // FIX: Use v8 namespaced API for signInWithPopup.
      await auth.signInWithPopup(googleProvider);
    } catch (err: any) {
      console.error("Login failed:", err);
      setError('No se pudo iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl flex overflow-hidden min-h-[600px]">
        
        {/* Left Side: Hero Info */}
        <div className="hidden md:flex w-1/2 bg-gray-50 dark:bg-gray-800 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-teal-100 dark:bg-teal-900/20 mix-blend-multiply opacity-50 blur-xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-100 dark:bg-blue-900/20 mix-blend-multiply opacity-50 blur-xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">ClinicFlow</span>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Gestiona tu clínica con inteligencia.
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
              Agenda citas, gestiona clientes y analiza la retención de tu negocio en una sola plataforma.
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex items-center space-x-3 text-gray-800 dark:text-gray-300">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="font-medium">Gestión de Agenda Avanzada</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-800 dark:text-gray-300">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-medium">Analítica de Retención y Finanzas</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-800 dark:text-gray-300">
               <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-medium">Datos Seguros en la Nube</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white dark:bg-gray-900">
          <div className="md:hidden flex items-center space-x-2 mb-8">
             <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
             </div>
             <span className="text-xl font-bold text-gray-800 dark:text-white">ClinicFlow</span>
          </div>

          <div className="text-center md:text-left mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bienvenido de nuevo</h2>
            <p className="text-gray-700 dark:text-gray-400">Inicia sesión para acceder a tu panel de control.</p>
          </div>

          <div className="w-full">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3.5 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-3" aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="font-medium">Continuar con Google</span>
                </>
              )}
            </button>

            {onGuestLogin && (
                <>
                    <div className="flex items-center my-6">
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-600 text-sm font-medium">O visita sin cuenta</span>
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                    </div>

                    <button
                        onClick={onGuestLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center px-4 py-3.5 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-sm font-semibold"
                    >
                        Entrar como Invitado
                    </button>

                    <div className="mt-4 flex items-start justify-center text-center px-2">
                        <p className="text-xs text-gray-600 dark:text-gray-500 leading-relaxed max-w-xs">
                            <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-500" />
                            <span className="font-semibold text-gray-700 dark:text-gray-400">Modo Invitado:</span> Los datos solo se guardarán en este navegador y no se sincronizarán si cambias de dispositivo.
                        </p>
                    </div>
                </>
            )}
            
            {error && (
              <div className="mt-6 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center animate-fade-in-up">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
