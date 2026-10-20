/**
 * SaaS & Multi-Tenant Data Layer for Junin Barbeiro
 * 
 * Este módulo estrutura a aplicação para evolução SaaS (Software as a Service):
 * 1. Separação por `tenantId` (ID da Barbearia) em todas as entidades (serviços, barbeiros, agendamentos).
 * 2. Suporte a múltiplos barbeiros e filiais sob a mesma conta ou em tenants isolados.
 * 3. Camada de abstração que permite usar LocalStorage hoje e plugar Supabase amanhã sem reescrever a UI.
 */

import type { Service, Barber, Appointment, Tenant, SupabaseConfig } from "../types";

export const DEFAULT_TENANT_ID = "junin-barbeiro-natal";

export const DEFAULT_TENANT_INFO: Tenant = {
  id: DEFAULT_TENANT_ID,
  slug: "junin-barbeiro",
  name: "Junin Barbeiro",
  ownerEmail: "admin@juninbarbeiro.com",
  phone: "5584994571579",
  plan: "pro",
  maxBarbers: 5,
  active: true,
  createdAt: "2021-01-10",
};

/**
 * Interface unificada para serviços de dados.
 * Qualquer backend (Supabase, Firebase, Cloud SQL ou LocalStorage)
 * implementa esta mesma interface.
 */
export interface BarbershopDataService {
  // Serviços
  getServices(tenantId: string): Promise<Service[]>;
  saveService(tenantId: string, service: Omit<Service, "id"> & { id?: string }): Promise<Service>;
  deleteService(tenantId: string, serviceId: string): Promise<void>;

  // Barbeiros
  getBarbers(tenantId: string): Promise<Barber[]>;
  saveBarber(tenantId: string, barber: Omit<Barber, "id"> & { id?: string }): Promise<Barber>;
  deleteBarber(tenantId: string, barberId: string): Promise<void>;

  // Agendamentos
  getAppointments(tenantId: string, filterDate?: string): Promise<Appointment[]>;
  createAppointment(tenantId: string, appointment: Omit<Appointment, "id" | "status" | "createdAt">): Promise<Appointment>;
  updateAppointmentStatus(tenantId: string, appointmentId: string, status: Appointment["status"]): Promise<void>;
}

/**
 * Script SQL para o Supabase com suporte a Multi-Tenant e RLS (Row Level Security).
 * O usuário pode copiar e colar este script no SQL Editor do Supabase quando quiser conectar a nuvem.
 */
export const SUPABASE_MIGRATION_SQL = `-- ========================================================
-- JUNIN BARBEIRO - ESTRUTURA MULTI-TENANT PARA O SUPABASE
-- ========================================================

-- 1. Tabela de Tenants (Barbearias assinantes do SaaS)
CREATE TABLE IF NOT EXISTS public.tenants (
  id text PRIMARY KEY DEFAULT 'junin-barbeiro-natal',
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  owner_email text NOT NULL,
  phone text NOT NULL,
  plan text NOT NULL DEFAULT 'pro',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir tenant padrão da barbearia
INSERT INTO public.tenants (id, slug, name, owner_email, phone)
VALUES ('junin-barbeiro-natal', 'junin-barbeiro', 'Junin Barbeiro', 'admin@juninbarbeiro.com', '5584994571579')
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela de Barbeiros (vinculados ao tenant)
CREATE TABLE IF NOT EXISTS public.barbers (
  id text PRIMARY KEY,
  tenant_id text REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT 'junin-barbeiro-natal',
  name text NOT NULL,
  specialty text,
  commission numeric(5,2) NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir barbeiro padrão (Juninho)
INSERT INTO public.barbers (id, tenant_id, name, specialty, commission, active)
VALUES ('barber-1', 'junin-barbeiro-natal', 'Juninho', 'Cortes modernos, nevou e barba', 100, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Tabela de Serviços (com tenant_id para suportar múltiplas barbearias)
CREATE TABLE IF NOT EXISTS public.services (
  id text PRIMARY KEY,
  tenant_id text REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT 'junin-barbeiro-natal',
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 30,
  category text NOT NULL DEFAULT 'Cortes',
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir os 5 serviços oficiais solicitados
INSERT INTO public.services (id, tenant_id, name, price, duration, category, sort_order) VALUES
  ('svc-1', 'junin-barbeiro-natal', 'Nevou + corte', 75.00, 90, 'Química & Corte', 1),
  ('svc-2', 'junin-barbeiro-natal', 'Reflexo alinhado + corte', 75.00, 90, 'Química & Corte', 2),
  ('svc-3', 'junin-barbeiro-natal', 'Corte navalhado', 20.00, 30, 'Cortes', 3),
  ('svc-4', 'junin-barbeiro-natal', 'Corte pigmentado', 35.00, 45, 'Cortes', 4),
  ('svc-5', 'junin-barbeiro-natal', 'Barba', 10.00, 20, 'Barba', 5)
ON CONFLICT (id) DO NOTHING;

-- 4. Tabela de Agendamentos (com tenant_id e barber_id)
CREATE TABLE IF NOT EXISTS public.appointments (
  id text PRIMARY KEY,
  tenant_id text REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL DEFAULT 'junin-barbeiro-natal',
  service_id text REFERENCES public.services(id) ON DELETE RESTRICT NOT NULL,
  barber_id text REFERENCES public.barbers(id) ON DELETE RESTRICT NOT NULL,
  date date NOT NULL,
  time text NOT NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  status text NOT NULL DEFAULT 'agendado', -- agendado, concluido, cancelado, faltou
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_barbers_tenant ON public.barbers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON public.appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON public.appointments(barber_id, date);

-- 6. Políticas de RLS (Permitir leitura, inserção, edição e exclusão)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total a servicos" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a barbeiros" ON public.barbers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a agendamentos" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

-- 7. Publicação em Tempo Real (Realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
`;

/**
 * Utilitário de verificação de conexão com Supabase
 */
export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  if (!url || !key) {
    return { success: false, message: "URL e Chave Anon do Supabase são obrigatórias." };
  }

  try {
    const cleanUrl = url.replace(/\/+$/, "");
    const res = await fetch(`${cleanUrl}/rest/v1/services?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (res.ok) {
      return { success: true, message: "Conexão estabelecida com sucesso com o Supabase!" };
    } else {
      return { success: false, message: `Erro ao conectar: status ${res.status} (${res.statusText})` };
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Falha na comunicação de rede com o Supabase.",
    };
  }
}
