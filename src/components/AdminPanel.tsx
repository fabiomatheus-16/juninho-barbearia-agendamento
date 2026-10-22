import React, { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  Sparkles,
  LogOut,
  RotateCcw,
  Scissors,
  Users,
  DollarSign,
  TrendingUp,
  Settings,
  Shield,
  Search,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Calendar,
  Award,
  BarChart3,
  Database,
  Copy,
  ExternalLink,
  Layers,
  Building2,
  Check,
  MessageCircle,
  Phone,
  UserX,
  X,
  RefreshCw,
  CalendarDays,
  Filter,
} from "lucide-react";
import type { Service, Barber, Appointment, Status } from "../types";
import {
  actions,
  brl,
  formatDateBR,
  formatTimeMinutes,
  calculateFinancialSummary,
  SHOP,
  useStore,
  todayISO,
  getRelativeDateISO,
  buildWhatsappLink,
  TIME_SLOTS,
  isOpenDate,
  normalizeDate,
  normalizeTime,
} from "../lib/store";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_INFO,
  SUPABASE_MIGRATION_SQL,
  testSupabaseConnection,
} from "../services/saasService";
import { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } from "../lib/supabaseClient";
import { ServiceModal } from "./ServiceModal";
import { BrandLogo } from "./ui/BrandLogo";

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  agendado: {
    label: "Agendado",
    bg: "bg-[#00f0ff]/10",
    text: "text-[#00f0ff]",
    border: "border-[#00f0ff]/30",
    dot: "bg-[#00f0ff]",
  },
  concluido: {
    label: "Concluído",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  cancelado: {
    label: "Cancelado",
    bg: "bg-gray-800/80",
    text: "text-gray-400",
    border: "border-gray-700",
    dot: "bg-gray-500",
  },
  faltou: {
    label: "Falta (No-show)",
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-400",
  },
};

interface AdminPanelProps {
  onLogout: () => void;
}

export function AdminPanel({ onLogout }: AdminPanelProps) {
  const { services, barbers, appointments, adminAuth, adminCredentials, supabaseConfig } =
    useStore((s) => s);

  // Sub-tabs (Agenda como aba principal integrada)
  const [activeTab, setActiveTab] = useState<
    "appointments" | "services" | "barbers" | "reports" | "settings"
  >("appointments");

  // Filtros da Agenda / Agendamentos
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [dateFilterMode, setDateFilterMode] = useState<"day" | "future" | "all">("future");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [barberFilter, setBarberFilter] = useState<string>("all");
  const [appointmentSearch, setAppointmentSearch] = useState<string>("");
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Modal de Exclusão de Agendamento
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);

  // Modal de Novo Agendamento Rápido pelo Admin
  const [isAddApptModalOpen, setIsAddApptModalOpen] = useState(false);
  const [newApptClientName, setNewApptClientName] = useState("");
  const [newApptClientPhone, setNewApptClientPhone] = useState("");
  const [newApptServiceId, setNewApptServiceId] = useState("");
  const [newApptBarberId, setNewApptBarberId] = useState("barber-1");
  const [newApptDate, setNewApptDate] = useState(todayISO());
  const [newApptTime, setNewApptTime] = useState("09:00");
  const [newApptNotes, setNewApptNotes] = useState("");

  // Ranking period filter
  const [rankingPeriod, setRankingPeriod] = useState<"month" | "week" | "today" | "all">(
    "month"
  );

  // Service Modal state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Delete Service Confirmation state
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  // Search filter for services
  const [searchQuery, setSearchQuery] = useState("");

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings form state
  const [newAdminEmail, setNewAdminEmail] = useState(adminCredentials.email);
  const [newAdminPass, setNewAdminPass] = useState(adminCredentials.password);
  const [newAdminPin, setNewAdminPin] = useState(adminCredentials.pin);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Supabase SaaS form state (initialized with official env credentials)
  const [supabaseUrl, setSupabaseUrl] = useState(
    supabaseConfig.supabaseUrl || VITE_SUPABASE_URL
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    supabaseConfig.supabaseAnonKey || VITE_SUPABASE_PUBLISHABLE_KEY
  );
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestFeedback, setSupabaseTestFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Financial calculations
  const financial = calculateFinancialSummary(appointments, services, rankingPeriod);

  // Sincronização manual com a nuvem do Supabase
  const handleRefreshSupabase = async () => {
    setIsSyncingCloud(true);
    try {
      const fresh = await actions.refreshAppointments();
      showToast(`Sincronizado! ${fresh.length} agendamento(s) carregados da nuvem.`);
    } catch {
      showToast("Aviso: Falha temporária ao sincronizar com o Supabase.");
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Handlers da Agenda / Agendamentos
  const handleSetAppointmentStatus = (id: string, newStatus: Status) => {
    actions.setAppointmentStatus(id, newStatus);
    if (newStatus === "concluido") {
      showToast("Atendimento marcado como Concluído!");
    } else if (newStatus === "faltou") {
      showToast("Atendimento marcado como Falta (No-show)!");
    } else if (newStatus === "cancelado") {
      showToast("Agendamento cancelado com sucesso.");
    } else {
      showToast("Agendamento reaberto como pendente!");
    }
  };

  const handleConfirmDeleteAppt = () => {
    if (!deletingAppointment) return;
    const client = deletingAppointment.clientName;
    actions.deleteAppointment(deletingAppointment.id);
    setDeletingAppointment(null);
    showToast(`Agendamento de ${client} excluído com sucesso.`);
  };

  const changeDay = (delta: number) => {
    const normalized = normalizeDate(selectedDate) || todayISO();
    const [y, m, d] = normalized.split("-").map(Number);
    // Meio-dia (12:00) evita qualquer salto involuntário de data por fuso horário ou horário de verão
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    dateObj.setDate(dateObj.getDate() + delta);
    const ny = dateObj.getFullYear();
    const nm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const nd = String(dateObj.getDate()).padStart(2, "0");
    setSelectedDate(`${ny}-${nm}-${nd}`);
    setDateFilterMode("day");
  };

  const handleCreateManualAppt = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeSvcs = services.filter((s) => s.active !== false);
      const svcId = newApptServiceId || activeSvcs[0]?.id || services[0]?.id;
      if (!svcId) {
        showToast("Nenhum serviço disponível.");
        return;
      }
      actions.addAppointment({
        serviceId: svcId,
        barberId: newApptBarberId || barbers[0]?.id || "barber-1",
        date: normalizeDate(newApptDate),
        time: normalizeTime(newApptTime),
        clientName: newApptClientName.trim(),
        clientPhone: newApptClientPhone.trim(),
        notes: newApptNotes.trim() || undefined,
      });
      setIsAddApptModalOpen(false);
      setNewApptClientName("");
      setNewApptClientPhone("");
      setNewApptNotes("");
      showToast("Agendamento criado e salvo no Supabase!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao agendar horário.");
    }
  };

  // Mapeia todas as datas que possuem agendamentos no banco
  const datesWithApptsMap = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach((a) => {
      const d = normalizeDate(a.date);
      if (d) {
        map.set(d, (map.get(d) || 0) + 1);
      }
    });
    return map;
  }, [appointments]);

  // Lista dos próximos dias para navegação rápida com pílulas interativas
  const upcomingPills = useMemo(() => {
    const pills: { date: string; label: string; count: number; isToday?: boolean; isSunday?: boolean }[] = [];
    const addedDates = new Set<string>();

    for (let offset = 0; offset <= 10; offset++) {
      const d = getRelativeDateISO(offset);
      addedDates.add(d);
      const isToday = offset === 0;
      const isTomorrow = offset === 1;
      const count = datesWithApptsMap.get(d) || 0;
      const isSunday = !isOpenDate(d);

      let label = formatDateBR(d);
      const parts = d.split("-");
      const shortDate = `${parts[2]}/${parts[1]}`;

      if (isToday) {
        label = `Hoje (${shortDate})`;
      } else if (isTomorrow) {
        label = `Amanhã (${shortDate})`;
      } else {
        const [y, m, day] = d.split("-").map(Number);
        const dayOfWeekShort = new Date(y, m - 1, day, 12, 0, 0).toLocaleDateString("pt-BR", { weekday: "short" });
        label = `${dayOfWeekShort.replace(".", "")}, ${shortDate}`;
      }

      pills.push({ date: d, label, count, isToday, isSunday });
    }

    // Adiciona quaisquer outras datas futuras que já tenham agendamentos gravados
    const today = todayISO();
    Array.from(datesWithApptsMap.keys())
      .filter((d) => d >= today && !addedDates.has(d))
      .sort()
      .forEach((d) => {
        const count = datesWithApptsMap.get(d) || 0;
        const [y, m, day] = d.split("-").map(Number);
        const dayOfWeekShort = new Date(y, m - 1, day, 12, 0, 0).toLocaleDateString("pt-BR", { weekday: "short" });
        const parts = d.split("-");
        const shortDate = `${parts[2]}/${parts[1]}`;
        pills.push({
          date: d,
          label: `${dayOfWeekShort.replace(".", "")}, ${shortDate}`,
          count,
          isSunday: !isOpenDate(d),
        });
      });

    return pills;
  }, [datesWithApptsMap]);

  // Estatísticas e filtros da Agenda
  const todayDate = todayISO();
  const normalizedSelectedDate = normalizeDate(selectedDate);
  const isSelectedDateToday = normalizedSelectedDate === todayDate;

  const todayAppointments = appointments.filter((a) => normalizeDate(a.date) === todayDate);
  const todayPendingCount = todayAppointments.filter((a) => a.status === "agendado").length;
  const futureAppointments = appointments.filter((a) => normalizeDate(a.date) >= todayDate);
  const futureCount = futureAppointments.length;

  const filteredAppointments = appointments
    .filter((appt) => {
      const apptDate = normalizeDate(appt.date);
      if (dateFilterMode === "day" && apptDate !== normalizedSelectedDate) {
        return false;
      }
      if (dateFilterMode === "future" && apptDate < todayDate) {
        return false;
      }
      if (barberFilter !== "all" && appt.barberId !== barberFilter) {
        return false;
      }
      if (statusFilter !== "all" && appt.status !== statusFilter) {
        return false;
      }
      if (appointmentSearch.trim()) {
        const q = appointmentSearch.toLowerCase().trim();
        const matchName = appt.clientName.toLowerCase().includes(q);
        const matchPhone = appt.clientPhone.toLowerCase().includes(q);
        const matchNotes = appt.notes?.toLowerCase().includes(q) ?? false;
        const svc = services.find((s) => s.id === appt.serviceId);
        const matchSvc = svc?.name.toLowerCase().includes(q) ?? false;
        const matchDate = apptDate.includes(q) || formatDateBR(apptDate).toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNotes && !matchSvc && !matchDate) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = normalizeDate(a.date);
      const dateB = normalizeDate(b.date);
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return normalizeTime(a.time).localeCompare(normalizeTime(b.time));
    });

  const getService = (serviceId: string) => services.find((s) => s.id === serviceId);
  const getBarber = (barberId: string) => barbers.find((b) => b.id === barberId);

  // Faturamento e contadores dos agendamentos exibidos
  const completedInView = filteredAppointments.filter((a) => a.status === "concluido");
  const revenueInView = completedInView.reduce((sum, a) => {
    const svc = getService(a.serviceId);
    return sum + (svc?.price || 0);
  }, 0);
  const pendingInView = filteredAppointments.filter((a) => a.status === "agendado").length;
  const noShowInView = filteredAppointments.filter((a) => a.status === "faltou").length;
  const canceledInView = filteredAppointments.filter((a) => a.status === "cancelado").length;

  // Turnos (quando visualizando por dia)
  const morningList = filteredAppointments.filter((a) => a.time < "12:00");
  const afternoonList = filteredAppointments.filter((a) => a.time >= "12:00");

  // Service handlers
  const handleOpenAddService = () => {
    setEditingService(null);
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (svc: Service) => {
    setEditingService(svc);
    setIsServiceModalOpen(true);
  };

  const handleSaveService = (serviceData: Omit<Service, "id"> & { id?: string }) => {
    actions.saveService(serviceData);
    showToast(
      serviceData.id
        ? `Serviço "${serviceData.name}" atualizado com sucesso!`
        : `Serviço "${serviceData.name}" adicionado com sucesso!`
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingService) return;
    const name = deletingService.name;
    actions.deleteService(deletingService.id);
    setDeletingService(null);
    showToast(`Serviço "${name}" excluído.`);
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        "Deseja restaurar os 5 serviços oficiais da barbearia (Nevou + corte, Reflexo alinhado + corte, Corte navalhado, Corte pigmentado, Barba)?"
      )
    ) {
      actions.resetDefaultServices();
      showToast("Os 5 serviços oficiais foram restaurados!");
    }
  };

  const handleToggleActive = (svc: Service) => {
    actions.saveService({
      ...svc,
      active: !svc.active,
    });
    showToast(
      svc.active
        ? `Serviço "${svc.name}" desativado do agendamento público.`
        : `Serviço "${svc.name}" ativado para agendamento!`
    );
  };

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalServicesCount = services.length;
  const avgPrice =
    totalServicesCount > 0
      ? services.reduce((sum, s) => sum + s.price, 0) / totalServicesCount
      : 0;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    actions.updateAdminCredentials(newAdminEmail, newAdminPass, newAdminPin);
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
    showToast("Credenciais de acesso atualizadas com sucesso!");
  };

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupabaseTestFeedback(null);
    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setTestingSupabase(false);
    setSupabaseTestFeedback(res);
    if (res.success) {
      actions.updateSupabaseConfig({
        enabled: true,
        supabaseUrl,
        supabaseAnonKey,
        status: "connected",
        lastSync: new Date().toISOString(),
      });
      showToast("Supabase conectado com sucesso!");
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
    showToast("SQL de migração copiado para a área de transferência!");
  };

  return (
    <div className="min-h-screen pb-28 pt-4 px-4 sm:px-6 max-w-4xl mx-auto">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#00f0ff] text-[#050b14] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-[0_0_25px_rgba(0,240,255,0.6)] flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="size-4" />
          {toastMessage}
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-[#171a22] via-[#14161c] to-[#111318] border border-[#272a34] shadow-lg mb-6">
        <div className="flex items-center gap-3.5">
          <BrandLogo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] font-bold uppercase tracking-wider">
                Admin Master
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Supabase Nuvem
              </span>
              <span className="text-xs text-gray-400">
                {adminAuth.adminEmail || "admin@juninbarbeiro.com"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5">
              Painel de Gestão
            </h1>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="self-end sm:self-center px-3.5 py-2 rounded-xl bg-[#1e222c] hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-[#2b303e] hover:border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
        >
          <LogOut className="size-3.5" />
          Sair
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-[#14161c] border border-[#272a34] overflow-x-auto mb-6">
        <button
          onClick={() => setActiveTab("appointments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === "appointments"
              ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              : "text-gray-400 hover:text-white hover:bg-[#1a1d24]"
          }`}
        >
          <Calendar className="size-4" />
          Agenda & Atendimentos
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "appointments"
                ? "bg-[#090a0f] text-[#00f0ff]"
                : "bg-[#00f0ff]/15 text-[#00f0ff]"
            }`}
          >
            {todayPendingCount > 0 ? `${todayPendingCount} hoje` : appointments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === "services"
              ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              : "text-gray-400 hover:text-white hover:bg-[#1a1d24]"
          }`}
        >
          <Scissors className="size-4" />
          Serviços ({services.length})
        </button>

        <button
          onClick={() => setActiveTab("barbers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === "barbers"
              ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              : "text-gray-400 hover:text-white hover:bg-[#1a1d24]"
          }`}
        >
          <Users className="size-4" />
          Barbeiros ({barbers.length})
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === "reports"
              ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              : "text-gray-400 hover:text-white hover:bg-[#1a1d24]"
          }`}
        >
          <TrendingUp className="size-4" />
          Fechamento & Relatórios
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === "settings"
              ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              : "text-gray-400 hover:text-white hover:bg-[#1a1d24]"
          }`}
        >
          <Settings className="size-4" />
          Configurações & SaaS
        </button>
      </div>

      {/* TAB 0: AGENDA & AGENDAMENTOS (INTEGRADA DO ADMIN) */}
      {activeTab === "appointments" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Bar: Title, Cloud Sync & Quick Add */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white font-display">
                  Gestão da Agenda & Atendimentos
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Supabase Nuvem
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Controle em tempo real, confirmações via WhatsApp e gestão de datas sem cortes
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRefreshSupabase}
                disabled={isSyncingCloud}
                className="h-10 px-3.5 rounded-xl bg-[#1e222c] hover:bg-[#272d3a] border border-[#2b303e] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-60"
                title="Buscar agendamentos mais recentes salvos no Supabase"
              >
                <RefreshCw className={`size-3.5 text-[#00f0ff] ${isSyncingCloud ? "animate-spin" : ""}`} />
                <span>{isSyncingCloud ? "Sincronizando..." : "Sincronizar Supabase"}</span>
              </button>

              <button
                onClick={() => {
                  const activeSvcs = services.filter((s) => s.active !== false);
                  setNewApptServiceId(activeSvcs[0]?.id || services[0]?.id || "");
                  setNewApptBarberId(barbers[0]?.id || "barber-1");
                  setNewApptDate(selectedDate || todayISO());
                  setNewApptTime("09:00");
                  setNewApptClientName("");
                  setNewApptClientPhone("");
                  setNewApptNotes("");
                  setIsAddApptModalOpen(true);
                }}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-[#090a0f] font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:brightness-110 transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="size-4 stroke-[3]" />
                Novo Agendamento
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34]">
              <span className="text-[11px] font-medium text-gray-400 block">
                {dateFilterMode === "day"
                  ? isSelectedDateToday
                    ? "Hoje na Barbearia"
                    : `Dia ${selectedDate.split("-").reverse().slice(0, 2).join("/")}`
                  : dateFilterMode === "future"
                  ? "Agendamentos Futuros"
                  : "Total Geral"}
              </span>
              <p className="font-display text-2xl font-bold text-white mt-1">
                {filteredAppointments.length}
              </p>
              <span className="text-[11px] text-[#00f0ff] font-medium">
                {pendingInView} pendente{pendingInView !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161820] border border-emerald-500/25">
              <span className="text-[11px] font-medium text-gray-400 block">
                Concluídos & Faturados
              </span>
              <p className="font-display text-2xl font-bold text-emerald-400 mt-1">
                {completedInView.length}
              </p>
              <span className="text-[11px] text-emerald-300 font-semibold">
                {brl(revenueInView)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34]">
              <span className="text-[11px] font-medium text-gray-400 block">
                Faltas (No-show)
              </span>
              <p className="font-display text-2xl font-bold text-red-400 mt-1">
                {noShowInView}
              </p>
              <span className="text-[11px] text-gray-400">
                {canceledInView} cancelado{canceledInView !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34]">
              <span className="text-[11px] font-medium text-gray-400 block">
                Total no Supabase
              </span>
              <p className="font-display text-2xl font-bold text-[#00f0ff] mt-1">
                {appointments.length}
              </p>
              <span className="text-[11px] text-gray-400">
                {futureCount} futuros a partir de hoje
              </span>
            </div>
          </div>

          {/* Date Navigator & Filter Controls */}
          <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34] space-y-3.5">
            {/* Quick Date Pills Horizontal Scrollbar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-[#00f0ff]" />
                  Navegação Rápida por Datas:
                </span>
                <span className="text-[10px] text-gray-500">
                  Toque para ver a agenda do dia
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {upcomingPills.map((pill) => {
                  const isSelected = dateFilterMode === "day" && normalizedSelectedDate === pill.date;
                  return (
                    <button
                      key={pill.date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(pill.date);
                        setDateFilterMode("day");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_12px_rgba(0,240,255,0.35)] scale-[1.02]"
                          : pill.count > 0
                          ? "bg-[#18232e] text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#1f2f3e]"
                          : pill.isSunday
                          ? "bg-[#14151b] text-gray-500 border border-[#20222a] hover:bg-[#191b22]"
                          : "bg-[#161820] text-gray-300 border border-[#272a34] hover:bg-[#1f232e] hover:text-white"
                      }`}
                    >
                      <span>{pill.label}</span>
                      {pill.count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected
                              ? "bg-[#090a0f] text-[#00f0ff]"
                              : "bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40"
                          }`}
                        >
                          {pill.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stepper buttons, date display, and mode switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-[#22252e]">
              {/* Stepper and active day indicator */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeDay(-1)}
                  className="p-2 rounded-xl bg-[#1e222c] hover:bg-[#272d3a] text-gray-300 hover:text-white transition"
                  aria-label="Dia anterior"
                  title="Dia anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#12141a] border border-[#272a34]">
                  <Calendar className="size-4 text-[#00f0ff]" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {dateFilterMode === "day"
                      ? isSelectedDateToday
                        ? `Hoje (${formatDateBR(selectedDate)})`
                        : formatDateBR(selectedDate)
                      : dateFilterMode === "future"
                      ? `Próximos / Futuros (A partir de Hoje • ${futureCount})`
                      : `Histórico Completo (${appointments.length})`}
                  </span>
                </div>

                <button
                  onClick={() => changeDay(1)}
                  className="p-2 rounded-xl bg-[#1e222c] hover:bg-[#272d3a] text-gray-300 hover:text-white transition"
                  aria-label="Próximo dia"
                  title="Próximo dia"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* View Mode Switcher and Native Date Picker */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedDate(todayISO());
                    setDateFilterMode("day");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    dateFilterMode === "day" && isSelectedDateToday
                      ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                      : "bg-[#1e222c] text-gray-300 hover:text-white hover:bg-[#252b37]"
                  }`}
                >
                  Hoje
                </button>

                <button
                  onClick={() => setDateFilterMode("future")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    dateFilterMode === "future"
                      ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                      : "bg-[#1e222c] text-gray-300 hover:text-white hover:bg-[#252b37]"
                  }`}
                  title="Ver todos os agendamentos a partir de hoje (incluindo amanhã, dia 24 e seguintes)"
                >
                  <span>Próximos / Futuros</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      dateFilterMode === "future"
                        ? "bg-[#090a0f] text-[#00f0ff]"
                        : "bg-[#2b303e] text-gray-300"
                    }`}
                  >
                    {futureCount}
                  </span>
                </button>

                <button
                  onClick={() => setDateFilterMode("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    dateFilterMode === "all"
                      ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                      : "bg-[#1e222c] text-gray-300 hover:text-white hover:bg-[#252b37]"
                  }`}
                  title="Ver histórico geral de todos os agendamentos"
                >
                  Histórico Geral
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(normalizeDate(e.target.value));
                      setDateFilterMode("day");
                    }
                  }}
                  className="h-8 rounded-xl bg-[#1e222c] border border-[#2b303e] px-2.5 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  title="Selecionar data específica no calendário"
                />
              </div>
            </div>

            {/* Sub-filters: Barbeiro, Status & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#22252e]">
              {/* Search */}
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente, tel, serviço ou data (ex: 24)..."
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  className="w-full h-9 rounded-xl bg-[#12141a] border border-[#272a34] pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                />
                {appointmentSearch && (
                  <button
                    onClick={() => setAppointmentSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400 font-medium shrink-0">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
                  className="w-full h-9 rounded-xl bg-[#12141a] border border-[#272a34] px-2.5 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                >
                  <option value="all">Todos os Status</option>
                  <option value="agendado">Agendados (Pendentes)</option>
                  <option value="concluido">Concluídos</option>
                  <option value="faltou">Faltas (No-show)</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>

              {/* Barber Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400 font-medium shrink-0">Barbeiro:</span>
                <select
                  value={barberFilter}
                  onChange={(e) => setBarberFilter(e.target.value)}
                  className="w-full h-9 rounded-xl bg-[#12141a] border border-[#272a34] px-2.5 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                >
                  <option value="all">Todos os Barbeiros</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Agenda List View */}
          {dateFilterMode === "day" ? (
            <div className="space-y-6">
              {/* Turno da Manhã */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#00f0ff]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Turno da Manhã (08h às 12h)
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    {morningList.length} atendimento{morningList.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {morningList.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#14161c] border border-[#22252e] text-center text-xs text-gray-500">
                    Nenhum agendamento na manhã para este dia ({formatDateBR(selectedDate)}).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {morningList.map((appt) => (
                      <AppointmentCard
                        key={appt.id}
                        appointment={appt}
                        service={getService(appt.serviceId)}
                        barber={getBarber(appt.barberId)}
                        onSetStatus={handleSetAppointmentStatus}
                        onDelete={(a) => setDeletingAppointment(a)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Turno da Tarde */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#0099ff]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Turno da Tarde & Noite (14h às 19h)
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    {afternoonList.length} atendimento{afternoonList.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {afternoonList.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#14161c] border border-[#22252e] text-center text-xs text-gray-500">
                    Nenhum agendamento na tarde para este dia ({formatDateBR(selectedDate)}).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {afternoonList.map((appt) => (
                      <AppointmentCard
                        key={appt.id}
                        appointment={appt}
                        service={getService(appt.serviceId)}
                        barber={getBarber(appt.barberId)}
                        onSetStatus={handleSetAppointmentStatus}
                        onDelete={(a) => setDeletingAppointment(a)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {filteredAppointments.length === 0 && (
                <div className="p-8 rounded-2xl bg-[#14161c] border border-[#22252e] text-center space-y-3">
                  <p className="text-xs text-gray-400">
                    Não há agendamentos para o dia {formatDateBR(selectedDate)}.
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDateFilterMode("future")}
                      className="px-4 py-2 rounded-xl bg-[#00f0ff] text-[#090a0f] font-bold text-xs shadow-[0_0_12px_rgba(0,240,255,0.3)] hover:brightness-110 transition"
                    >
                      Ver Todos os Agendamentos Futuros ({futureCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const activeSvcs = services.filter((s) => s.active !== false);
                        setNewApptServiceId(activeSvcs[0]?.id || services[0]?.id || "");
                        setNewApptBarberId(barbers[0]?.id || "barber-1");
                        setNewApptDate(selectedDate);
                        setNewApptTime("09:00");
                        setNewApptClientName("");
                        setNewApptClientPhone("");
                        setNewApptNotes("");
                        setIsAddApptModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1e222c] hover:bg-[#272d3a] border border-[#2b303e] text-gray-300 hover:text-white text-xs font-semibold transition"
                    >
                      Agendar Cliente neste Dia
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Modo "Próximos / Futuros" ou "Histórico Completo" */
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {dateFilterMode === "future"
                    ? `Agendamentos Futuros a Partir de Hoje (${filteredAppointments.length})`
                    : `Histórico Geral de Agendamentos (${filteredAppointments.length})`}
                </span>
                <span className="text-[11px] text-gray-500">
                  Ordenados por data e horário
                </span>
              </div>

              {filteredAppointments.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#14161c] border border-[#22252e] text-center space-y-3">
                  <p className="text-xs text-gray-400">
                    Nenhum agendamento encontrado com os filtros selecionados.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("all");
                      setBarberFilter("all");
                      setAppointmentSearch("");
                      setDateFilterMode("future");
                    }}
                    className="px-4 py-2 rounded-xl bg-[#1e222c] hover:bg-[#272d3a] text-[#00f0ff] text-xs font-semibold transition"
                  >
                    Limpar Filtros de Busca
                  </button>
                </div>
              ) : (
                filteredAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    service={getService(appt.serviceId)}
                    barber={getBarber(appt.barberId)}
                    onSetStatus={handleSetAppointmentStatus}
                    onDelete={(a) => setDeletingAppointment(a)}
                    showDateBadge
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}


      {/* TAB 1: SERVICES (CRUD COMPLETO) */}
      {activeTab === "services" && (
        <div className="space-y-5 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34]">
              <span className="text-xs text-gray-400 block">Total de Serviços</span>
              <p className="font-display text-2xl font-bold text-white mt-1">
                {totalServicesCount}
              </p>
              <span className="text-[11px] text-[#00f0ff]">
                {services.filter((s) => s.active !== false).length} ativos no agendamento
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34]">
              <span className="text-xs text-gray-400 block">Preço Médio</span>
              <p className="font-display text-2xl font-bold text-[#00f0ff] mt-1">
                {brl(avgPrice)}
              </p>
              <span className="text-[11px] text-gray-400">
                Ticket estimado por atendimento
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34] flex flex-col justify-center">
              <button
                onClick={handleResetDefaults}
                className="w-full py-2.5 px-3 rounded-xl bg-[#1e222c] hover:bg-[#252b38] border border-[#2b303e] text-gray-300 hover:text-[#00f0ff] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                title="Restaura os 5 serviços padrão (Nevou, Reflexo, etc.)"
              >
                <RotateCcw className="size-3.5 text-[#00f0ff]" />
                Restaurar 5 Serviços Oficiais
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#161820] border border-[#272a34] pl-10 pr-4 text-xs sm:text-sm text-white focus:outline-none focus:border-[#00f0ff]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                >
                  Limpar
                </button>
              )}
            </div>

            <button
              onClick={handleOpenAddService}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-[#090a0f] font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:brightness-110 transition active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="size-4 stroke-[3]" />
              Novo Serviço
            </button>
          </div>

          {filteredServices.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#161820] border border-[#272a34] text-center">
              <Scissors className="size-10 text-gray-500 mx-auto mb-3" />
              <p className="text-white font-semibold">Nenhum serviço encontrado</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery
                  ? "Tente buscar com outro termo."
                  : "Clique em '+ Novo Serviço' para cadastrar um serviço na barbearia."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((svc) => (
                <div
                  key={svc.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    svc.active !== false
                      ? "bg-[#161820] border-[#272a34] hover:border-[#00f0ff]/40 shadow-sm"
                      : "bg-[#14151a] border-[#22252e] opacity-60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {svc.category && (
                          <span className="px-2 py-0.5 rounded-md bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20 text-[10px] font-bold uppercase tracking-wider">
                            {svc.category}
                          </span>
                        )}
                        {svc.active === false && (
                          <span className="px-2 py-0.5 rounded-md bg-gray-700/40 text-gray-400 text-[10px] font-bold">
                            Inativo
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        {svc.name}
                      </h3>

                      {svc.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {svc.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5 text-[#00f0ff]" />
                          {formatTimeMinutes(svc.duration)}
                        </span>
                        <span>•</span>
                        <span className="font-display font-bold text-base text-[#00f0ff]">
                          {brl(svc.price)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-[#22252e] w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleToggleActive(svc)}
                        title={svc.active !== false ? "Desativar serviço" : "Ativar serviço"}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                          svc.active !== false
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                        }`}
                      >
                        {svc.active !== false ? "Ativo" : "Inativo"}
                      </button>

                      <button
                        onClick={() => handleOpenEditService(svc)}
                        className="p-2.5 rounded-xl bg-[#1e222c] hover:bg-[#282f3d] border border-[#2b303e] text-white hover:text-[#00f0ff] transition"
                        title="Editar serviço"
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>

                      <button
                        onClick={() => setDeletingService(svc)}
                        className="p-2.5 rounded-xl bg-[#1e222c] hover:bg-red-500/20 border border-[#2b303e] hover:border-red-500/30 text-gray-400 hover:text-red-400 transition"
                        title="Excluir serviço"
                        aria-label="Excluir"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BARBERS */}
      {activeTab === "barbers" && (
        <div className="space-y-5 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                Equipe de Barbeiros
              </h2>
              <p className="text-xs text-gray-400">
                Profissionais habilitados para receber agendamentos
              </p>
            </div>
            <button
              onClick={() => {
                actions.saveBarber({
                  name: "Novo Barbeiro",
                  specialty: "Corte e acabamento",
                  commission: 50,
                  active: true,
                });
                showToast("Novo profissional adicionado!");
              }}
              className="h-10 px-4 rounded-xl bg-[#1e222c] hover:bg-[#282f3d] border border-[#2b303e] text-white hover:text-[#00f0ff] text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="size-3.5" /> Adicionar Barbeiro
            </button>
          </div>

          <div className="space-y-3">
            {barbers.map((b) => (
              <div
                key={b.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#161820] border border-[#272a34] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-gradient-to-br from-[#00f0ff]/20 to-[#0066cc]/20 border border-[#00f0ff]/40 flex items-center justify-center font-display font-bold text-lg text-[#00f0ff]">
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {b.name}
                      {b.id === "barber-1" && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 font-bold">
                          Principal
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400">{b.specialty}</p>
                    <p className="text-xs text-[#00f0ff] mt-0.5">
                      Comissão: {b.commission}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      const newComm = prompt(
                        `Definir nova comissão (%) para ${b.name}:`,
                        String(b.commission)
                      );
                      if (newComm !== null && !isNaN(Number(newComm))) {
                        actions.saveBarber({
                          ...b,
                          commission: Math.max(0, Math.min(100, Number(newComm))),
                        });
                        showToast(`Comissão de ${b.name} atualizada!`);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#1e222c] border border-[#2b303e] text-xs font-semibold text-gray-300 hover:text-white"
                  >
                    Ajustar Comissão
                  </button>

                  {b.id !== "barber-1" && (
                    <button
                      onClick={() => {
                        if (confirm(`Excluir barbeiro ${b.name}?`)) {
                          actions.deleteBarber(b.id);
                          showToast(`Barbeiro ${b.name} removido.`);
                        }
                      }}
                      className="p-2 rounded-lg bg-[#1e222c] text-gray-400 hover:text-red-400 border border-[#2b303e]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS / FECHAMENTO FINANCEIRO & RANKING DE SERVIÇOS */}
      {activeTab === "reports" && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-lg font-bold text-white font-display">
              Fechamento Financeiro & Estatísticas
            </h2>
            <p className="text-xs text-gray-400">
              Cálculo em tempo real com base nos atendimentos marcados como "Concluído"
            </p>
          </div>

          {/* 1. BLOCO DE RESUMO FINANCEIRO (SEMANA, MÊS, HOJE) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Hoje */}
            <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34] relative overflow-hidden">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
                Faturamento Hoje
              </span>
              <p className="font-display text-xl sm:text-2xl font-bold text-white mt-1">
                {brl(financial.todayRevenue)}
              </p>
              <span className="text-[11px] text-[#00f0ff] font-medium block mt-0.5">
                {financial.todayCount} cortes hoje
              </span>
            </div>

            {/* Esta Semana */}
            <div className="p-4 rounded-2xl bg-[#161820] border border-[#00f0ff]/30 shadow-[0_0_20px_rgba(0,240,255,0.15)] relative overflow-hidden">
              <div className="absolute top-1 right-2 text-[#00f0ff]/10">
                <TrendingUp className="size-12" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#00f0ff] block">
                Faturamento da Semana
              </span>
              <p className="font-display text-xl sm:text-2xl font-bold text-[#00f0ff] mt-1">
                {brl(financial.weekRevenue)}
              </p>
              <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
                {financial.weekCount} cortes na semana
              </span>
            </div>

            {/* Este Mês */}
            <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34] relative overflow-hidden">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
                Faturamento do Mês
              </span>
              <p className="font-display text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
                {brl(financial.monthRevenue)}
              </p>
              <span className="text-[11px] text-gray-300 font-medium block mt-0.5">
                {financial.monthCount} cortes no mês
              </span>
            </div>

            {/* Ticket Médio & Total */}
            <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
                Ticket Médio (Mês)
              </span>
              <p className="font-display text-xl sm:text-2xl font-bold text-white mt-1">
                {brl(financial.avgTicketMonth)}
              </p>
              <span className="text-[11px] text-gray-400 block mt-0.5">
                Total acumulado: {brl(financial.allTimeRevenue)}
              </span>
            </div>
          </div>

          {/* 2. CONTADOR & RANKING DOS SERVIÇOS MAIS REALIZADOS */}
          <div className="p-5 rounded-3xl bg-[#161820] border border-[#272a34] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-[#00f0ff]" />
                  <h3 className="text-base font-bold text-white font-display">
                    Serviços Mais Realizados
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Comparativo de quantidade de cortes e faturamento por serviço
                </p>
              </div>

              {/* Seletor de período para o ranking */}
              <div className="flex p-1 rounded-xl bg-[#12141a] border border-[#272a34] text-xs">
                <button
                  type="button"
                  onClick={() => setRankingPeriod("month")}
                  className={`px-3 py-1.5 rounded-lg transition font-medium ${
                    rankingPeriod === "month"
                      ? "bg-[#00f0ff] text-[#090a0f] font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => setRankingPeriod("week")}
                  className={`px-3 py-1.5 rounded-lg transition font-medium ${
                    rankingPeriod === "week"
                      ? "bg-[#00f0ff] text-[#090a0f] font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Esta Semana
                </button>
                <button
                  type="button"
                  onClick={() => setRankingPeriod("today")}
                  className={`px-3 py-1.5 rounded-lg transition font-medium ${
                    rankingPeriod === "today"
                      ? "bg-[#00f0ff] text-[#090a0f] font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setRankingPeriod("all")}
                  className={`px-3 py-1.5 rounded-lg transition font-medium ${
                    rankingPeriod === "all"
                      ? "bg-[#00f0ff] text-[#090a0f] font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Geral
                </button>
              </div>
            </div>

            {/* Destaque Comparativo (ex: Nevou + corte vs Corte navalhado) */}
            {financial.servicesRanking.length >= 2 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#17222c] to-[#14161c] border border-[#00f0ff]/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#00f0ff]/15 text-[#00f0ff] shrink-0">
                    <BarChart3 className="size-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      Comparativo de Destaque:
                    </span>
                    <p className="text-gray-300 text-[11px] mt-0.5">
                      <strong className="text-[#00f0ff]">{financial.servicesRanking[0].name}</strong> ({financial.servicesRanking[0].count} cortes · {brl(financial.servicesRanking[0].totalRevenue)})
                      {" "}versus{" "}
                      <strong className="text-white">{financial.servicesRanking[1].name}</strong> ({financial.servicesRanking[1].count} cortes · {brl(financial.servicesRanking[1].totalRevenue)})
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] font-bold text-[10px] shrink-0 border border-[#00f0ff]/20">
                  Líder: {financial.servicesRanking[0].name.split("+")[0].trim()}
                </span>
              </div>
            )}

            {/* Lista dos Serviços com Barras de Progresso */}
            <div className="space-y-3 pt-1">
              {financial.servicesRanking.map((item, idx) => (
                <div
                  key={item.serviceId}
                  className="p-3.5 rounded-2xl bg-[#12141a] border border-[#22252e] space-y-2 hover:border-[#00f0ff]/30 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0
                            ? "bg-[#00f0ff] text-[#090a0f]"
                            : idx === 1
                            ? "bg-gray-300 text-[#090a0f]"
                            : idx === 2
                            ? "bg-amber-600 text-white"
                            : "bg-[#272a34] text-gray-400"
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-white truncate block">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Preço unitário: {brl(item.price)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-display font-bold text-sm sm:text-base text-[#00f0ff] block">
                        {item.count} {item.count === 1 ? "atendimento" : "atendimentos"}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        {brl(item.totalRevenue)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progresso proporcional */}
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-[#1c202a] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] to-[#0088ff] transition-all duration-500"
                        style={{ width: `${Math.max(item.percentage, item.count > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Representatividade</span>
                      <span>{item.percentage}% dos cortes concluídos</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico recente */}
          <div className="p-5 rounded-2xl bg-[#161820] border border-[#272a34]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Últimos Atendimentos Registrados
            </h3>
            <div className="divide-y divide-[#22252e]">
              {appointments.slice(0, 8).map((a) => {
                const svc = services.find((s) => s.id === a.serviceId);
                const barber = barbers.find((b) => b.id === a.barberId);
                return (
                  <div
                    key={a.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{a.clientName}</p>
                      <p className="text-xs text-gray-400">
                        {svc?.name || "Serviço"} • Barbeiro: {barber?.name || "Juninho"} •{" "}
                        {formatDateBR(a.date)} às {a.time}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-[#00f0ff] text-sm">
                        {brl(svc?.price || 0)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          a.status === "concluido"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : a.status === "agendado"
                            ? "bg-[#00f0ff]/20 text-[#00f0ff]"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS & SAAS MULTI-TENANT PREPARATION */}
      {activeTab === "settings" && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-lg font-bold text-white font-display">
              Segurança & Arquitetura SaaS
            </h2>
            <p className="text-xs text-gray-400">
              Controle de acesso do admin e preparação para múltiplos barbeiros / Supabase
            </p>
          </div>

          {settingsSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="size-4" /> Alterações salvas com sucesso!
            </div>
          )}

          {/* 1. Formulário de Credenciais */}
          <form
            onSubmit={handleSaveSettings}
            className="p-5 sm:p-6 rounded-2xl bg-[#161820] border border-[#272a34] space-y-4"
          >
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Acesso Exclusivo do Administrador
            </h3>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                E-mail do Administrador
              </label>
              <input
                type="email"
                required
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-4 text-white text-sm focus:outline-none focus:border-[#00f0ff]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Senha de Acesso
                </label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-4 text-white text-sm focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  PIN Rápido (4 Dígitos)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-4 text-white text-sm focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-[#090a0f] font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:brightness-110 transition active:scale-95"
            >
              Salvar Novas Credenciais
            </button>
          </form>

          {/* 2. BLOCO SAAS MULTI-TENANT & SUPABASE PREPARATION */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#161820] border border-[#272a34] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="size-5 text-[#00f0ff]" />
                <h3 className="text-base font-bold text-white font-display">
                  Preparação SaaS & Supabase (Multi-Tenant)
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
                Pronto para SaaS
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              O sistema já está arquitetado com separação de dados por{" "}
              <code className="text-[#00f0ff] bg-[#12141a] px-1.5 py-0.5 rounded">tenantId</code>{" "}
              e <code className="text-[#00f0ff] bg-[#12141a] px-1.5 py-0.5 rounded">barberId</code>.
              Atualmente opera em modo autônomo offline/localStorage sem falhas, e pode ser reconectado
              ao seu próprio projeto Supabase a qualquer momento.
            </p>

            {/* Tenant details */}
            <div className="p-3.5 rounded-xl bg-[#12141a] border border-[#22252e] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Tenant ID</span>
                <span className="font-mono text-white text-[11px]">{DEFAULT_TENANT_ID}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Barbearia</span>
                <span className="font-bold text-white">{SHOP.name}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Capacidade Barbeiros</span>
                <span className="text-[#00f0ff] font-semibold">Até 5 barbeiros (Plano Pro)</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Armazenamento Atual</span>
                <span className="text-emerald-400 font-semibold">Local Seguro (Sem travas)</span>
              </div>
            </div>

            {/* Supabase Connection Inputs */}
            <div className="space-y-3 pt-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-white">
                Reconexão com Supabase Próprio (Opcional):
              </span>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  URL do Supabase (ex: https://xyz.supabase.co)
                </label>
                <input
                  type="text"
                  placeholder="https://seu-projeto.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#1c202a] border border-[#2b303e] px-3 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Chave Pública Anon (Publishable Key)
                </label>
                <input
                  type="password"
                  placeholder="sb_publishable_..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#1c202a] border border-[#2b303e] px-3 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              {supabaseTestFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    supabaseTestFeedback.success
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/15 border border-red-500/30 text-red-300"
                  }`}
                >
                  {supabaseTestFeedback.success ? (
                    <CheckCircle className="size-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0" />
                  )}
                  <span>{supabaseTestFeedback.message}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  disabled={testingSupabase}
                  onClick={handleTestSupabase}
                  className="flex-1 h-10 rounded-xl bg-[#1e222c] hover:bg-[#282f3d] border border-[#2b303e] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                >
                  <Database className="size-3.5 text-[#00f0ff]" />
                  {testingSupabase ? "Testando conexão..." : "Testar e Salvar Conexão Supabase"}
                </button>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="h-10 px-4 rounded-xl bg-[#12141a] hover:bg-[#1a1d24] border border-[#272a34] text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-1.5 transition"
                >
                  {copiedSql ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" />
                      <span className="text-emerald-400">SQL Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-[#00f0ff]" />
                      <span>Copiar Schema SQL para o Supabase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Dados da Barbearia info box */}
          <div className="p-4 rounded-2xl bg-[#14161c] border border-[#272a34] text-xs text-gray-400 space-y-1.5">
            <p className="font-bold text-white text-sm mb-2">Informações Cadastradas:</p>
            <p>
              • <strong>Nome:</strong> {SHOP.name} (Fundada em {SHOP.founded})
            </p>
            <p>
              • <strong>WhatsApp:</strong> {SHOP.phoneDisplay}
            </p>
            <p>
              • <strong>Horários:</strong> {SHOP.hours}
            </p>
            <p>
              • <strong>Pausa de Almoço:</strong> {SHOP.lunchBreak} (Bloqueada automaticamente no agendamento)
            </p>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SERVICE */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        service={editingService}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
        onSave={handleSaveService}
      />

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setDeletingService(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#161820] p-6 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="size-6" />
            </div>
            <h3 className="text-xl font-bold font-display">Excluir Serviço?</h3>
            <p className="text-sm text-gray-300 mt-2">
              Tem certeza de que deseja remover o serviço{" "}
              <strong className="text-white">"{deletingService.name}"</strong>?
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Ele deixará de aparecer para os clientes na tela de agendamento online.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingService(null)}
                className="h-11 rounded-xl bg-[#1e222c] border border-[#2b303e] text-gray-300 font-semibold text-xs hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-lg transition active:scale-95"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE APPOINTMENT CONFIRMATION */}
      {deletingAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setDeletingAppointment(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#161820] p-6 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <Trash2 className="size-6" />
            </div>
            <h3 className="text-xl font-bold font-display">Excluir Agendamento?</h3>
            <p className="text-sm text-gray-300 mt-2">
              Deseja realmente remover o agendamento de{" "}
              <strong className="text-white">"{deletingAppointment.clientName}"</strong> em{" "}
              <strong className="text-[#00f0ff]">{formatDateBR(deletingAppointment.date)} às {deletingAppointment.time}</strong>?
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Esta ação removerá o agendamento permanentemente da base do Supabase em nuvem.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingAppointment(null)}
                className="h-11 rounded-xl bg-[#1e222c] border border-[#2b303e] text-gray-300 font-semibold text-xs hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAppt}
                className="h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-lg transition active:scale-95"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO AGENDAMENTO RÁPIDO ADMIN */}
      {isAddApptModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsAddApptModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-[#272a34] bg-[#161820] p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#272a34] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff]">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white">
                    Novo Agendamento na Barbearia
                  </h3>
                  <p className="text-xs text-gray-400">
                    Cadastrar cliente manualmente direto no Supabase
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddApptModalOpen(false)}
                className="p-2 rounded-xl bg-[#1e222c] hover:bg-[#282f3d] text-gray-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualAppt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={newApptClientName}
                  onChange={(e) => setNewApptClientName(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-4 text-white text-sm focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 84994571579"
                  value={newApptClientPhone}
                  onChange={(e) => setNewApptClientPhone(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-4 text-white text-sm focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Serviço Desejado *
                  </label>
                  <select
                    value={newApptServiceId}
                    onChange={(e) => setNewApptServiceId(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-3 text-white text-xs focus:outline-none focus:border-[#00f0ff]"
                  >
                    {services
                      .filter((s) => s.active !== false)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({brl(s.price)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Barbeiro *
                  </label>
                  <select
                    value={newApptBarberId}
                    onChange={(e) => setNewApptBarberId(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-3 text-white text-xs focus:outline-none focus:border-[#00f0ff]"
                  >
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={newApptDate}
                    onChange={(e) => setNewApptDate(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-3 text-white text-xs focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Horário *
                  </label>
                  <select
                    value={newApptTime}
                    onChange={(e) => setNewApptTime(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-3 text-white text-xs focus:outline-none focus:border-[#00f0ff]"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Observações / Preferências (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Prefere degradê na zero alta"
                  value={newApptNotes}
                  onChange={(e) => setNewApptNotes(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#1c202a] border border-[#2b303e] px-4 text-white text-xs focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddApptModalOpen(false)}
                  className="h-11 rounded-xl bg-[#1e222c] border border-[#2b303e] text-gray-300 font-semibold text-xs hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-[#090a0f] font-bold text-xs shadow-lg hover:brightness-110 transition active:scale-95"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  service,
  barber,
  onSetStatus,
  onDelete,
  showDateBadge,
}: {
  appointment: Appointment;
  service?: Service;
  barber?: Barber;
  onSetStatus: (id: string, status: Status) => void;
  onDelete: (appointment: Appointment) => void;
  showDateBadge?: boolean;
}) {
  const statusCfg = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.agendado;

  const whatsappMessage = `Olá, ${appointment.clientName}! Aqui é da barbearia ${SHOP.name}. Passando para confirmar seu agendamento no dia ${formatDateBR(appointment.date)} às ${appointment.time}${service ? ` para ${service.name}` : ""}. Tudo confirmado?`;
  const whatsappUrl = buildWhatsappLink(appointment.clientPhone, whatsappMessage);

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        appointment.status === "concluido"
          ? "bg-[#14191d] border-emerald-500/25"
          : appointment.status === "cancelado"
          ? "bg-[#14151a] border-[#22252e] opacity-60"
          : appointment.status === "faltou"
          ? "bg-[#1b1418] border-red-500/25"
          : "bg-[#161820] border-[#272a34] hover:border-[#00f0ff]/40 shadow-sm"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Left: Time, Client info, Service details */}
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Time & Duration badge */}
          <div className="text-center bg-[#1c202a] border border-[#2b303e] rounded-xl px-2.5 py-2 shrink-0 min-w-[62px]">
            <span className="text-sm font-bold font-mono text-[#00f0ff] block leading-none">
              {appointment.time}
            </span>
            <span className="text-[10px] text-gray-400 mt-1 block font-mono">
              {service?.duration ? `${service.duration}m` : "30m"}
            </span>
          </div>

          <div className="min-w-0">
            {/* Date badge if showDateBadge */}
            {showDateBadge && (
              <span className="inline-block text-[10px] font-bold uppercase text-[#00f0ff] bg-[#00f0ff]/10 px-2 py-0.5 rounded border border-[#00f0ff]/20 mb-1">
                {formatDateBR(appointment.date)} ({appointment.date.split("-").reverse().join("/")})
              </span>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white leading-snug">
                {appointment.clientName}
              </h3>
              {barber && (
                <span className="text-[10px] text-gray-400 bg-[#1e222c] px-2 py-0.5 rounded-md border border-[#272a34]">
                  {barber.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 flex-wrap">
              <a
                href={`tel:${appointment.clientPhone}`}
                className="hover:text-[#00f0ff] flex items-center gap-1 font-mono transition"
                title="Ligar para o cliente"
              >
                <Phone className="size-3 text-gray-400" />
                {appointment.clientPhone}
              </a>
              <span>•</span>
              <span className="text-white font-semibold">
                {service?.name || "Serviço"}
              </span>
              <span>•</span>
              <span className="font-display font-bold text-[#00f0ff]">
                {brl(service?.price || 0)}
              </span>
            </div>

            {appointment.notes && (
              <p className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 mt-2 inline-block">
                💬 <em>"{appointment.notes}"</em>
              </p>
            )}
          </div>
        </div>

        {/* Right: Status badge */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
          >
            <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-3 pt-3 border-t border-[#22252e]">
        {/* WhatsApp Link */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-medium transition py-1"
        >
          <MessageCircle className="size-4 text-emerald-400" />
          <span>Confirmar via WhatsApp</span>
        </a>

        {/* Status Actions */}
        <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
          {appointment.status === "agendado" && (
            <>
              <button
                onClick={() => onSetStatus(appointment.id, "concluido")}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                title="Confirmar e concluir atendimento"
              >
                <Check className="size-3.5" />
                Confirmar / Concluir
              </button>

              <button
                onClick={() => onSetStatus(appointment.id, "faltou")}
                className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1 transition"
                title="Marcar que o cliente não compareceu"
              >
                <UserX className="size-3.5" />
                Falta
              </button>

              <button
                onClick={() => onSetStatus(appointment.id, "cancelado")}
                className="px-2.5 py-1.5 rounded-xl bg-[#1e222c] hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-medium transition"
                title="Cancelar agendamento"
              >
                <X className="size-3.5" />
                Cancelar
              </button>
            </>
          )}

          {appointment.status === "concluido" && (
            <button
              onClick={() => onSetStatus(appointment.id, "agendado")}
              className="px-2.5 py-1.5 rounded-xl bg-[#1e222c] hover:bg-[#252b37] border border-[#2b303e] text-gray-300 hover:text-[#00f0ff] text-xs font-medium flex items-center gap-1 transition"
              title="Reabrir horário como agendado"
            >
              <RotateCcw className="size-3" />
              Reabrir
            </button>
          )}

          {(appointment.status === "cancelado" || appointment.status === "faltou") && (
            <button
              onClick={() => onSetStatus(appointment.id, "agendado")}
              className="px-2.5 py-1.5 rounded-xl bg-[#1e222c] hover:bg-[#252b37] border border-[#2b303e] text-[#00f0ff] text-xs font-medium flex items-center gap-1 transition"
              title="Reativar agendamento"
            >
              <RotateCcw className="size-3" />
              Reativar Horário
            </button>
          )}

          {/* Delete Appointment Button */}
          <button
            onClick={() => onDelete(appointment)}
            className="p-1.5 rounded-xl bg-[#1e222c] hover:bg-red-500/20 border border-[#2b303e] hover:border-red-500/30 text-gray-400 hover:text-red-400 transition"
            title="Excluir agendamento"
            aria-label="Excluir agendamento"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

