export {
  supabase,
  VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY,
  checkSupabaseStatus,
  fetchServicesFromCloud,
  saveServiceToCloud,
  deleteServiceFromCloud,
  fetchAppointmentsFromCloud,
  saveAppointmentToCloud,
  updateAppointmentStatusInCloud,
} from "../../lib/supabaseClient";
