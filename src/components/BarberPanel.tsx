import React, { useState } from "react";
import {
  Check,
  Phone,
  UserX,
  Clock,
  MessageCircle,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  actions,
  brl,
  formatDateBR,
  formatTimeMinutes,
  todayISO,
  useStore,
  buildWhatsappLink,
} from "../lib/store";
import type { Appointment, Service, Status } from "../types";
import { BrandLogo } from "./ui/BrandLogo";

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; text: string; border: string }
> = {
  agendado: {
    label: "Agendado",
    bg: "bg-[#00f0ff]/10",
    text: "text-[#00f0ff]",
    border: "border-[#00f0ff]/30",
  },
  concluido: {
    label: "Concluído",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  cancelado: {
    label: "Cancelado",
    bg: "bg-gray-800",
    text: "text-gray-400",
    border: "border-gray-700",
  },
  faltou: {
    label: "Não Compareceu",
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
  },
};

export function BarberPanel() {
  const { barbers, services, appointments } = useStore((s) => s);
  const [selectedBarberId, setSelectedBarberId] = useState(
    barbers[0]?.id || "barber-1"
  );
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const barber =
    barbers.find((b) => b.id === selectedBarberId) || barbers[0];

  const filteredAppointments = appointments
    .filter(
      (a) => a.barberId === selectedBarberId && a.date === selectedDate
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  const getService = (serviceId: string) =>
    services.find((s) => s.id === serviceId);

  // Revenue today
  const completedAppts = filteredAppointments.filter(
    (a) => a.status === "concluido"
  );
  const totalRevenue = completedAppts.reduce((sum, a) => {
    const svc = getService(a.serviceId);
    return sum + (svc?.price || 0);
  }, 0);

  const barberCommission =
    totalRevenue * ((barber?.commission ?? 100) / 100);

  // Morning (before 12:00) & Afternoon (14:00+)
  const morningList = filteredAppointments.filter((a) => a.time < "12:00");
  const afternoonList = filteredAppointments.filter((a) => a.time >= "12:00");

  const changeDay = (delta: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + delta);
    const ny = dateObj.getFullYear();
    const nm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const nd = String(dateObj.getDate()).padStart(2, "0");
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  const isToday = selectedDate === todayISO();

  return (
    <div className="min-h-screen pb-28 pt-4 px-4 sm:px-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00f0ff] px-2 py-0.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/20">
              Área do Barbeiro
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5">
              Minha Agenda Diária
            </h1>
          </div>
        </div>

        {/* Barbers list if more than one */}
        {barbers.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto">
            {barbers.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBarberId(b.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  b.id === selectedBarberId
                    ? "bg-[#00f0ff] text-[#090a0f] border-[#00f0ff] font-bold"
                    : "bg-[#181a22] text-gray-400 border-[#272a34]"
                }`}
              >
                {b.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[#161820] border border-[#272a34] mb-4">
        <button
          onClick={() => changeDay(-1)}
          className="p-2 rounded-xl bg-[#1e222c] hover:bg-[#272d3a] text-gray-300 hover:text-white transition"
          aria-label="Dia anterior"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#00f0ff]">
            <Calendar className="size-3.5" />
            {isToday ? "Hoje" : formatDateBR(selectedDate)}
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {selectedDate.split("-").reverse().join("/")}
          </p>
        </div>

        <button
          onClick={() => changeDay(1)}
          className="p-2 rounded-xl bg-[#1e222c] hover:bg-[#272d3a] text-gray-300 hover:text-white transition"
          aria-label="Próximo dia"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Financial stats of the day */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[#00f0ff]/10">
            <Sparkles className="size-10" />
          </div>
          <span className="text-xs text-gray-400 block">Faturado Hoje</span>
          <p className="font-display text-2xl font-bold text-[#00f0ff] mt-1">
            {brl(totalRevenue)}
          </p>
          <span className="text-[11px] text-emerald-400">
            {completedAppts.length} atendimentos concluídos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34]">
          <span className="text-xs text-gray-400 block">
            Minha Comissão ({barber?.commission ?? 100}%)
          </span>
          <p className="font-display text-2xl font-bold text-white mt-1">
            {brl(barberCommission)}
          </p>
          <span className="text-[11px] text-gray-400">
            {filteredAppointments.filter((a) => a.status === "agendado").length}{" "}
            pendentes
          </span>
        </div>
      </div>

      {/* Shift Sections */}
      <div className="space-y-6">
        {/* Manhã */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-[#00f0ff]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Turno da Manhã (08h às 12h)
            </h2>
            <span className="text-xs text-gray-500">
              ({morningList.length} horários)
            </span>
          </div>

          {morningList.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#14161c] border border-[#22252e] text-center text-xs text-gray-500">
              Nenhum agendamento para a manhã.
            </div>
          ) : (
            <div className="space-y-2.5">
              {morningList.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  service={getService(appt.serviceId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tarde */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-[#0099ff]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Turno da Tarde (14h às 18h)
            </h2>
            <span className="text-xs text-gray-500">
              ({afternoonList.length} horários)
            </span>
          </div>

          {afternoonList.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#14161c] border border-[#22252e] text-center text-xs text-gray-500">
              Nenhum agendamento para a tarde.
            </div>
          ) : (
            <div className="space-y-2.5">
              {afternoonList.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  service={getService(appt.serviceId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment,
  service,
}: {
  appointment: Appointment;
  service?: Service;
}) {
  const statusCfg = STATUS_CONFIG[appointment.status];

  const handleSetStatus = (newStatus: Status) => {
    actions.setAppointmentStatus(appointment.id, newStatus);
  };

  const whatsappLink = buildWhatsappLink(
    appointment.clientPhone,
    `Olá, ${appointment.clientName}! Aqui é o Juninho da Barbearia. Confirmando seu corte hoje às ${appointment.time}. Tudo certo por aí?`
  );

  return (
    <div
      className={`p-4 rounded-2xl border transition ${
        appointment.status === "concluido"
          ? "bg-[#14191d] border-emerald-500/25"
          : appointment.status === "cancelado" || appointment.status === "faltou"
          ? "bg-[#14151a] border-[#22252e] opacity-70"
          : "bg-[#161820] border-[#272a34] hover:border-[#00f0ff]/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Time & Client */}
        <div className="flex items-start gap-3">
          <div className="text-center bg-[#1c202a] border border-[#2b303e] rounded-xl px-2.5 py-1.5 shrink-0">
            <span className="text-sm font-bold font-mono text-[#00f0ff] block">
              {appointment.time}
            </span>
            <span className="text-[10px] text-gray-400">
              {service ? `${service.duration}m` : ""}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {appointment.clientName}
            </h3>
            <p className="text-xs text-[#00f0ff] font-semibold mt-0.5">
              {service?.name || "Serviço"} • {brl(service?.price || 0)}
            </p>
            {appointment.notes && (
              <p className="text-[11px] text-gray-400 mt-1 italic">
                "{appointment.notes}"
              </p>
            )}
          </div>
        </div>

        {/* Right: Status badge */}
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#22252e]">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-emerald-400 flex items-center gap-1.5 font-medium transition"
        >
          <MessageCircle className="size-3.5 text-emerald-400" />
          <span>Chamar WhatsApp</span>
        </a>

        <div className="flex items-center gap-1.5">
          {appointment.status !== "concluido" ? (
            <button
              onClick={() => handleSetStatus("concluido")}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 transition"
            >
              <Check className="size-3.5" />
              Concluir
            </button>
          ) : (
            <button
              onClick={() => handleSetStatus("agendado")}
              className="px-2 py-1 rounded-lg bg-[#1e222c] text-gray-400 hover:text-white text-xs flex items-center gap-1"
              title="Reabrir horário"
            >
              <RotateCcw className="size-3" />
              Reabrir
            </button>
          )}

          {appointment.status === "agendado" && (
            <>
              <button
                onClick={() => handleSetStatus("faltou")}
                className="px-2 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1"
                title="Marcar que o cliente não compareceu"
              >
                <UserX className="size-3.5" />
                Faltou
              </button>
              <button
                onClick={() => handleSetStatus("cancelado")}
                className="px-2 py-1.5 rounded-lg bg-[#1e222c] hover:bg-gray-800 text-gray-400 text-xs font-semibold"
                title="Cancelar agendamento"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
