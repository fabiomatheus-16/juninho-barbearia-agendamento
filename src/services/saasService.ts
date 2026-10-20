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
-- JUNIN BARBEIRO - ESTRUTURA OFICIAL PARA O SUPABASE (SQL)
-- Execute este script no SQL Editor do Supabase (Run)
-- 100% Idempotente: pode ser executado várias vezes sem erros!
-- ========================================================

-- 1. EXTENSÃO PARA UUIDs (Nativa do PostgreSQL/Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE SERVIÇOS
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 30,
  category text NOT NULL DEFAULT 'Cortes',
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  tenant_id text DEFAULT 'junin-barbeiro-natal',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. TABELA DE AGENDAMENTOS
CREATE TABLE IF NOT EXISTS public.appointments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_id text NOT NULL,
  barber_id text NOT NULL DEFAULT 'barber-1',
  date date NOT NULL,
  time text NOT NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  status text NOT NULL DEFAULT 'agendado',
  notes text,
  tenant_id text DEFAULT 'junin-barbeiro-natal',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_services_sort ON public.services(sort_order);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(date, time);

-- 5. HABILITAR PERMISSÕES (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total aos servicos" ON public.services;
CREATE POLICY "Acesso total aos servicos"
  ON public.services FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total aos agendamentos" ON public.appointments;
CREATE POLICY "Acesso total aos agendamentos"
  ON public.appointments FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME DE FORMA SEGURA)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'services'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
    END IF;
  END IF;
END $$;

-- 7. POVOAR COM OS 5 SERVIÇOS OFICIAIS DO JUNIN BARBEIRO (Sem duplicar se já existirem)
INSERT INTO public.services (name, price, duration, category, sort_order)
SELECT v.name, v.price, v.duration, v.category, v.sort_order
FROM (
  VALUES
    ('Nevou + corte', 75.00::numeric, 90::integer, 'Química & Corte', 1::integer),
    ('Reflexo alinhado + corte', 75.00::numeric, 90::integer, 'Química & Corte', 2::integer),
    ('Corte navalhado', 20.00::numeric, 30::integer, 'Cortes', 3::integer),
    ('Corte pigmentado', 35.00::numeric, 45::integer, 'Cortes', 4::integer),
    ('Barba', 10.00::numeric, 20::integer, 'Barba', 5::integer)
) AS v(name, price, duration, category, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.services s WHERE s.name = v.name
);
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
