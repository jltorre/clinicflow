
export interface AppStatus {
  id: string;
  name: string;
  color: string; // Tailwind class string e.g. 'bg-blue-100 text-blue-800'
  isBillable: boolean;
  isDefault?: boolean; // New field: determines which status is applied by the quick check button
  isInitial?: boolean; // New field: determines which status is applied to new appointments
}

export interface Staff {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialties: string[]; // Array of ServiceType IDs
  defaultRate: number; // Base hourly rate
  rates: Record<string, number>; // Map: serviceTypeId -> specific hourly rate
  color: string;
  createdAt: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  createdAt: number;
  discountPercentage?: number; // New field: discount percentage for the client (0-100)
  finishedTreatments?: string[]; // New field: Array of ServiceType IDs that are considered "finished" for this client
}

export interface ServiceType {
  id: string;
  name: string;
  defaultPrice: number;
  recurrenceDays: number; // Days until next appointment of this type is recommended
  defaultDuration: number; // Duration in minutes
  color: string;
  upcomingThresholdDays?: number; // Days before recurrence date to start showing as "upcoming"
}

export interface AppointmentServiceItem {
  instanceId?: string; // Unique ID for this specific item instance in the appointment (optional for backward compatibility)
  serviceId: string;
  name: string;
  unitPrice: number;
  durationMinutes: number;
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceTypeId: string;
  staffId?: string; // Optional assignment
  statusId: string; // Reference to AppStatus.id
  date: string; // ISO Date String
  startTime: string; // HH:mm
  durationMinutes: number;
  basePrice: number; // New field: The original price of the service before discount
  discountPercentage: number; // New field: The discount percentage applied to this specific appointment
  price: number; // This will be the FINAL price after discount
  bookingFeePaid: boolean; // NEW: If the reservation was paid
  bookingFeeAmount: number; // NEW: Amount of the reservation
  notes?: string; // New field: notes for the appointment
  inventoryItems?: AppointmentInventorySale[]; // Items sold during the appointment
  inventoryTotal?: number; // Total amount from inventory items
  serviceItems?: AppointmentServiceItem[]; // NEW: Multiple services per appointment
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock?: number;
  purchaseDate?: string; // ISO date
  category?: string;
  createdAt: number;
}

export interface AppointmentInventorySale {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: 'sale' | 'purchase' | 'adjustment';
  quantity: number; // Positive for purchase/adjustment up, negative for sale/adjustment down
  date: string; // ISO Date
  price?: number; // Price per unit (salePrice or costPrice depending on type)
  appointmentId?: string; // If type is 'sale'
  notes?: string;
  createdAt: number;
}

// Analytics Types
export interface ClientRetentionMetric {
  clientId: string;
  clientName: string;
  lastAppointmentDate: string;
  lastServiceName: string;
  recommendedReturnDate: string;
  daysOverdue: number;
  status: 'ontime' | 'upcoming' | 'overdue';
}

export interface FinancialSummary {
  clientId: string;
  clientName: string;
  totalSpent: number;
  projectedRevenue: number;
  total: number;
}

export interface AppSettings {
  currency: string;
  defaultBookingFee: number; // NEW: Global setting for booking fee
  defaultCalendarView?: 'list' | 'day' | 'week' | 'month'; // NEW: Default view for the calendar
  theme?: 'light' | 'dark' | 'system'; // NEW: Theme setting
  timeFormat?: '12h' | '24h'; // NEW: 12h (am/pm) or 24h format
}

// User Profile Type
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}
