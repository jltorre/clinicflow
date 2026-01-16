
import { Client, ServiceType, AppStatus, Staff, Appointment } from '../types';

// Helpers to create static dates relative to "Now" to ensure analytics always look good
const now = new Date();
const today = (hour: number, minute: number) => {
    const d = new Date(now); d.setHours(hour, minute, 0, 0); return d.toISOString();
};
const addDays = (days: number, hour: number, minute: number) => {
    const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(hour, minute, 0, 0); return d.toISOString();
};

export const MOCK_CLIENTS: Client[] = [
    { id: 'c1', name: 'Ana García', email: 'ana@ejemplo.com', phone: '600 111 222', createdAt: Date.now(), notes: 'Cliente frecuente. Prefiere tardes.', discountPercentage: 0, finishedTreatments: [] },
    { id: 'c2', name: 'Carlos Ruíz', email: 'carlos@ejemplo.com', phone: '600 333 444', createdAt: Date.now(), discountPercentage: 0, finishedTreatments: [] },
    { id: 'c3', name: 'Elena Torres', email: 'elena@ejemplo.com', phone: '600 555 666', createdAt: Date.now(), notes: 'Sensibilidad dental.', discountPercentage: 0, finishedTreatments: [] },
    { id: 'c4', name: 'Miguel Ángel', email: 'miguel@ejemplo.com', phone: '600 777 888', createdAt: Date.now(), discountPercentage: 0, finishedTreatments: [] },
    { id: 'c5', name: 'Lucía Méndez', email: 'lucia@ejemplo.com', phone: '600 999 000', createdAt: Date.now(), discountPercentage: 10, finishedTreatments: [] }, // Example with discount
    { id: 'c6', name: 'Sofía Valer', email: 'sofia@ejemplo.com', phone: '600 888 111', createdAt: Date.now(), discountPercentage: 0, finishedTreatments: ['s3'] }, // Example with one finished treatment
];

export const MOCK_SERVICES: ServiceType[] = [
    { id: 's1', name: 'Botox', defaultPrice: 50, recurrenceDays: 60, defaultDuration: 60, color: 'bg-blue-100 text-blue-800' }, // Updated duration to 60 min
    { id: 's2', name: 'Limpieza Dental', defaultPrice: 80, recurrenceDays: 180, defaultDuration: 45, color: 'bg-teal-100 text-teal-800' },
    { id: 's3', name: 'Blanqueamiento', defaultPrice: 200, recurrenceDays: 365, defaultDuration: 90, color: 'bg-purple-100 text-purple-800' },
    { id: 's4', name: 'Ortodoncia Rev', defaultPrice: 60, recurrenceDays: 30, defaultDuration: 20, color: 'bg-indigo-100 text-indigo-800' },
    { id: 's5', name: 'Implante', defaultPrice: 800, recurrenceDays: 30, defaultDuration: 120, color: 'bg-orange-100 text-orange-800' },
];

export const MOCK_STATUSES: AppStatus[] = [
    { id: 'st1', name: 'Programada', color: 'bg-gray-100 text-gray-800', isBillable: false, isDefault: false },
    { id: 'st2', name: 'Confirmada', color: 'bg-blue-100 text-blue-800', isBillable: false, isDefault: false },
    { id: 'st3', name: 'Realizada', color: 'bg-green-100 text-green-800', isBillable: true, isDefault: true }, // Billable & Default
    { id: 'st4', name: 'Cancelada', color: 'bg-red-100 text-red-800', isBillable: false, isDefault: false },
    { id: 'st5', name: 'No Asistió', color: 'bg-orange-100 text-orange-800', isBillable: false, isDefault: false }, 
];

export const MOCK_STAFF: Staff[] = [
    { 
        id: 'staff1', 
        name: 'Fran', // Updated name to match screenshot
        specialties: ['s1', 's3', 's4', 's5'], 
        defaultRate: 30, // Updated default rate to match screenshot
        rates: { 's1': 60 }, // Specific rate for s1 (Botox) to match screenshot
        color: 'bg-indigo-100 text-indigo-800', 
        createdAt: Date.now() 
    },
    { 
        id: 'staff2', 
        name: 'Laura Higienista', 
        specialties: ['s2', 's3'], 
        defaultRate: 25,
        rates: {},
        color: 'bg-rose-100 text-rose-800', 
        createdAt: Date.now() 
    }
];

// Helper to calculate final price
const calculateFinalPrice = (basePrice: number, discountPercentage: number) => {
    return basePrice * (1 - discountPercentage / 100);
};

export const MOCK_APPOINTMENTS: Appointment[] = [
    // --- PAST APPOINTMENTS (Crucial for Retention Analytics, these are billable but likely outside current month's default view) ---
    
    // 1. Ana (c1): Had Ortodoncia (30d recur) 45 days ago. 
    // Status: OVERDUE by 15 days.
    { 
        id: 'h1', clientId: 'c1', serviceTypeId: 's4', staffId: 'staff1', statusId: 'st3', 
        date: addDays(-45, 10, 0), startTime: '10:00', durationMinutes: 30, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's4')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c1')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's4')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c1')?.discountPercentage || 0),
        bookingFeePaid: false, bookingFeeAmount: 0,
        notes: 'Revisión de ortodoncia pasada. Cliente muy satisfecho con el progreso.' 
    },

    // 2. Carlos (c2): Had Limpieza (180d recur) 175 days ago.
    // Status: UPCOMING (Due in 5 days).
    { 
        id: 'h2', clientId: 'c2', serviceTypeId: 's2', staffId: 'staff2', statusId: 'st3', 
        date: addDays(-175, 11, 0), startTime: '11:00', durationMinutes: 45, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's2')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c2')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's2')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c2')?.discountPercentage || 0),
        bookingFeePaid: false, bookingFeeAmount: 0,
        notes: 'Limpieza profunda. Recomendar en 5 días.' 
    },

    // 3. Elena (c3): Had Consulta (180d recur) 10 days ago.
    // Status: ON TIME.
    { 
        id: 'h3', clientId: 'c3', serviceTypeId: 's1', staffId: 'staff1', statusId: 'st3', 
        date: addDays(-10, 9, 0), startTime: '09:00', durationMinutes: 30, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's1')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c3')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's1')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c3')?.discountPercentage || 0),
        bookingFeePaid: false, bookingFeeAmount: 0,
        notes: 'Botox con muy buenos resultados. Revisar al mes.' 
    },

    // 4. Miguel (c4): Had Ortodoncia (30d recur) 28 days ago.
    // Status: UPCOMING (Due in 2 days).
    { 
        id: 'h4', clientId: 'c4', serviceTypeId: 's4', staffId: 'staff1', statusId: 'st3', 
        date: addDays(-28, 16, 0), startTime: '16:00', durationMinutes: 20, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's4')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c4')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's4')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c4')?.discountPercentage || 0),
        bookingFeePaid: false, bookingFeeAmount: 0,
        notes: 'Seguimiento de ortodoncia. Pequeño ajuste.' 
    },

    // 5. Sofia (c6): Had Blanqueamiento (365d recur) 400 days ago. THIS TREATMENT IS FINISHED, SO SHE SHOULDN'T APPEAR IN RETENTION.
    // Status: OVERDUE (by 35 days).
    { 
        id: 'h5', clientId: 'c6', serviceTypeId: 's3', staffId: 'staff2', statusId: 'st3', 
        date: addDays(-400, 12, 0), startTime: '12:00', durationMinutes: 90, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's3')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c6')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's3')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c6')?.discountPercentage || 0),
        bookingFeePaid: false, bookingFeeAmount: 0,
        notes: 'Blanqueamiento antiguo. Contactar para recordatorio, aunque se ha mudado.' 
    },

    // --- CURRENT & FUTURE APPOINTMENTS (Some made 'Realizada' to populate current month's financial report) ---
    { 
        id: 'a1', clientId: 'c4', serviceTypeId: 's1', staffId: 'staff1', statusId: 'st3', 
        date: today(9, 30), startTime: '09:30', durationMinutes: 60, // Updated duration to 60 min
        basePrice: MOCK_SERVICES.find(s => s.id === 's1')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c4')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's1')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c4')?.discountPercentage || 0),
        bookingFeePaid: false, bookingFeeAmount: 0,
        notes: 'Botox facial completo, cliente pidió un extra en la zona de la frente.'
    }, 
    { 
        id: 'a2', clientId: 'c5', serviceTypeId: 's3', staffId: 'staff2', statusId: 'st3', 
        date: today(12, 0), startTime: '12:00', durationMinutes: 90, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's3')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c5')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's3')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c5')?.discountPercentage || 0),
        bookingFeePaid: true, bookingFeeAmount: 20,
        notes: 'Primera sesión de blanqueamiento. Comentar sobre mantenimiento en casa.'
    },
    { 
        id: 'a3', clientId: 'c1', serviceTypeId: 's2', staffId: 'staff2', statusId: 'st3', 
        date: addDays(1, 15, 0), startTime: '15:00', durationMinutes: 45, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's2')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c1')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's2')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c1')?.discountPercentage || 0),
        bookingFeePaid: false, bookingFeeAmount: 0,
        notes: 'Limpieza anual. Recordar al cliente sobre higiene interdental.'
    },
    { 
        id: 'a4', clientId: 'c2', serviceTypeId: 's5', staffId: 'staff1', statusId: 'st2', 
        date: addDays(1, 10, 0), startTime: '10:00', durationMinutes: 120, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's5')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c2')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's5')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c2')?.discountPercentage || 0),
        bookingFeePaid: true, bookingFeeAmount: 50,
        notes: 'Consulta inicial para implante. Confirmar con laboratorio.'
    },
    { 
        id: 'a5', clientId: 'c3', serviceTypeId: 's4', staffId: 'staff1', statusId: 'st1', // FIX: Was 'No Asistió' (st5), changed to 'Programada' (st1) for logical consistency
        date: addDays(2, 16, 30), startTime: '16:30', durationMinutes: 20, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's4')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c3')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's4')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c3')?.discountPercentage || 0),
        bookingFeePaid: false, bookingFeeAmount: 0,
        notes: 'Cliente no se presentó. Intentar re-agendar por teléfono.'
    },
    { 
        id: 'a6', clientId: 'c4', serviceTypeId: 's1', staffId: 'staff1', statusId: 'st4', 
        date: addDays(2, 9, 0), startTime: '09:00', durationMinutes: 30, 
        basePrice: MOCK_SERVICES.find(s => s.id === 's1')?.defaultPrice || 0,
        discountPercentage: MOCK_CLIENTS.find(c => c.id === 'c4')?.discountPercentage || 0,
        price: calculateFinalPrice(MOCK_SERVICES.find(s => s.id === 's1')?.defaultPrice || 0, MOCK_CLIENTS.find(c => c.id === 'c4')?.discountPercentage || 0),
        bookingFeePaid: false, bookingFeeAmount: 0,
        notes: 'Canceló por viaje de última hora. Re-agendar para la semana siguiente.'
    },
];
