import { useSyncExternalStore } from "react";
import type { Appointment, Barber, Service, ShopInfo, Status, SupabaseConfig } from "../types";
import { DEFAULT_TENANT_ID } from "../services/saasService";
import {
  saveServiceToCloud,
  deleteServiceFromCloud,
  fetchServicesFromCloud,
  saveAppointmentToCloud,
  updateAppointmentStatusInCloud,
  deleteAppointmentFromCloud,
  fetchAppointmentsFromCloud,
  supabase,
} from "./supabaseClient";

export const SHOP: ShopInfo = {
  name: "Junin Barbeiro",
  tagline: "Barbearia clássica, corte moderno & estilo único",
  whatsapp: "5584994571579",
  phoneDisplay: "(84) 99457-1579",
  address: "Rua Principal, Centro",
  founded: 2021,
  hours: "Segunda a Sábado · 08h–12h e 14h–19h",
  lunchBreak: "12h às 14h (Almoço)",
  tenantId: DEFAULT_TENANT_ID,
};

export const INITIAL_SERVICES: Service[] = [
  {
    id: "svc-1",
    name: "Nevou + corte",
    price: 75,
    duration: 90,
    category: "Química & Corte",
    description: "Descoloração global nevou impecável com corte degradê navalhado e finalização.",
    active: true,
    sortOrder: 1,
    tenantId: DEFAULT_TENANT_ID,
  },
  {
    id: "svc-2",
    name: "Reflexo alinhado + corte",
    price: 75,
    duration: 90,
    category: "Química & Corte",
    description: "Mechas e reflexo alinhado de alta precisão com corte estilizado e escovação.",
    active: true,
    sortOrder: 2,
    tenantId: DEFAULT_TENANT_ID,
  },
  {
    id: "svc-3",
    name: "Corte navalhado",
    price: 20,
    duration: 30,
    category: "Cortes",
    description: "Degradê navalhado limpo na tesoura e máquina com acabamento e navalha afiada.",
    active: true,
    sortOrder: 3,
    tenantId: DEFAULT_TENANT_ID,
  },
  {
    id: "svc-4",
    name: "Corte pigmentado",
    price: 35,
    duration: 45,
    category: "Cortes",
    description: "Corte completo com técnica de pigmentação nos contornos e disfarce marcante.",
    active: true,
    sortOrder: 4,
    tenantId: DEFAULT_TENANT_ID,
  },
  {
    id: "svc-5",
    name: "Barba",
    price: 10,
    duration: 20,
    category: "Barba",
    description: "Alinhamento com toalha morna, navalha descartável, pós-barba e óleo hidratante.",
    active: true,
    sortOrder: 5,
    tenantId: DEFAULT_TENANT_ID,
  },
];

export const INITIAL_BARBERS: Barber[] = [
  {
    id: "barber-1",
    name: "Juninho",
    specialty: "Cortes modernos, nevou e barba",
    commission: 100,
    active: true,
    tenantId: DEFAULT_TENANT_ID,
  },
];

export const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getRelativeDateISO = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  // Turno da Manhã: 08:00, 09:00, 10:00, 11:00 (intervalos de 1 hora)
  for (let h = 8; h < 12; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  // Turno da Tarde e Noite: 14:00, 15:00, 16:00, 17:00, 18:00 (intervalos de 1 hora)
  for (let h = 14; h <= 18; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
})();

export function isOpenDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  // 0 = Domingo (fechado)
  return day !== 0;
}

export function isWithinOpeningHours(dateStr: string, timeStr: string, durationMin: number = 30): boolean {
  if (!isOpenDate(dateStr)) return false;
  if (!timeStr) return false;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return false;
  const start = h * 60 + m;

  // Turno da Manhã: 08:00 (480) até 11:00 (660)
  const isMorning = start >= 480 && start <= 660;
  // Turno da Tarde & Noite: 14:00 (840) até 18:00 (1080)
  const isAfternoon = start >= 840 && start <= 1080;

  return isMorning || isAfternoon;
}

/**
 * Funções auxiliares para apuração de períodos
 */
export function isDateToday(dateStr: string): boolean {
  return dateStr === todayISO();
}

export function isDateThisWeek(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentDay = now.getDay();
  const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return target >= monday && target <= sunday;
}

export function isDateThisMonth(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m] = dateStr.split("-").map(Number);
  const now = new Date();
  return y === now.getFullYear() && m === now.getMonth() + 1;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

type AppState = {
  services: Service[];
  barbers: Barber[];
  appointments: Appointment[];
  adminAuth: {
    isAuthenticated: boolean;
    adminEmail: string;
    token?: string;
  };
  adminCredentials: {
    email: string;
    password: string; // padrão "admin123"
    pin: string; // padrão "1234"
  };
  supabaseConfig: SupabaseConfig;
};

const STORAGE_KEYS = {
  SERVICES: "junin_services_v2",
  BARBERS: "junin_barbers_v2",
  APPOINTMENTS: "junin_appointments_v3",
  AUTH: "junin_admin_auth_v2",
  CREDENTIALS: "junin_admin_creds_v2",
  SUPABASE_CONFIG: "junin_supabase_config_v2",
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveStored<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
  }
}

// Conjunto inicial de agendamentos realistas cobrindo hoje, esta semana e este mês
function getInitialAppointments(): Appointment[] {
  const t = todayISO();
  const d1 = getRelativeDateISO(-1); // ontem
  const d2 = getRelativeDateISO(-2); // 2 dias atrás
  const d3 = getRelativeDateISO(-3); // 3 dias atrás
  const d5 = getRelativeDateISO(-5); // 5 dias atrás
  const d8 = getRelativeDateISO(-8); // semana passada

  return [
    // --- HOJE ---
    {
      id: "seed-1",
      serviceId: "svc-3", // Corte navalhado
      barberId: "barber-1",
      date: t,
      time: "09:00",
      clientName: "Marcos Vinícius",
      clientPhone: "84998765432",
      status: "concluido",
      createdAt: t,
      notes: "Degradê navalhado na zero alta",
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-2",
      serviceId: "svc-1", // Nevou + corte
      barberId: "barber-1",
      date: t,
      time: "10:00",
      clientName: "Gabriel Ferreira",
      clientPhone: "84991234567",
      status: "agendado",
      createdAt: t,
      notes: "Nevou pela primeira vez",
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-3",
      serviceId: "svc-5", // Barba
      barberId: "barber-1",
      date: t,
      time: "11:30",
      clientName: "Rodrigo Costa",
      clientPhone: "84988776655",
      status: "agendado",
      createdAt: t,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-4",
      serviceId: "svc-2", // Reflexo alinhado + corte
      barberId: "barber-1",
      date: t,
      time: "14:00",
      clientName: "Lucas Lima",
      clientPhone: "84987654321",
      status: "concluido",
      createdAt: t,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-5",
      serviceId: "svc-4", // Corte pigmentado
      barberId: "barber-1",
      date: t,
      time: "16:00",
      clientName: "Matheus Oliveira",
      clientPhone: "84992345678",
      status: "agendado",
      createdAt: t,
      tenantId: DEFAULT_TENANT_ID,
    },

    // --- ESTA SEMANA (ONTEM E ANTERIORES) ---
    {
      id: "seed-w1",
      serviceId: "svc-1", // Nevou + corte
      barberId: "barber-1",
      date: d1,
      time: "10:30",
      clientName: "Alison Dantas",
      clientPhone: "84988112233",
      status: "concluido",
      createdAt: d1,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-w2",
      serviceId: "svc-3", // Corte navalhado
      barberId: "barber-1",
      date: d1,
      time: "15:00",
      clientName: "Felipe Bezerra",
      clientPhone: "84999223344",
      status: "concluido",
      createdAt: d1,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-w3",
      serviceId: "svc-5", // Barba
      barberId: "barber-1",
      date: d1,
      time: "16:30",
      clientName: "Cláudio Medeiros",
      clientPhone: "84991445566",
      status: "concluido",
      createdAt: d1,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-w4",
      serviceId: "svc-3", // Corte navalhado
      barberId: "barber-1",
      date: d2,
      time: "09:30",
      clientName: "Bruno Henrique",
      clientPhone: "84987556677",
      status: "concluido",
      createdAt: d2,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-w5",
      serviceId: "svc-4", // Corte pigmentado
      barberId: "barber-1",
      date: d2,
      time: "14:30",
      clientName: "Rafael Antunes",
      clientPhone: "84981667788",
      status: "concluido",
      createdAt: d2,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-w6",
      serviceId: "svc-1", // Nevou + corte
      barberId: "barber-1",
      date: d3,
      time: "11:00",
      clientName: "Diego Souza",
      clientPhone: "84994778899",
      status: "concluido",
      createdAt: d3,
      tenantId: DEFAULT_TENANT_ID,
    },

    // --- ESTE MÊS (ANTERIORES) ---
    {
      id: "seed-m1",
      serviceId: "svc-3", // Corte navalhado
      barberId: "barber-1",
      date: d5,
      time: "15:30",
      clientName: "Thiago Ramos",
      clientPhone: "84993889900",
      status: "concluido",
      createdAt: d5,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-m2",
      serviceId: "svc-2", // Reflexo alinhado + corte
      barberId: "barber-1",
      date: d5,
      time: "10:00",
      clientName: "Erick Santos",
      clientPhone: "84982990011",
      status: "concluido",
      createdAt: d5,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-m3",
      serviceId: "svc-1", // Nevou + corte
      barberId: "barber-1",
      date: d8,
      time: "14:00",
      clientName: "Caio Mendes",
      clientPhone: "84987001122",
      status: "concluido",
      createdAt: d8,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-m4",
      serviceId: "svc-3", // Corte navalhado
      barberId: "barber-1",
      date: d8,
      time: "16:00",
      clientName: "Samuel Alves",
      clientPhone: "84991112233",
      status: "concluido",
      createdAt: d8,
      tenantId: DEFAULT_TENANT_ID,
    },
  ];
}

let state: AppState = {
  services: getStored<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES),
  barbers: getStored<Barber[]>(STORAGE_KEYS.BARBERS, INITIAL_BARBERS),
  appointments: getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, getInitialAppointments()),
  adminAuth: getStored(STORAGE_KEYS.AUTH, {
    isAuthenticated: false,
    adminEmail: "admin@juninbarbeiro.com",
  }),
  adminCredentials: getStored(STORAGE_KEYS.CREDENTIALS, {
    email: "admin@juninbarbeiro.com",
    password: "admin123",
    pin: "1234",
  }),
  supabaseConfig: getStored(STORAGE_KEYS.SUPABASE_CONFIG, {
    enabled: false,
    supabaseUrl: "",
    supabaseAnonKey: "",
    tenantId: DEFAULT_TENANT_ID,
    status: "disconnected",
  }),
};

// Garantir que todos os 5 serviços existam caso localStorage tenha array vazio
if (!state.services || state.services.length === 0) {
  state.services = INITIAL_SERVICES;
  saveStored(STORAGE_KEYS.SERVICES, state.services);
}

const listeners = new Set<() => void>();

function update(fn: (s: AppState) => AppState) {
  state = fn(state);
  listeners.forEach((l) => l());
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(state),
  );
}

export const actions = {
  // Service Actions
  saveService(serviceData: Omit<Service, "id"> & { id?: string }): Service {
    const isEdit = !!serviceData.id;
    let saved: Service;

    if (isEdit) {
      saved = {
        ...serviceData,
        id: serviceData.id!,
        active: serviceData.active ?? true,
        tenantId: serviceData.tenantId || DEFAULT_TENANT_ID,
      } as Service;
      update((s) => {
        const next = s.services.map((svc) => (svc.id === serviceData.id ? saved : svc));
        saveStored(STORAGE_KEYS.SERVICES, next);
        return { ...s, services: next };
      });
      void saveServiceToCloud(saved);
    } else {
      saved = {
        ...serviceData,
        id: `svc-${uid()}`,
        active: serviceData.active ?? true,
        sortOrder: state.services.length + 1,
        tenantId: DEFAULT_TENANT_ID,
      };
      update((s) => {
        const next = [...s.services, saved];
        saveStored(STORAGE_KEYS.SERVICES, next);
        return { ...s, services: next };
      });
      void saveServiceToCloud(saved).then((cloudId) => {
        if (cloudId && cloudId !== saved.id) {
          update((s) => {
            const updatedList = s.services.map((svc) =>
              svc.id === saved.id ? { ...svc, id: cloudId } : svc
            );
            saveStored(STORAGE_KEYS.SERVICES, updatedList);
            return { ...s, services: updatedList };
          });
        }
      });
    }
    return saved;
  },

  deleteService(serviceId: string) {
    update((s) => {
      const next = s.services.filter((svc) => svc.id !== serviceId);
      saveStored(STORAGE_KEYS.SERVICES, next);
      return { ...s, services: next };
    });
    void deleteServiceFromCloud(serviceId);
  },

  reorderServices(serviceIds: string[]) {
    update((s) => {
      const map = new Map<string, Service>(s.services.map((svc) => [svc.id, svc]));
      const next: Service[] = [];
      serviceIds.forEach((id, index) => {
        const found = map.get(id);
        if (found) {
          next.push({ ...found, sortOrder: index + 1 });
        }
      });
      saveStored(STORAGE_KEYS.SERVICES, next);
      return { ...s, services: next };
    });
  },

  resetDefaultServices() {
    update((s) => {
      saveStored(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
      return { ...s, services: INITIAL_SERVICES };
    });
    INITIAL_SERVICES.forEach((svc) => void saveServiceToCloud(svc));
  },

  // Barber Actions
  saveBarber(barberData: Omit<Barber, "id"> & { id?: string }): Barber {
    let saved: Barber;
    if (barberData.id) {
      saved = { ...barberData, tenantId: DEFAULT_TENANT_ID } as Barber;
      update((s) => {
        const next = s.barbers.map((b) => (b.id === barberData.id ? saved : b));
        saveStored(STORAGE_KEYS.BARBERS, next);
        return { ...s, barbers: next };
      });
    } else {
      saved = {
        ...barberData,
        id: `barber-${uid()}`,
        tenantId: DEFAULT_TENANT_ID,
      };
      update((s) => {
        const next = [...s.barbers, saved];
        saveStored(STORAGE_KEYS.BARBERS, next);
        return { ...s, barbers: next };
      });
    }
    return saved;
  },

  deleteBarber(barberId: string) {
    update((s) => {
      const next = s.barbers.filter((b) => b.id !== barberId);
      saveStored(STORAGE_KEYS.BARBERS, next);
      return { ...s, barbers: next };
    });
  },

  // Appointment Actions
  addAppointment(data: Omit<Appointment, "id" | "status" | "createdAt">): Appointment {
    const service = state.services.find((s) => s.id === data.serviceId);
    if (!service) {
      throw new Error("Serviço não encontrado.");
    }
    if (!isOpenDate(data.date)) {
      throw new Error("A barbearia não abre aos domingos.");
    }
    if (!isWithinOpeningHours(data.date, data.time, service.duration)) {
      throw new Error("Horário fora do funcionamento (08h às 12h e 14h às 18h).");
    }

    // Check collision
    const collision = state.appointments.some(
      (a) =>
        a.barberId === data.barberId &&
        a.date === data.date &&
        a.time === data.time &&
        a.status !== "cancelado",
    );
    if (collision) {
      throw new Error("Este horário já está reservado com este barbeiro.");
    }

    const appt: Appointment = {
      ...data,
      id: `appt-${uid()}`,
      status: "agendado",
      createdAt: todayISO(),
      tenantId: DEFAULT_TENANT_ID,
    };

    update((s) => {
      const next = [appt, ...s.appointments];
      saveStored(STORAGE_KEYS.APPOINTMENTS, next);
      return { ...s, appointments: next };
    });

    // Save directly to cloud Supabase table
    void saveAppointmentToCloud(appt);

    return appt;
  },

  setAppointmentStatus(id: string, status: Status) {
    update((s) => {
      const next = s.appointments.map((a) => (a.id === id ? { ...a, status } : a));
      saveStored(STORAGE_KEYS.APPOINTMENTS, next);
      return { ...s, appointments: next };
    });

    // Update directly in cloud Supabase table
    void updateAppointmentStatusInCloud(id, status);
  },

  deleteAppointment(id: string) {
    update((s) => {
      const next = s.appointments.filter((a) => a.id !== id);
      saveStored(STORAGE_KEYS.APPOINTMENTS, next);
      return { ...s, appointments: next };
    });

    void deleteAppointmentFromCloud(id);
  },

  // Admin Authentication Actions
  loginAdmin(emailOrPin: string, password?: string): boolean {
    const creds = state.adminCredentials;
    const isPinMatch = emailOrPin === creds.pin;
    const isEmailPassMatch =
      emailOrPin.trim().toLowerCase() === creds.email.toLowerCase() &&
      password === creds.password;

    if (isPinMatch || isEmailPassMatch) {
      const auth = {
        isAuthenticated: true,
        adminEmail: creds.email,
        token: `session-${uid()}-${Date.now()}`,
      };
      update((s) => {
        saveStored(STORAGE_KEYS.AUTH, auth);
        return { ...s, adminAuth: auth };
      });
      return true;
    }
    return false;
  },

  logoutAdmin() {
    const auth = {
      isAuthenticated: false,
      adminEmail: state.adminCredentials.email,
    };
    update((s) => {
      saveStored(STORAGE_KEYS.AUTH, auth);
      return { ...s, adminAuth: auth };
    });
  },

  updateAdminCredentials(newEmail: string, newPass: string, newPin?: string) {
    const updated = {
      email: newEmail.trim() || state.adminCredentials.email,
      password: newPass.trim() || state.adminCredentials.password,
      pin: newPin?.trim() || state.adminCredentials.pin,
    };
    update((s) => {
      saveStored(STORAGE_KEYS.CREDENTIALS, updated);
      return { ...s, adminCredentials: updated };
    });
  },

  updateSupabaseConfig(config: Partial<SupabaseConfig>) {
    update((s) => {
      const next: SupabaseConfig = {
        ...s.supabaseConfig,
        ...config,
      };
      saveStored(STORAGE_KEYS.SUPABASE_CONFIG, next);
      return { ...s, supabaseConfig: next };
    });
  },
};

/**
 * Sincroniza dados com o Supabase em Nuvem e escuta alterações em Realtime
 */
export async function initCloudSync() {
  try {
    // 1. Tentar carregar serviços do Supabase
    const cloudServices = await fetchServicesFromCloud();
    if (cloudServices && cloudServices.length > 0) {
      update((s) => {
        saveStored(STORAGE_KEYS.SERVICES, cloudServices);
        return { ...s, services: cloudServices };
      });
    }

    // 2. Tentar carregar agendamentos do Supabase
    const cloudAppts = await fetchAppointmentsFromCloud();
    if (cloudAppts && cloudAppts.length > 0) {
      update((s) => {
        saveStored(STORAGE_KEYS.APPOINTMENTS, cloudAppts);
        return { ...s, appointments: cloudAppts };
      });
    }

    // 3. Ouvir atualizações em Realtime do Postgres
    const channel = supabase
      .channel("junin-cloud-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        async () => {
          const fresh = await fetchServicesFromCloud();
          if (fresh && fresh.length > 0) {
            update((s) => ({ ...s, services: fresh }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        async () => {
          const fresh = await fetchAppointmentsFromCloud();
          if (fresh && fresh.length > 0) {
            update((s) => ({ ...s, appointments: fresh }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn("Aviso ao iniciar sincronização com Supabase:", err);
  }
}

// Utilities
export const brl = (val: number): string => {
  return (val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const formatTimeMinutes = (min: number): string => {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${min} min`;
};

export const formatDateBR = (isoDate: string): string => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
};

export function takenSlots(appointments: Appointment[], barberId: string, date: string): Set<string> {
  const filtered = appointments.filter(
    (a) => a.barberId === barberId && a.date === date && a.status !== "cancelado",
  );
  return new Set(filtered.map((a) => a.time));
}

export function buildWhatsappLink(phoneDigits: string, message: string): string {
  const clean = phoneDigits.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

/**
 * Gera link do Google Calendar com data, horário e detalhes do corte
 */
export function buildGoogleCalendarLink(
  appointment: Appointment,
  service?: Service,
  barber?: Barber
): string {
  if (!appointment.date || !appointment.time) return "";

  const [y, m, d] = appointment.date.split("-");
  const [hh, mm] = appointment.time.split(":");

  const startStr = `${y}${m}${d}T${hh}${mm}00`;

  const durationMin = service?.duration || 30;
  const startDt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
  const endDt = new Date(startDt.getTime() + durationMin * 60000);

  const ey = endDt.getFullYear();
  const em = String(endDt.getMonth() + 1).padStart(2, "0");
  const ed = String(endDt.getDate()).padStart(2, "0");
  const eh = String(endDt.getHours()).padStart(2, "0");
  const emin = String(endDt.getMinutes()).padStart(2, "0");
  const endStr = `${ey}${em}${ed}T${eh}${emin}00`;

  const title = `💈 Junin Barbeiro — ${service?.name || "Corte e Barba"}`;
  const details = `Agendamento confirmado no ${SHOP.name}!\n\n✂️ Serviço: ${service?.name || "Atendimento"}\n💰 Valor: ${brl(service?.price || 0)}\n⏱️ Duração estimada: ${formatTimeMinutes(durationMin)}\n💈 Profissional: ${barber?.name || "Juninho"}\n📍 Local: ${SHOP.address || "Barbearia Junin Barbeiro"}\n📞 WhatsApp: ${SHOP.phoneDisplay}`;
  const location = `${SHOP.name}, ${SHOP.address || "Centro"}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${startStr}/${endStr}&details=${encodeURIComponent(
    details
  )}&location=${encodeURIComponent(location)}`;
}

/**
 * Tipos e cálculo de métricas financeiras e ranking de serviços
 */
export type ServicePerformance = {
  serviceId: string;
  name: string;
  category?: string;
  price: number;
  count: number;
  totalRevenue: number;
  percentage: number;
};

export type FinancialSummary = {
  todayRevenue: number;
  todayCount: number;
  weekRevenue: number;
  weekCount: number;
  monthRevenue: number;
  monthCount: number;
  allTimeRevenue: number;
  allTimeCount: number;
  avgTicketMonth: number;
  servicesRanking: ServicePerformance[];
};

export function calculateFinancialSummary(
  appointments: Appointment[],
  services: Service[],
  period: "all" | "month" | "week" | "today" = "all"
): FinancialSummary {
  const getService = (id: string) => services.find((s) => s.id === id);

  const completed = appointments.filter((a) => a.status === "concluido");

  // Totais por período
  const todayCompleted = completed.filter((a) => isDateToday(a.date));
  const weekCompleted = completed.filter((a) => isDateThisWeek(a.date));
  const monthCompleted = completed.filter((a) => isDateThisMonth(a.date));

  const calcSum = (list: Appointment[]) =>
    list.reduce((sum, a) => sum + (getService(a.serviceId)?.price || 0), 0);

  const todayRevenue = calcSum(todayCompleted);
  const weekRevenue = calcSum(weekCompleted);
  const monthRevenue = calcSum(monthCompleted);
  const allTimeRevenue = calcSum(completed);

  const avgTicketMonth =
    monthCompleted.length > 0 ? monthRevenue / monthCompleted.length : 0;

  // Seleciona a lista de acordo com o filtro do ranking
  let targetList = completed;
  if (period === "today") targetList = todayCompleted;
  else if (period === "week") targetList = weekCompleted;
  else if (period === "month") targetList = monthCompleted;

  const totalTargetCount = targetList.length;

  // Agrupamento por serviço
  const countMap = new Map<string, { count: number; revenue: number }>();
  targetList.forEach((a) => {
    const svc = getService(a.serviceId);
    const prev = countMap.get(a.serviceId) || { count: 0, revenue: 0 };
    countMap.set(a.serviceId, {
      count: prev.count + 1,
      revenue: prev.revenue + (svc?.price || 0),
    });
  });

  // Mapeia para todos os serviços cadastrados (inclusive os que tiverem 0)
  const ranking: ServicePerformance[] = services.map((svc) => {
    const stats = countMap.get(svc.id) || { count: 0, revenue: 0 };
    const percentage =
      totalTargetCount > 0 ? Math.round((stats.count / totalTargetCount) * 100) : 0;

    return {
      serviceId: svc.id,
      name: svc.name,
      category: svc.category,
      price: svc.price,
      count: stats.count,
      totalRevenue: stats.revenue,
      percentage,
    };
  });

  // Ordena por quantidade realizada decrescente, e em caso de empate por faturamento
  ranking.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.totalRevenue - a.totalRevenue;
  });

  return {
    todayRevenue,
    todayCount: todayCompleted.length,
    weekRevenue,
    weekCount: weekCompleted.length,
    monthRevenue,
    monthCount: monthCompleted.length,
    allTimeRevenue,
    allTimeCount: completed.length,
    avgTicketMonth,
    servicesRanking: ranking,
  };
}
