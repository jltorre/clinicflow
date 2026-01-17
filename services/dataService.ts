import { Client, ServiceType, Appointment, AppStatus, Staff, UserProfile, InventoryItem, InventoryMovement } from '../types';
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
  USERS: 'users',
  INVENTORY: 'inventory',
  INVENTORY_MOVEMENTS: 'inventory_movements'
};

// Initialize In-Memory Data with robust static data
let mockClients: Client[] = [...MOCK_CLIENTS];
let mockServices: ServiceType[] = [...MOCK_SERVICES];
let mockStatuses: AppStatus[] = [...MOCK_STATUSES];
let mockStaff: Staff[] = [...MOCK_STAFF];
let mockAppointments: Appointment[] = [...MOCK_APPOINTMENTS];
let mockInventory: InventoryItem[] = [];
let mockMovements: InventoryMovement[] = [];

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
      return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id } as Client;
      });
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
    try {
        if (!client.id) {
            const { id, ...data } = client;
            console.log("Adding client:", { data, userId });
            const docRef = await db.collection(COLLECTIONS.CLIENTS).add({ ...data, userId });
            return { ...client, id: docRef.id };
        } else {
            const clientRef = db.collection(COLLECTIONS.CLIENTS).doc(client.id);
            const { id, ...data } = client;
            await clientRef.update({ ...data, userId });
            return client;
        }
    } catch (err) {
        console.error("Firestore Save Client Error:", err);
        throw err;
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
      return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id } as ServiceType;
      });
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
    try {
        if (!service.id) {
            const { id, ...data } = service;
            console.log("Adding service:", { data, userId });
            const docRef = await db.collection(COLLECTIONS.TREATMENTS).add({ ...data, userId });
            return { ...service, id: docRef.id };
        } else {
            console.log("Updating service:", { id: service.id, userId });
            const serviceRef = db.collection(COLLECTIONS.TREATMENTS).doc(service.id);
            const { id, ...data } = service;
            await serviceRef.update({ ...data, userId });
            return service;
        }
    } catch (err) {
        console.error("Firestore Save Service Error:", err);
        throw err;
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
          const statuses = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return { ...data, id: doc.id } as AppStatus;
          });
          
          if (statuses.length === 0) {
              const defaults = MOCK_STATUSES;
              const created = [];
              for (const d of defaults) {
                  const { id: _, ...cleanData } = d;
                  const payload = { ...cleanData, userId };
                  const docRef = await db.collection(COLLECTIONS.STATUSES).add(payload);
                  created.push({ ...payload, id: docRef.id });
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
      try {
          if (!status.id) {
              const { id, ...data } = status;
              console.log("Adding status:", { data, userId });
              const docRef = await db.collection(COLLECTIONS.STATUSES).add({ ...data, userId });
              return { ...status, id: docRef.id };
          } else {
              console.log("Updating status:", { id: status.id, userId });
              const ref = db.collection(COLLECTIONS.STATUSES).doc(status.id);
              const { id, ...data } = status;
              await ref.update({ ...data, userId });
              return status;
          }
      } catch (err) {
          console.error("Firestore Save Status Error:", err);
          throw err;
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
          return qs.docs.map(doc => {
              const data = doc.data();
              return { ...data, id: doc.id } as Staff;
          });
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
      try {
          if (!staff.id) {
              const { id, ...data } = staff;
              console.log("Adding staff:", { data, userId });
              const docRef = await db.collection(COLLECTIONS.STAFF).add({ ...data, userId });
              return { ...staff, id: docRef.id };
          } else {
              console.log("Updating staff:", { id: staff.id, userId });
              const ref = db.collection(COLLECTIONS.STAFF).doc(staff.id);
              const { id, ...data } = staff;
              await ref.update({ ...data, userId });
              return staff;
          }
      } catch (err) {
          console.error("Firestore Save Staff Error:", err);
          throw err;
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
      return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id } as Appointment;
      });
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
    try {
        // Remove undefined fields to prevent Firestore errors
        const cleanData = (obj: any) => {
            const cleaned: any = {};
            Object.keys(obj).forEach(key => {
                if (obj[key] !== undefined) {
                    cleaned[key] = obj[key];
                }
            });
            return cleaned;
        };

        if (!apt.id) {
            const { id, ...data } = apt;
            const cleanedData = cleanData(data);
            console.log("Adding appointment:", { cleanedData, userId });
            const docRef = await db.collection(COLLECTIONS.APPOINTMENTS).add({ ...cleanedData, userId });
            return { ...apt, id: docRef.id };
        } else {
            console.log("Updating appointment:", { id: apt.id, userId });
            const aptRef = db.collection(COLLECTIONS.APPOINTMENTS).doc(apt.id);
            const { id, ...data } = apt;
            const cleanedData = cleanData(data);
            await aptRef.update({ ...cleanedData, userId });
            return apt;
        }
    } catch (err) {
        console.error("Firestore Save Appointment Error:", err);
        throw err;
    }
  },
  
  deleteAppointment: async (id: string, userId?: string): Promise<void> => {
    if (id.startsWith('guest-') || userId === 'guest' || MOCK_APPOINTMENTS.find(a => a.id === id)) {
        mockAppointments = mockAppointments.filter(a => a.id !== id);
        return Promise.resolve();
    }
    await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).delete();
  },

  // Inventory
  getInventory: async (userId: string): Promise<InventoryItem[]> => {
    if (!userId) return [];
    if (userId === 'guest') return Promise.resolve([...mockInventory]);
    try {
      const querySnapshot = await db.collection(COLLECTIONS.INVENTORY).where("userId", "==", userId).get();
      return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id } as InventoryItem;
      });
    } catch (e) { console.error(e); return []; }
  },

  saveInventoryItem: async (item: InventoryItem, userId: string): Promise<InventoryItem> => {
    if (userId === 'guest') {
        if (!item.id) {
            const newItem = { ...item, id: `inv-${Date.now()}` };
            mockInventory.push(newItem);
            return Promise.resolve(newItem);
        } else {
            mockInventory = mockInventory.map(i => i.id === item.id ? item : i);
            return Promise.resolve(item);
        }
    }
    try {
        if (!item.id) {
            const { id, ...data } = item;
            console.log("Adding inventory item:", { data, userId });
            const docRef = await db.collection(COLLECTIONS.INVENTORY).add({ ...data, userId });
            return { ...item, id: docRef.id };
        } else {
            console.log("Updating inventory item:", { id: item.id, userId });
            const ref = db.collection(COLLECTIONS.INVENTORY).doc(item.id);
            const { id, ...data } = item;
            await ref.update({ ...data, userId });
            return item;
        }
    } catch (err) {
        console.error("Firestore Save Inventory Item Error:", err);
        throw err;
    }
  },

  deleteInventoryItem: async (id: string, userId?: string): Promise<void> => {
    if (id.startsWith('inv-') || userId === 'guest') {
        mockInventory = mockInventory.filter(i => i.id !== id);
        return Promise.resolve();
    }
    await db.collection(COLLECTIONS.INVENTORY).doc(id).delete();
  },

  // Inventory Movements
  getInventoryMovements: async (userId: string, itemId?: string): Promise<InventoryMovement[]> => {
    if (!userId) return [];
    if (userId === 'guest') {
      let result = [...mockMovements];
      if (itemId) result = result.filter(m => m.itemId === itemId);
      return Promise.resolve(result.sort((a,b) => b.createdAt - a.createdAt));
    }
    try {
      let query = db.collection(COLLECTIONS.INVENTORY_MOVEMENTS).where("userId", "==", userId);
      if (itemId) query = query.where("itemId", "==", itemId);
      const querySnapshot = await query.get();
      return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id } as InventoryMovement;
      }).sort((a,b) => b.createdAt - a.createdAt);
    } catch (e) { console.error(e); return []; }
  },

  saveInventoryMovement: async (movement: InventoryMovement, userId: string): Promise<InventoryMovement> => {
    if (userId === 'guest') {
        if (!movement.id) {
            const newM = { ...movement, id: `mov-${Date.now()}` };
            mockMovements.push(newM);
            return Promise.resolve(newM);
        } else {
            mockMovements = mockMovements.map(m => m.id === movement.id ? movement : m);
            return Promise.resolve(movement);
        }
    }
    try {
        if (!movement.id) {
            const { id, ...data } = movement;
            console.log("Adding inventory movement:", { data, userId });
            const docRef = await db.collection(COLLECTIONS.INVENTORY_MOVEMENTS).add({ ...data, userId });
            return { ...movement, id: docRef.id };
        } else {
            console.log("Updating inventory movement:", { id: movement.id, userId });
            const ref = db.collection(COLLECTIONS.INVENTORY_MOVEMENTS).doc(movement.id);
            const { id, ...data } = movement;
            await ref.update({ ...data, userId });
            return movement;
        }
    } catch (err) {
        console.error("Firestore Save Movement Error:", err);
        throw err;
    }
  },

  deleteInventoryMovement: async (id: string, userId?: string): Promise<void> => {
    if (id.startsWith('mov-') || userId === 'guest') {
        mockMovements = mockMovements.filter(m => m.id !== id);
        return Promise.resolve();
    }
    await db.collection(COLLECTIONS.INVENTORY_MOVEMENTS).doc(id).delete();
  }
};