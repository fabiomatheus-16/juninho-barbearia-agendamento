import { createClient } from "@supabase/supabase-js";
import type { Appointment, Service, Status } from "../types";

export const VITE_SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://bnnawsrgfwhaeccehoke.supabase.co";

export const VITE_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_SrewnkKNwQGyux6P3C4m7g_gOxVzdzx";

export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Health check to verify if Supabase is connected and if tables exist
 */
export async function checkSupabaseStatus(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  message: string;
}> {
  try {
    const { data, error } = await supabase.from("services").select("id").limit(1);

    if (error) {
      if (error.code === "PGRST205") {
        return {
          connected: true,
          tablesReady: false,
          message:
            "Conectado ao Supabase! Porém a tabela 'services' ainda não foi criada no banco de dados.",
        };
      }
      return {
        connected: false,
        tablesReady: false,
        message: `Erro do Supabase: ${error.message}`,
      };
    }

    return {
      connected: true,
      tablesReady: true,
      message: "Supabase Conectado em Nuvem com Sucesso!",
    };
  } catch (err) {
    return {
      connected: false,
      tablesReady: false,
      message: err instanceof Error ? err.message : "Erro desconhecido ao conectar.",
    };
  }
}

/**
 * Busca serviços em nuvem
 */
export async function fetchServicesFromCloud(): Promise<Service[] | null> {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error || !data) return null;

    return data.map((row) => ({
      id: String(row.id),
      name: row.name,
      price: Number(row.price),
      duration: Number(row.duration) || 30,
      category: row.category || "Cortes",
      description: row.description || "",
      active: row.active ?? true,
      sortOrder: row.sort_order ?? 0,
      tenantId: row.tenant_id,
    }));
  } catch {
    return null;
  }
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Salva ou atualiza serviço no Supabase em nuvem
 */
export async function saveServiceToCloud(service: Omit<Service, "id"> & { id?: string }): Promise<string | null> {
  try {
    const payload = {
      name: service.name,
      price: service.price,
      duration: service.duration,
      category: service.category || "Cortes",
      description: service.description || "",
      active: service.active ?? true,
      sort_order: service.sortOrder ?? 0,
    };

    if (service.id && isValidUUID(service.id)) {
      const { data, error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", service.id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.warn("Supabase update service error:", error.message);
        return null;
      }
      return data ? String(data.id) : service.id;
    } else {
      // Se não tem UUID válido, verifica se já existe pelo nome para atualizar ou inserir
      const { data: existing } = await supabase
        .from("services")
        .select("id")
        .eq("name", service.name)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("services").update(payload).eq("id", existing.id);
        return String(existing.id);
      }

      const { data, error } = await supabase
        .from("services")
        .insert(payload)
        .select("id")
        .maybeSingle();

      if (error) {
        console.warn("Supabase insert service error:", error.message);
        return null;
      }
      return data ? String(data.id) : null;
    }
  } catch (err) {
    console.warn("saveServiceToCloud caught error:", err);
    return null;
  }
}

/**
 * Exclui serviço no Supabase em nuvem
 */
export async function deleteServiceFromCloud(serviceId: string): Promise<boolean> {
  try {
    if (isValidUUID(serviceId)) {
      const { error } = await supabase.from("services").delete().eq("id", serviceId);
      return !error;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Normaliza qualquer formato de data (ISO com timestamp, DD/MM/YYYY, etc.)
 * para o formato canônico universal YYYY-MM-DD sem distorção de fuso horário.
 */
export function normalizeDate(rawDate: unknown): string {
  if (!rawDate) return "";
  if (typeof rawDate === "string") {
    const trimmed = rawDate.trim();
    // 1. Padrão YYYY-MM-DD (ex: "2026-10-24", "2026-10-24T00:00:00Z", "2026-10-24 00:00:00")
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, "0");
      const day = isoMatch[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    // 2. Padrão Brasileiro DD/MM/YYYY (ex: "24/10/2026", "24-10-2026")
    const brMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (brMatch) {
      const day = brMatch[1].padStart(2, "0");
      const month = brMatch[2].padStart(2, "0");
      const year = brMatch[3];
      return `${year}-${month}-${day}`;
    }
    // 3. Fallback para parse UTC
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const day = String(parsed.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const year = rawDate.getFullYear();
    const month = String(rawDate.getMonth() + 1).padStart(2, "0");
    const day = String(rawDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(rawDate).slice(0, 10);
}

/**
 * Normaliza horários para o formato HH:MM (ex: "09:00:00" -> "09:00")
 */
export function normalizeTime(rawTime: unknown): string {
  if (!rawTime) return "09:00";
  const str = String(rawTime).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, "0");
    const mm = match[2];
    return `${hh}:${mm}`;
  }
  return str.slice(0, 5);
}

/**
 * Busca todos os agendamentos em nuvem sem filtros de corte de data
 */
export async function fetchAppointmentsFromCloud(): Promise<Appointment[] | null> {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.warn("Supabase fetch appointments error:", error.message);
      return null;
    }
    if (!data) return null;

    return data.map((row) => ({
      id: String(row.id),
      serviceId: String(row.service_id),
      barberId: String(row.barber_id || "barber-1"),
      date: normalizeDate(row.date),
      time: normalizeTime(row.time),
      clientName: row.client_name || "Cliente",
      clientPhone: row.client_phone || "",
      status: (row.status || "agendado") as Status,
      notes: row.notes || "",
      createdAt: normalizeDate(row.created_at || row.date),
      tenantId: row.tenant_id,
    }));
  } catch (err) {
    console.warn("fetchAppointmentsFromCloud caught error:", err);
    return null;
  }
}

/**
 * Salva agendamento no Supabase em nuvem garantindo formato seguro de data e hora
 */
export async function saveAppointmentToCloud(appointment: Appointment): Promise<string | null> {
  try {
    const payload = {
      id: appointment.id,
      service_id: appointment.serviceId,
      barber_id: appointment.barberId,
      date: normalizeDate(appointment.date),
      time: normalizeTime(appointment.time),
      client_name: appointment.clientName,
      client_phone: appointment.clientPhone,
      status: appointment.status,
      notes: appointment.notes || "",
    };

    const { data, error } = await supabase
      .from("appointments")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn("Could not insert appointment to Supabase table:", error.message);
      return null;
    }

    return data ? String(data.id) : appointment.id;
  } catch (err) {
    console.warn("Supabase appointment save error:", err);
    return null;
  }
}

/**
 * Atualiza status do agendamento no Supabase em nuvem
 */
export async function updateAppointmentStatusInCloud(id: string, status: Status): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Exclui agendamento no Supabase em nuvem
 */
export async function deleteAppointmentFromCloud(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

