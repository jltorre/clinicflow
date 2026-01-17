import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, TrendingUp, DollarSign, Settings, Briefcase, ArrowRight, BadgeCheck, Box } from 'lucide-react';

interface OnboardingTourProps {
    isOpen: boolean;
    onClose: () => void;
}

const STEPS = [
    {
        title: "Bienvenido a ClinicFlow",
        description: "Tu sistema integral para la gestión clínica. Optimiza tu tiempo y aumenta la rentabilidad de tu negocio en una sola plataforma.",
        icon: <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl">C</div>
    },
    {
        title: "Agenda Inteligente",
        description: "Organiza tu día con vistas de Lista, Día, Semana y Mes. Arrastra citas para moverlas, estira para cambiar la duración y usa el botón de 'Check' para completarlas rápidamente.",
        icon: <Calendar className="w-12 h-12 text-teal-600" />
    },
    {
        title: "Gestión de Equipo y Servicios",
        description: "Define tus Tratamientos con colores y tiempos. Configura a tu Equipo asignando costes por hora específicos para cada tratamiento para un cálculo de beneficio exacto.",
        icon: <Briefcase className="w-12 h-12 text-blue-500" />
    },
    {
        title: "Control de Inventario",
        description: "Gestiona tu Stock físico y consulta las 'Reservas' automáticas de productos según tus próximas citas facturables. El stock se descuenta solo al completar la venta.",
        icon: <Box className="w-12 h-12 text-orange-500" />
    },
    {
        title: "Analítica de Retención",
        description: "El sistema detecta automáticamente qué clientes deberían volver según su tratamiento. Configura días de aviso personalizados para que nada se te escape.",
        icon: <TrendingUp className="w-12 h-12 text-purple-500" />
    },
    {
        title: "Control Financiero",
        description: "Visualiza tus ingresos reales vs. pendientes. Analiza la rentabilidad neta restando los costes de personal y materiales al beneficio generado.",
        icon: <DollarSign className="w-12 h-12 text-emerald-500" />
    },
    {
        title: "Personalización Avanzada",
        description: "En 'Ajustes' puedes crear tus propios Estados (ej: 'En Sala'). Elige cuál es el estado por defecto para nuevas citas y cuáles cuentan como facturables.",
        icon: <Settings className="w-12 h-12 text-gray-600" />
    }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    // Reset step when tour is opened
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const step = STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up border border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="relative p-8 md:p-10 flex flex-col items-center text-center flex-1">
                    <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    
                    <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-full shadow-inner">
                        {step.icon}
                    </div>
                    
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{step.title}</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                        {step.description}
                    </p>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex space-x-2">
                        {STEPS.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-teal-600' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
                            />
                        ))}
                    </div>
                    <button 
                        onClick={handleNext}
                        className="bg-teal-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-all shadow-lg shadow-teal-900/20 flex items-center"
                    >
                        {currentStep === STEPS.length - 1 ? 'Empezar' : 'Siguiente'}
                        {currentStep < STEPS.length - 1 && <ArrowRight className="w-5 h-5 ml-2" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
