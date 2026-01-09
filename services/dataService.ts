import { Client, ServiceType, Appointment, AppStatus, Staff, UserProfile } from '../types';
import { db } from '../firebase';
import { MOCK_CLIENTS, MOCK_SERVICES, MOCK_STATUSES, MOCK_STAFF, MOCK_APPOINTMENTS } from './mockData';
// FIX: Switched to Firebase v8 syntax.
// FIX: Using compat imports to get correct types and namespaces.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

const COLLECTIONS = {
  CLIENTS: 'clients',
  TREATMENTS: 'treatments',
  APPOINTMENTS: 'appointments',
  STATUSES: 'statuses',
  STAFF: 'staff',
  USERS: 'users'
};

// Initialize In-Memory Data with robust static data
let mockClients: Client[] = [...MOCK_CLIENTS];
let mockServices: ServiceType[] = [...MOCK_SERVICES];
let mockStatuses: AppStatus[] = [...MOCK_STATUSES];
let mockStaff: Staff[] = [...MOCK_STAFF];
let mockAppointments: Appointment[] = [...MOCK_APPOINTMENTS];

export const dataService = {
  // User Profile
  // FIX: Corrected Firebase User type to firebase.User
  getUserProfile: async (firebaseUser: firebase.User): Promise<UserProfile> => {
    const userRef = db.collection(COLLECTIONS.USERS).doc(firebaseUser.uid);
    const docSnap = await userRef.get();

    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    } else {
      const newProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || firebaseUser.email || 'Usuario Nuevo',
        createdAt: Date.now(),
      };
      await userRef.set(newProfile);
      return newProfile;
    }
  },

  // Clients
  getClients: async (userId: string): Promise<Client[]> => {
    if (!userId) return [];
    if (userId === 'guest') return Promise.resolve([...mockClients]);
    try {
      const querySnapshot = await db.collection(COLLECTIONS.CLIENTS).where("userId", "==", userId).get();
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
    } catch (e) { console.error(e); return []; }
  },
  
  saveClient: async (client: Client, userId: string): Promise<Client> => {
    if (userId === 'guest') {
        if (!client.id) {
            const newClient = { ...client, id: `guest-c${Date.now()}` };
            mockClients.push(newClient);
            return Promise.resolve(newClient);
        } else {
            mockClients = mockClients.map(c => c.id === client.id ? client : c);
            return Promise.resolve(client);
        }
    }
    if (!client.id) {
        const { id, ...data } = client;
        const docRef = await db.collection(COLLECTIONS.CLIENTS).add({ ...data, userId });
        return { ...client, id: docRef.id };
    } else {
        const clientRef = db.collection(COLLECTIONS.CLIENTS).doc(client.id);
        const { id, ...data } = client;
        await clientRef.update(data);
        return client;
    }
  },
  
  deleteClient: async (id: string, userId?: string): Promise<void> => {
    if (id.startsWith('guest-') || userId === 'guest' || MOCK_CLIENTS.find(c => c.id === id)) {
        mockClients = mockClients.filter(c => c.id !== id);
        return Promise.resolve();
    }
    await db.collection(COLLECTIONS.CLIENTS).doc(id).delete();
  },

  // Services
  getServices: async (userId: string): Promise<ServiceType[]> => {
    if (!userId) return [];
    if (userId === 'guest') return Promise.resolve([...mockServices]);
    try {
      const querySnapshot = await db.collection(COLLECTIONS.TREATMENTS).where("userId", "==", userId).get();
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType));
    } catch (e) { console.error(e); return []; }
  },
  
  saveService: async (service: ServiceType, userId: string): Promise<ServiceType> => {
    if (userId === 'guest') {
        if (!service.id) {
            const newService = { ...service, id: `guest-s${Date.now()}` };
            mockServices.push(newService);
            return Promise.resolve(newService);
        } else {
            mockServices = mockServices.map(s => s.id === service.id ? service : s);
            return Promise.resolve(service);
        }
    }
    if (!service.id) {
        const { id, ...data } = service;
        const docRef = await db.collection(COLLECTIONS.TREATMENTS).add({ ...data, userId });
        return { ...service, id: docRef.id };
    } else {
        const serviceRef = db.collection(COLLECTIONS.TREATMENTS).doc(service.id);
        const { id, ...data } = service;
        await serviceRef.update(data);
        return service;
    }
  },
  
  deleteService: async (id: string, userId?: string): Promise<void> => {
    if (id.startsWith('guest-') || userId === 'guest' || MOCK_SERVICES.find(s => s.id === id)) {
        mockServices = mockServices.filter(s => s.id !== id);
        return Promise.resolve();
    }
    await db.collection(COLLECTIONS.TREATMENTS).doc(id).delete();
  },

  // Statuses
  getStatuses: async (userId: string): Promise<AppStatus[]> => {
      if (!userId) return [];
      if (userId === 'guest') return Promise.resolve([...mockStatuses]);
      try {
          const querySnapshot = await db.collection(COLLECTIONS.STATUSES).where("userId", "==", userId).get();
          const statuses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppStatus));
          
          if (statuses.length === 0) {
              const defaults = MOCK_STATUSES;
              const created = [];
              for (const d of defaults) {
                  const docRef = await db.collection(COLLECTIONS.STATUSES).add({ ...d, userId });
                  created.push({ id: docRef.id, ...d });
              }
              return created;
          }
          return statuses;
      } catch (e) { console.error(e); return []; }
  },

  saveStatus: async (status: AppStatus, userId: string): Promise<AppStatus> => {
      if (userId === 'guest') {
          if (!status.id) {
              const newS = { ...status, id: `status-${Date.now()}` };
              mockStatuses.push(newS);
              return Promise.resolve(newS);
          } else {
              mockStatuses = mockStatuses.map(s => s.id === status.id ? status : s);
              return Promise.resolve(status);
          }
      }
      if (!status.id) {
          const { id, ...data } = status;
          const docRef = await db.collection(COLLECTIONS.STATUSES).add({ ...data, userId });
          return { ...status, id: docRef.id };
      } else {
          const ref = db.collection(COLLECTIONS.STATUSES).doc(status.id);
          const { id, ...data } = status;
          await ref.update(data);
          return status;
      }
  },

  deleteStatus: async (id: string, userId?: string): Promise<void> => {
      if (id.startsWith('status-') || userId === 'guest' || MOCK_STATUSES.find(s => s.id === id)) {
          mockStatuses = mockStatuses.filter(s => s.id !== id);
          return Promise.resolve();
      }
      await db.collection(COLLECTIONS.STATUSES).doc(id).delete();
  },

  // Staff
  getStaff: async (userId: string): Promise<Staff[]> => {
      if (!userId) return [];
      if (userId === 'guest') return Promise.resolve([...mockStaff]);
      try {
          const qs = await db.collection(COLLECTIONS.STAFF).where("userId", "==", userId).get();
          return qs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      } catch(e) { console.error(e); return []; }
  },

  saveStaff: async (staff: Staff, userId: string): Promise<Staff> => {
      if (userId === 'guest') {
          if (!staff.id) {
              const newS = { ...staff, id: `staff-${Date.now()}` };
              mockStaff.push(newS);
              return Promise.resolve(newS);
          } else {
              mockStaff = mockStaff.map(s => s.id === staff.id ? staff : s);
              return Promise.resolve(staff);
          }
      }
      if (!staff.id) {
          const { id, ...data } = staff;
          const docRef = await db.collection(COLLECTIONS.STAFF).add({ ...data, userId });
          return { ...staff, id: docRef.id };
      } else {
          const ref = db.collection(COLLECTIONS.STAFF).doc(staff.id);
          const { id, ...data } = staff;
          await ref.update(data);
          return staff;
      }
  },

  deleteStaff: async (id: string, userId?: string): Promise<void> => {
    if (id.startsWith('staff-') || userId === 'guest' || MOCK_STAFF.find(s => s.id === id)) {
        mockStaff = mockStaff.filter(s => s.id !== id);
        return Promise.resolve();
    }
    await db.collection(COLLECTIONS.STAFF).doc(id).delete();
  },

  // Appointments
  getAppointments: async (userId: string): Promise<Appointment[]> => {
    if (!userId) return [];
    if (userId === 'guest') return Promise.resolve([...mockAppointments]);
    try {
      const querySnapshot = await db.collection(COLLECTIONS.APPOINTMENTS).where("userId", "==", userId).get();
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    } catch (e) { console.error(e); return []; }
  },
  
  saveAppointment: async (apt: Appointment, userId: string): Promise<Appointment> => {
    if (userId === 'guest') {
        if (!apt.id) {
            const newApt = { ...apt, id: `guest-a${Date.now()}` };
            mockAppointments.push(newApt);
            return Promise.resolve(newApt);
        } else {
            mockAppointments = mockAppointments.map(a => a.id === apt.id ? apt : a);
            return Promise.resolve(apt);
        }
    }
    if (!apt.id) {
        const { id, ...data } = apt;
        const docRef = await db.collection(COLLECTIONS.APPOINTMENTS).add({ ...data, userId });
        return { ...apt, id: docRef.id };
    } else {
        const aptRef = db.collection(COLLECTIONS.APPOINTMENTS).doc(apt.id);
        const { id, ...data } = apt;
        await aptRef.update(data);
        return apt;
    }
  },
  
  deleteAppointment: async (id: string, userId?: string): Promise<void> => {
    if (id.startsWith('guest-') || userId === 'guest' || MOCK_APPOINTMENTS.find(a => a.id === id)) {
        mockAppointments = mockAppointments.filter(a => a.id !== id);
        return Promise.resolve();
    }
    await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).delete();
  }
};