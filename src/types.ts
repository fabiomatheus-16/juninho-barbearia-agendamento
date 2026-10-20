export type Service = {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  category?: string;
  description?: string;
  active?: boolean;
  sortOrder?: number;
  tenantId?: string; // Multi-tenant support (e.g. "junin-barbeiro")
};

export type Barber = {
  id: string;
  name: string;
  specialty: string;
  commission: number; // percentage (e.g. 100 or 50)
  active: boolean;
  avatar?: string;
  tenantId?: string; // Multi-tenant support
};

export type Status = "agendado" | "concluido" | "cancelado" | "faltou";

export type Appointment = {
  id: string;
  serviceId: string;
  barberId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  clientName: string;
  clientPhone: string;
  status: Status;
  createdAt: string;
  notes?: string;
  tenantId?: string; // Multi-tenant support
};

export type ShopInfo = {
  name: string;
  tagline: string;
  whatsapp: string; // digits with country code, e.g. 5584994571579
  phoneDisplay: string; // (84) 99457-1579
  address: string;
  founded: number;
  hours: string;
  lunchBreak: string;
  tenantId?: string;
};

export type AdminAuth = {
  isAuthenticated: boolean;
  adminEmail: string;
  lastLogin?: string;
};

/**
 * SaaS & Multi-Tenant Definitions
 * Designed for future connection to Supabase / PostgreSQL
 */
export type Tenant = {
  id: string; // Unique UUID or slug, e.g. "junin-barbeiro-natal"
  slug: string;
  name: string;
  ownerEmail: string;
  phone: string;
  plan: "starter" | "pro" | "enterprise";
  maxBarbers: number;
  active: boolean;
  createdAt: string;
};

export type SupabaseConfig = {
  enabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  tenantId: string;
  status: "disconnected" | "connected" | "error";
  lastSync?: string;
};
