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
  normalizeDate,
  normalizeTime,
} from "./supabaseClient";

export { normalizeDate, normalizeTime };

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
  d.setHours(12, 0, 0, 0); // Meio-dia evita desvios por fuso horário ou horário de verão
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getRelativeDateISO = (offsetDays: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // Meio-dia evita desvios por fuso horário
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
  const normalized = normalizeDate(dateStr);
  const [y, m, d] = normalized.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return true;
  const day = new Date(y, m - 1, d, 12, 0, 0).getDay();
  // 0 = Domingo (fechado)
  return day !== 0;
}

export function isWithinOpeningHours(dateStr: string, timeStr: string, durationMin: number = 30): boolean {
  if (!isOpenDate(dateStr)) return false;
  if (!timeStr) return false;
  const normTime = normalizeTime(timeStr);
  const [h, m] = normTime.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return false;
  const start = h * 60 + m;

  // Turno da Manhã: 08:00 (480) até 11:00 (660)
  const isMorning = start >= 480 && start <= 660;
  // Turno da Tarde & Noite: 14:00 (840) até 18:00 (1080)
  const isAfternoon = start >= 840 && start <= 1080;

  return isMorning || isAfternoon;
}

/**
 * Verifica se um horário específico já passou (no mesmo dia ou datas passadas).
 */
export function isSlotInPast(dateStr: string, timeStr: string, now: Date = new Date()): boolean {
  if (!dateStr || !timeStr) return false;
  const today = todayISO();
  if (dateStr < today) return true;
  if (dateStr > today) return false;

  const [slotH, slotM] = timeStr.split(":").map(Number);
  if (isNaN(slotH) || isNaN(slotM)) return false;

  const currentH = now.getHours();
  const currentM = now.getMinutes();

  return currentH > slotH || (currentH === slotH && currentM >= slotM);
}

/**
 * Verifica se o expediente do dia encerrou para novos agendamentos (ex: após as 18:00 ou domingo).
 */
export function isDayExpeditedPassed(dateStr: string, now: Date = new Date()): boolean {
  if (!dateStr) return false;
  const today = todayISO();
  if (dateStr < today) return true;
  if (dateStr > today) return false;

  if (!isOpenDate(dateStr)) return true;

  // O último horário de atendimento do expediente inicia às 18:00 (fecha às 19:00).
  // Se já for 18:00 ou mais tarde, o expediente do dia encerrou para agendamento.
  return isSlotInPast(dateStr, "18:00", now);
}

/**
 * Retorna a próxima data disponível para agendamento:
 * Se hoje ainda tiver horário disponível e não for domingo, retorna hoje;
 * caso contrário, avança para o próximo dia útil.
 */
export function getNextAvailableBookingDate(now: Date = new Date()): string {
  for (let offset = 0; offset <= 30; offset++) {
    const candidate = getRelativeDateISO(offset);
    if (!isOpenDate(candidate)) continue;
    if (offset === 0 && isDayExpeditedPassed(candidate, now)) continue;
    return candidate;
  }
  return todayISO();
}


/**
 * Funções auxiliares para apuração de períodos com segurança de fuso horário
 */
export function isDateToday(dateStr: string): boolean {
  if (!dateStr) return false;
  return normalizeDate(dateStr) === todayISO();
}

export function isDateThisWeek(dateStr: string): boolean {
  if (!dateStr) return false;
  const normalized = normalizeDate(dateStr);
  const [y, m, d] = normalized.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  const target = new Date(y, m - 1, d, 12, 0, 0);

  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const currentDay = now.getDay();
  const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return target >= monday && target <= sunday;
}

export function isDateThisMonth(dateStr: string): boolean {
  if (!dateStr) return false;
  const normalized = normalizeDate(dateStr);
  const [y, m] = normalized.split("-").map(Number);
  if (isNaN(y) || isNaN(m)) return false;
  const now = new Date();
  return y === now.getFullYear() && m === now.getMonth() + 1;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const AUTH_SESSION_VERSION = "20261101_v3_security_lockout_8922";

type AppState = {
  services: Service[];
  barbers: Barber[];
  appointments: Appointment[];
  adminAuth: {
    isAuthenticated: boolean;
    adminEmail: string;
    sessionVersion?: string;
    token?: string;
  };
  adminCredentials: {
    email: string;
    password: string; // padrão "8922"
    pin: string; // padrão "8922"
  };
  supabaseConfig: SupabaseConfig;
};

const STORAGE_KEYS = {
  SERVICES: "junin_services_v2",
  BARBERS: "junin_barbers_v2",
  APPOINTMENTS: "junin_appointments_v3",
  AUTH: "junin_admin_auth_v3",
  CREDENTIALS: "junin_admin_creds_v3",
  SUPABASE_CONFIG: "junin_supabase_config_v2",
};

// Limpeza e invalidação forçada de quaisquer sessões ou credenciais antigas
try {
  localStorage.removeItem("junin_admin_auth_v2");
  localStorage.removeItem("junin_admin_auth");
  localStorage.removeItem("junin_admin_creds_v2");
  localStorage.removeItem("junin_admin_creds");
  sessionStorage.removeItem("junin_admin_auth");
  sessionStorage.removeItem("junin_admin_auth_v2");
} catch {
  // Ignora se o localStorage estiver restrito
}

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

// Conjunto inicial de agendamentos realistas cobrindo hoje, amanhã, dia 24, próximos dias, esta semana e este mês
function getInitialAppointments(): Appointment[] {
  const t = todayISO();
  const dTomorrow = getRelativeDateISO(1); // amanhã
  const d24 = getRelativeDateISO(2); // +2 dias (ex: dia 24)
  const dPlus3 = getRelativeDateISO(3); // +3 dias
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

    // --- AMANHÃ ---
    {
      id: "seed-tom-1",
      serviceId: "svc-3", // Corte navalhado
      barberId: "barber-1",
      date: dTomorrow,
      time: "10:00",
      clientName: "Renan Cavalcanti",
      clientPhone: "84994112233",
      status: "agendado",
      createdAt: t,
      notes: "Horário reservado para amanhã",
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-tom-2",
      serviceId: "svc-1", // Nevou + corte
      barberId: "barber-1",
      date: dTomorrow,
      time: "15:00",
      clientName: "Igor Santana",
      clientPhone: "84988223344",
      status: "agendado",
      createdAt: t,
      notes: "Nevou + acabamento navalhado",
      tenantId: DEFAULT_TENANT_ID,
    },

    // --- DIA 24 / FUTUROS (+2 DIAS) ---
    {
      id: "seed-d24-1",
      serviceId: "svc-2", // Reflexo alinhado + corte
      barberId: "barber-1",
      date: d24,
      time: "09:00",
      clientName: "Danilo Albuquerque",
      clientPhone: "84991334455",
      status: "agendado",
      createdAt: t,
      notes: "Agendamento confirmado para o dia 24",
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-d24-2",
      serviceId: "svc-4", // Corte pigmentado
      barberId: "barber-1",
      date: d24,
      time: "14:00",
      clientName: "Leandro Vasconcelos",
      clientPhone: "84987445566",
      status: "agendado",
      createdAt: t,
      tenantId: DEFAULT_TENANT_ID,
    },
    {
      id: "seed-d24-3",
      serviceId: "svc-5", // Barba
      barberId: "barber-1",
      date: d24,
      time: "16:00",
      clientName: "Vinícius Paiva",
      clientPhone: "84996556677",
      status: "agendado",
      createdAt: t,
      notes: "Alinhamento com toalha morna",
      tenantId: DEFAULT_TENANT_ID,
    },

    // --- +3 DIAS ---
    {
      id: "seed-dplus3-1",
      serviceId: "svc-3", // Corte navalhado
      barberId: "barber-1",
      date: dPlus3,
      time: "11:00",
      clientName: "Guilherme Sampaio",
      clientPhone: "84997788990",
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

const DEFAULT_ADMIN_CREDS = {
  email: "admin@juninbarbeiro.com",
  password: "8922",
  pin: "8922",
};

// Obter credenciais e garantir atualização para 8922 se estiver na credencial antiga
let loadedCreds = getStored(STORAGE_KEYS.CREDENTIALS, DEFAULT_ADMIN_CREDS);
if (
  !loadedCreds ||
  loadedCreds.password === "admin123" ||
  loadedCreds.pin === "1234" ||
  !loadedCreds.pin ||
  !loadedCreds.password
) {
  loadedCreds = {
    email: loadedCreds?.email || "admin@juninbarbeiro.com",
    password: "8922",
    pin: "8922",
  };
  saveStored(STORAGE_KEYS.CREDENTIALS, loadedCreds);
}

// Invalidação mandatória de sessões ativas existentes (Logout Global)
const storedAuth = getStored<{
  isAuthenticated: boolean;
  adminEmail: string;
  sessionVersion?: string;
  token?: string;
}>(STORAGE_KEYS.AUTH, {
  isAuthenticated: false,
  adminEmail: "admin@juninbarbeiro.com",
  sessionVersion: AUTH_SESSION_VERSION,
});

const initialAuth =
  storedAuth && storedAuth.sessionVersion === AUTH_SESSION_VERSION && storedAuth.isAuthenticated
    ? storedAuth
    : {
        isAuthenticated: false,
        adminEmail: "admin@juninbarbeiro.com",
        sessionVersion: AUTH_SESSION_VERSION,
      };

// Se a sessão armazenada for inválida ou antiga, sobrescreve forçando o logout
if (storedAuth?.sessionVersion !== AUTH_SESSION_VERSION) {
  saveStored(STORAGE_KEYS.AUTH, initialAuth);
}

let state: AppState = {
  services: getStored<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES),
  barbers: getStored<Barber[]>(STORAGE_KEYS.BARBERS, INITIAL_BARBERS),
  appointments: getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, getInitialAppointments()),
  adminAuth: initialAuth,
  adminCredentials: loadedCreds,
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
    const normDate = normalizeDate(data.date);
    const normTime = normalizeTime(data.time);

    if (!normDate || !normTime) {
      throw new Error("Selecione uma data e horário válidos.");
    }
    if (!isOpenDate(normDate)) {
      throw new Error("A barbearia não abre aos domingos. Selecione outro dia.");
    }
    if (normDate < todayISO()) {
      throw new Error("Não é possível realizar agendamentos para datas passadas.");
    }
    if (isDayExpeditedPassed(normDate)) {
      throw new Error("O expediente de hoje já foi encerrado (atendimentos até às 19h). Por favor, selecione outro dia.");
    }
    if (isSlotInPast(normDate, normTime)) {
      throw new Error("Este horário já encerrou para hoje. Por favor, selecione um horário futuro.");
    }
    if (!isWithinOpeningHours(normDate, normTime, service.duration)) {
      throw new Error("Horário fora do funcionamento da barbearia (08h às 12h e 14h às 19h).");
    }

    const phoneVal = validateBrazilianPhone(data.clientPhone);
    if (!phoneVal.isValid) {
      throw new Error(phoneVal.errorMessage || "Por favor, insira um número de WhatsApp/Telefone válido com DDD.");
    }

    // Check collision
    const collision = state.appointments.some(
      (a) =>
        a.barberId === data.barberId &&
        normalizeDate(a.date) === normDate &&
        normalizeTime(a.time) === normTime &&
        a.status !== "cancelado",
    );
    if (collision) {
      throw new Error("Este horário já está reservado com este barbeiro.");
    }

    const appt: Appointment = {
      ...data,
      clientPhone: formatBrazilianPhone(data.clientPhone) || data.clientPhone.trim(),
      date: normDate,
      time: normTime,
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

  async refreshAppointments(): Promise<Appointment[]> {
    const cloudAppts = await fetchAppointmentsFromCloud();
    if (cloudAppts) {
      update((s) => {
        // Unifica agendamentos da nuvem com agendamentos locais sem perder nada
        const cloudIds = new Set(cloudAppts.map((a) => a.id));
        const merged = [
          ...cloudAppts,
          ...s.appointments.filter((a) => !cloudIds.has(a.id)),
        ].sort((a, b) => {
          const dComp = normalizeDate(a.date).localeCompare(normalizeDate(b.date));
          if (dComp !== 0) return dComp;
          return normalizeTime(a.time).localeCompare(normalizeTime(b.time));
        });
        saveStored(STORAGE_KEYS.APPOINTMENTS, merged);
        return { ...s, appointments: merged };
      });
      return cloudAppts;
    }
    return state.appointments;
  },

  // Admin Authentication Actions
  loginAdmin(emailOrPin: string, password?: string): boolean {
    const creds = state.adminCredentials;
    const cleanInput = (emailOrPin || "").trim();
    const isPinMatch = cleanInput === creds.pin;
    const isEmailPassMatch =
      cleanInput.toLowerCase() === creds.email.toLowerCase() &&
      password?.trim() === creds.password;

    if (isPinMatch || isEmailPassMatch) {
      const auth = {
        isAuthenticated: true,
        adminEmail: creds.email,
        sessionVersion: AUTH_SESSION_VERSION,
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
      sessionVersion: AUTH_SESSION_VERSION,
    };
    update((s) => {
      saveStored(STORAGE_KEYS.AUTH, auth);
      return { ...s, adminAuth: auth };
    });
  },

  forceGlobalLogout() {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      localStorage.removeItem("junin_admin_auth_v2");
      localStorage.removeItem("junin_admin_auth");
      sessionStorage.clear();
    } catch {
      // Ignora erro
    }
    const auth = {
      isAuthenticated: false,
      adminEmail: state.adminCredentials.email,
      sessionVersion: AUTH_SESSION_VERSION,
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

    // 2. Tentar carregar agendamentos do Supabase (traz todas as datas sem cortes)
    const cloudAppts = await fetchAppointmentsFromCloud();
    if (cloudAppts) {
      update((s) => {
        const cloudIds = new Set(cloudAppts.map((a) => a.id));
        const merged = [
          ...cloudAppts,
          ...s.appointments.filter((a) => !cloudIds.has(a.id)),
        ].sort((a, b) => {
          const dComp = normalizeDate(a.date).localeCompare(normalizeDate(b.date));
          if (dComp !== 0) return dComp;
          return normalizeTime(a.time).localeCompare(normalizeTime(b.time));
        });
        saveStored(STORAGE_KEYS.APPOINTMENTS, merged);
        return { ...s, appointments: merged };
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
          if (fresh) {
            update((s) => {
              saveStored(STORAGE_KEYS.APPOINTMENTS, fresh);
              return { ...s, appointments: fresh };
            });
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
  const normalized = normalizeDate(isoDate);
  const [y, m, d] = normalized.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return normalized;
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
};

export function takenSlots(appointments: Appointment[], barberId: string, date: string): Set<string> {
  const normDate = normalizeDate(date);
  const filtered = appointments.filter(
    (a) => a.barberId === barberId && normalizeDate(a.date) === normDate && a.status !== "cancelado",
  );
  return new Set(filtered.map((a) => normalizeTime(a.time)));
}

/**
 * Conjunto oficial de DDDs válidos no Brasil (Anatel)
 */
export const BRAZILIAN_VALID_DDDS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

/**
 * Aplica máscara progressiva padrão brasileira com DDD:
 * (00) 0000-0000 para fixo (10 dígitos) ou (00) 00000-0000 para celular (11 dígitos).
 * Bloqueia qualquer caractere que não seja dígito numérico.
 */
export function formatBrazilianPhone(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export interface PhoneValidationResult {
  isValid: boolean;
  cleanDigits: string;
  errorMessage?: string;
}

function isSequentialSequence(str: string): boolean {
  if (str.length < 5) return false;
  let isAsc = true;
  let isDesc = true;
  for (let i = 1; i < str.length; i++) {
    const prev = Number(str[i - 1]);
    const curr = Number(str[i]);
    if (isNaN(prev) || isNaN(curr)) return false;
    if (curr !== (prev + 1) % 10) isAsc = false;
    if (curr !== (prev + 9) % 10) isDesc = false;
  }
  return isAsc || isDesc;
}

/**
 * Validação rigorosa de número de telefone/WhatsApp brasileiro:
 * 1. Mínimo e máximo de dígitos (10 para fixo ou 11 para celular)
 * 2. Bloqueio de sequências curtas (ex: números de 1 a 8, textos aleatórios)
 * 3. DDD válido no Brasil (Anatel)
 * 4. Dígito 9 inicial obrigatório para celulares de 11 dígitos
 * 5. Bloqueio de sequências repetidas (ex: 99999999, 11111111111, 00000000)
 * 6. Bloqueio de sequências contínuas de teste (ex: 12345678, 1 a 8, 98765432)
 */
export function validateBrazilianPhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== "string") {
    return {
      isValid: false,
      cleanDigits: "",
      errorMessage: "Por favor, insira um número de WhatsApp/Telefone com DDD.",
    };
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 0) {
    return {
      isValid: false,
      cleanDigits: "",
      errorMessage: "Por favor, insira um número de WhatsApp/Telefone com DDD.",
    };
  }

  // Bloqueio rigoroso de sequências curtas ou incompletas (ex: 1 a 8 dígitos)
  if (digits.length < 10) {
    return {
      isValid: false,
      cleanDigits: digits,
      errorMessage: `Telefone incompleto (${digits.length} dígitos informados). Digite o DDD + número com 10 ou 11 dígitos (ex: (84) 99457-1579).`,
    };
  }

  if (digits.length > 11) {
    return {
      isValid: false,
      cleanDigits: digits,
      errorMessage: "Telefone com excesso de dígitos (máximo 11 dígitos com DDD).",
    };
  }

  // 1. Validar se o DDD existe no Brasil (Anatel)
  const ddd = digits.slice(0, 2);
  if (!BRAZILIAN_VALID_DDDS.has(ddd)) {
    return {
      isValid: false,
      cleanDigits: digits,
      errorMessage: `DDD (${ddd}) inválido. Informe um DDD brasileiro válido (ex: 84, 83, 81, 11...).`,
    };
  }

  // 2. Bloquear se todos os dígitos forem idênticos (ex: 11111111111, 99999999999, 00000000000)
  if (/^(\d)\1+$/.test(digits)) {
    return {
      isValid: false,
      cleanDigits: digits,
      errorMessage: "Número inválido. Sequências com dígitos repetidos não são permitidas.",
    };
  }

  // 3. Bloquear se a parte do assinante (após o DDD) for repetida (ex: (84) 99999-9999 ou (84) 00000-0000)
  const subscriber = digits.slice(2);
  if (/^(\d)\1+$/.test(subscriber)) {
    return {
      isValid: false,
      cleanDigits: digits,
      errorMessage: "Número inválido. Evite sequências de teste repetidas (ex: 99999-9999).",
    };
  }

  // 4. Bloquear sequências contínuas óbvias (ex: 12345678, 123456789, 87654321, 1 a 8)
  if (isSequentialSequence(digits) || isSequentialSequence(subscriber)) {
    return {
      isValid: false,
      cleanDigits: digits,
      errorMessage: "Número inválido. Sequências numéricas contínuas (como 1 a 8 ou 123456) não são aceitas.",
    };
  }

  // 5. Regra para Celulares (11 dígitos): deve iniciar com 9 após o DDD
  if (digits.length === 11) {
    if (subscriber[0] !== "9") {
      return {
        isValid: false,
        cleanDigits: digits,
        errorMessage: "Celulares com 11 dígitos devem começar com o dígito 9 após o DDD (ex: (84) 9XXXX-XXXX).",
      };
    }

    // Bloquear casos onde os 8 dígitos após o 9 inicial são repetidos (ex: 90000-0000, 98888-8888)
    const rest = subscriber.slice(1);
    if (/^(\d)\1+$/.test(rest)) {
      return {
        isValid: false,
        cleanDigits: digits,
        errorMessage: "Número de celular inválido. Sequências repetidas de teste não são aceitas.",
      };
    }

    if (isSequentialSequence(rest)) {
      return {
        isValid: false,
        cleanDigits: digits,
        errorMessage: "Número inválido. Sequências numéricas de teste não são permitidas.",
      };
    }
  }

  // 6. Regra para Fixos (10 dígitos): deve iniciar entre 2 e 5
  if (digits.length === 10) {
    if (!["2", "3", "4", "5"].includes(subscriber[0])) {
      return {
        isValid: false,
        cleanDigits: digits,
        errorMessage: "Telefones fixos com 10 dígitos devem começar com 2, 3, 4 ou 5 após o DDD.",
      };
    }
  }

  // 7. Lista de sequências de teste conhecidas
  const knownFakes = new Set([
    "1234567890",
    "0123456789",
    "12345678901",
    "9876543210",
    "98765432109",
    "0987654321",
    "12345678",
    "87654321",
    "987654321",
    "123456789",
    "1234567890",
  ]);

  if (knownFakes.has(digits) || knownFakes.has(subscriber)) {
    return {
      isValid: false,
      cleanDigits: digits,
      errorMessage: "Por favor, insira um número de telefone real, não uma sequência de teste.",
    };
  }

  return { isValid: true, cleanDigits: digits };
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
