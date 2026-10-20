import React, { useState } from "react";
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
} from "lucide-react";
import type { Service, Barber, Appointment } from "../types";
import {
  actions,
  brl,
  formatDateBR,
  formatTimeMinutes,
  calculateFinancialSummary,
  SHOP,
  useStore,
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

interface AdminPanelProps {
  onLogout: () => void;
}

export function AdminPanel({ onLogout }: AdminPanelProps) {
  const { services, barbers, appointments, adminAuth, adminCredentials, supabaseConfig } =
    useStore((s) => s);

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<
    "services" | "barbers" | "reports" | "settings"
  >("services");

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
    </div>
  );
}
