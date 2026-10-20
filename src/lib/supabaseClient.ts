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
 * Busca agendamentos em nuvem
 */
export async function fetchAppointmentsFromCloud(): Promise<Appointment[] | null> {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return null;

    return data.map((row) => ({
      id: String(row.id),
      serviceId: String(row.service_id),
      barberId: String(row.barber_id || "barber-1"),
      date: row.date,
      time: row.time,
      clientName: row.client_name,
      clientPhone: row.client_phone,
      status: (row.status || "agendado") as Status,
      notes: row.notes || "",
      createdAt: row.created_at || row.date,
      tenantId: row.tenant_id,
    }));
  } catch {
    return null;
  }
}

/**
 * Salva agendamento no Supabase em nuvem
 */
export async function saveAppointmentToCloud(appointment: Appointment): Promise<string | null> {
  try {
    const payload = {
      id: appointment.id,
      service_id: appointment.serviceId,
      barber_id: appointment.barberId,
      date: appointment.date,
      time: appointment.time,
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

