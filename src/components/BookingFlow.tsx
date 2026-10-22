import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  MessageCircle,
  Scissors,
  Sparkles,
  User,
  Phone,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  CalendarPlus,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  actions,
  brl,
  buildWhatsappLink,
  buildGoogleCalendarLink,
  formatDateBR,
  formatTimeMinutes,
  isOpenDate,
  isWithinOpeningHours,
  isSlotInPast,
  isDayExpeditedPassed,
  getNextAvailableBookingDate,
  isDateToday,
  getRelativeDateISO,
  SHOP,
  takenSlots,
  TIME_SLOTS,
  todayISO,
  useStore,
} from "../lib/store";
import type { Appointment, Service, Barber } from "../types";
import { BrandLogo } from "./ui/BrandLogo";

interface BookingFlowProps {
  onBackToHome: () => void;
}

const STEPS = ["Serviço", "Barbeiro", "Horário", "Seus Dados"];

export function BookingFlow({ onBackToHome }: BookingFlowProps) {
  const { services, barbers, appointments } = useStore((s) => s);

  // Active services only for booking
  const activeServices = services.filter((s) => s.active !== false);

  const [step, setStep] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    activeServices[0]?.id || ""
  );
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    barbers[0]?.id || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getNextAvailableBookingDate()
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedBarber = barbers.find((b) => b.id === selectedBarberId);

  // Taken slots for the chosen barber on chosen date
  const taken = useMemo(() => {
    if (!selectedBarberId || !selectedDate) return new Set<string>();
    return takenSlots(appointments, selectedBarberId, selectedDate);
  }, [appointments, selectedBarberId, selectedDate]);

  // Validation per step
  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(selectedServiceId);
      case 1:
        return Boolean(selectedBarberId);
      case 2:
        return Boolean(
          selectedTime &&
          isOpenDate(selectedDate) &&
          !isSlotInPast(selectedDate, selectedTime) &&
          !isDayExpeditedPassed(selectedDate)
        );
      case 3:
        return (
          clientName.trim().length >= 2 &&
          clientPhone.replace(/\D/g, "").length >= 10
        );
      default:
        return false;
    }
  }, [
    step,
    selectedServiceId,
    selectedBarberId,
    selectedDate,
    selectedTime,
    clientName,
    clientPhone,
  ]);

  const handleNext = () => {
    setBookingError(null);
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    // Submit booking
    if (!selectedService || !selectedBarber || !selectedTime) return;

    if (!isOpenDate(selectedDate)) {
      setBookingError("A barbearia não abre aos domingos. Selecione outro dia.");
      return;
    }

    if (selectedDate < todayISO()) {
      setBookingError("Não é possível realizar agendamentos para datas passadas.");
      return;
    }

    if (isDayExpeditedPassed(selectedDate)) {
      setBookingError(
        "O expediente de hoje já foi encerrado (atendimentos até às 19h). Por favor, selecione outro dia."
      );
      return;
    }

    if (isSlotInPast(selectedDate, selectedTime)) {
      setBookingError(
        "O horário selecionado já encerrou para hoje. Por favor, selecione um horário futuro."
      );
      return;
    }

    try {
      const appt = actions.addAppointment({
        serviceId: selectedService.id,
        barberId: selectedBarber.id,
        date: selectedDate,
        time: selectedTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        notes: notes.trim(),
      });
      setBookingSuccess(appt);
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Erro ao realizar agendamento."
      );
    }
  };

  const handleDateChange = (daysDelta: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + daysDelta);

    // Skip past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj < today) return;

    const ny = dateObj.getFullYear();
    const nm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const nd = String(dateObj.getDate()).padStart(2, "0");
    const nextDateStr = `${ny}-${nm}-${nd}`;

    setSelectedDate(nextDateStr);
    setSelectedTime("");
  };

  // WhatsApp message generation
  const buildSuccessMessage = (appt: Appointment) => {
    const svc = services.find((s) => s.id === appt.serviceId);
    const bar = barbers.find((b) => b.id === appt.barberId);
    return `Olá, ${SHOP.name}! Acabei de solicitar um agendamento:\n\n✂️ *${svc?.name}* (${brl(svc?.price || 0)})\n💈 *Profissional:* ${bar?.name}\n📅 *Data:* ${formatDateBR(appt.date)} às ${appt.time}\n👤 *Cliente:* ${appt.clientName} (${appt.clientPhone})\n\nPor favor, confirmem meu horário!`;
  };

  // Formatter for Phone Input
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) {
      setClientPhone(digits);
    } else if (digits.length <= 7) {
      setClientPhone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else {
      setClientPhone(
        `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
      );
    }
  };

  // SUCCESS SCREEN
  if (bookingSuccess && selectedService && selectedBarber) {
    const whatsappUrl = buildWhatsappLink(
      SHOP.whatsapp,
      buildSuccessMessage(bookingSuccess)
    );

    return (
      <div className="min-h-screen pb-28 pt-8 px-4 sm:px-6 max-w-lg mx-auto flex flex-col items-center text-center">
        <BrandLogo size="xl" className="mb-4" />

        <div className="size-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-2">
          <Check className="size-8 stroke-[2.5]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-display text-white mt-2">
          Horário Pré-Agendado!
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-2">
          Para garantir sua vaga na agenda, envie a confirmação direta para o
          WhatsApp do <strong className="text-white">{SHOP.name}</strong>.
        </p>

        {/* Summary Card */}
        <div className="w-full mt-6 p-5 rounded-2xl bg-[#161820] border border-[#272a34] text-left space-y-3">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-[#22252e]">
            <span className="text-gray-400">Serviço Selecionado:</span>
            <span className="font-bold text-white">{selectedService.name}</span>
          </div>
          <div className="flex justify-between items-center text-xs pb-2 border-b border-[#22252e]">
            <span className="text-gray-400">Valor:</span>
            <span className="font-display font-bold text-base text-[#00f0ff]">
              {brl(selectedService.price)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs pb-2 border-b border-[#22252e]">
            <span className="text-gray-400">Barbeiro:</span>
            <span className="font-bold text-white">{selectedBarber.name}</span>
          </div>
          <div className="flex justify-between items-center text-xs pb-2 border-b border-[#22252e]">
            <span className="text-gray-400">Data e Horário:</span>
            <span className="font-bold text-[#00f0ff]">
              {formatDateBR(bookingSuccess.date)} às {bookingSuccess.time}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Cliente:</span>
            <span className="font-bold text-white">
              {bookingSuccess.clientName} ({bookingSuccess.clientPhone})
            </span>
          </div>
        </div>

        {/* CTA Buttons Group */}
        <div className="w-full mt-6 space-y-3">
          {/* 1. WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 text-white font-bold text-sm shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
          >
            <MessageCircle className="size-5 fill-current" />
            Enviar Confirmação no WhatsApp
          </a>

          {/* 2. Google Calendar Button */}
          <a
            href={buildGoogleCalendarLink(
              bookingSuccess,
              selectedService,
              selectedBarber
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-2xl bg-[#1e2330] hover:bg-[#252b3b] border border-[#00f0ff]/40 text-[#00f0ff] font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <CalendarPlus className="size-4" />
            <span>Adicionar ao Google Calendar</span>
            <ExternalLink className="size-3.5 opacity-60 ml-0.5" />
          </a>

          {/* 3. Download .ICS button for Apple Calendar / Outlook */}
          <button
            type="button"
            onClick={() => {
              if (!bookingSuccess || !selectedService || !selectedBarber) return;
              const [y, m, d] = bookingSuccess.date.split("-");
              const [hh, mm] = bookingSuccess.time.split(":");
              const startStr = `${y}${m}${d}T${hh}${mm}00`;
              const dur = selectedService.duration || 30;
              const sDt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
              const eDt = new Date(sDt.getTime() + dur * 60000);
              const ey = eDt.getFullYear();
              const em = String(eDt.getMonth() + 1).padStart(2, "0");
              const ed = String(eDt.getDate()).padStart(2, "0");
              const eh = String(eDt.getHours()).padStart(2, "0");
              const emin = String(eDt.getMinutes()).padStart(2, "0");
              const endStr = `${ey}${em}${ed}T${eh}${emin}00`;

              const icsContent = [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//Junin Barbeiro//Agendamento//PT",
                "BEGIN:VEVENT",
                `SUMMARY:Junin Barbeiro - ${selectedService.name}`,
                `DESCRIPTION:Agendamento com ${selectedBarber.name} na barbearia Junin Barbeiro.\\nServiço: ${selectedService.name}\\nValor: R$ ${selectedService.price.toFixed(2)}`,
                `DTSTART:${startStr}`,
                `DTEND:${endStr}`,
                `LOCATION:${SHOP.name}, ${SHOP.address || "Centro"}`,
                "STATUS:CONFIRMED",
                "END:VEVENT",
                "END:VCALENDAR",
              ].join("\r\n");

              const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `agendamento-junin-${bookingSuccess.date}.ics`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="w-full py-2.5 text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1.5 transition"
          >
            <Download className="size-3.5" />
            <span>Baixar para Apple Calendar / Outlook (.ics)</span>
          </button>
        </div>

        {/* Action back */}
        <button
          onClick={() => {
            setBookingSuccess(null);
            setStep(0);
            setSelectedTime("");
            setClientName("");
            setClientPhone("");
            onBackToHome();
          }}
          className="mt-4 text-xs font-semibold text-gray-400 hover:text-white transition"
        >
          Voltar para a Página Inicial
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 pt-4 px-4 sm:px-6 max-w-lg mx-auto">
      {/* Top bar with back and step counter */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            if (step > 0) setStep(step - 1);
            else onBackToHome();
          }}
          className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1d24] transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="size-4" />
          {step > 0 ? "Passo Anterior" : "Início"}
        </button>

        <span className="text-xs font-bold text-[#00f0ff] uppercase tracking-wider">
          Passo {step + 1} de {STEPS.length}
        </span>
      </div>

      {/* Centered Brand Header for Client Booking */}
      <div className="flex flex-col items-center text-center my-3 pb-2">
        <BrandLogo size="lg" className="mb-2.5" />
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
          Agendamento Online
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {SHOP.name} • Reserve seu horário com Juninho
        </p>
      </div>

      {/* Step Indicator Progress Bar */}
      <div className="grid grid-cols-4 gap-1.5 mb-6">
        {STEPS.map((stepName, i) => (
          <div key={stepName} className="space-y-1">
            <div
              className={`h-1.5 rounded-full transition-all ${
                i <= step
                  ? "bg-gradient-to-r from-[#00f0ff] to-[#0099ff]"
                  : "bg-[#272a34]"
              }`}
            />
            <span
              className={`text-[10px] block truncate ${
                i === step
                  ? "text-[#00f0ff] font-bold"
                  : i < step
                  ? "text-gray-400 font-medium"
                  : "text-gray-600"
              }`}
            >
              {stepName}
            </span>
          </div>
        ))}
      </div>

      {bookingError && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{bookingError}</span>
        </div>
      )}

      {/* STEP 0: CHOOSE SERVICE */}
      {step === 0 && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
              Escolha seu Serviço
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Serviços e valores oficiais atualizados da barbearia
            </p>
          </div>

          <div className="space-y-2.5">
            {activeServices.map((svc) => {
              const isSelected = svc.id === selectedServiceId;
              return (
                <div
                  key={svc.id}
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-[#172635] to-[#121c25] border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.25)] scale-[1.01]"
                      : "bg-[#161820] border-[#272a34] hover:border-gray-600 hover:bg-[#1a1d26]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {svc.category && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#00f0ff] block mb-0.5">
                          {svc.category}
                        </span>
                      )}
                      <h3 className="text-base font-bold text-white">
                        {svc.name}
                      </h3>
                      {svc.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {svc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <Clock className="size-3.5 text-[#00f0ff]" />
                        <span>{formatTimeMinutes(svc.duration)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-display font-bold text-lg text-[#00f0ff] block">
                        {brl(svc.price)}
                      </span>
                      <div
                        className={`size-6 rounded-full border mt-2 flex items-center justify-center ml-auto transition ${
                          isSelected
                            ? "bg-[#00f0ff] border-[#00f0ff] text-[#090a0f]"
                            : "border-gray-600"
                        }`}
                      >
                        {isSelected && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: CHOOSE BARBER */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
              Escolha o Barbeiro
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Profissional de sua preferência
            </p>
          </div>

          <div className="space-y-2.5">
            {barbers
              .filter((b) => b.active)
              .map((b) => {
                const isSelected = b.id === selectedBarberId;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBarberId(b.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-gradient-to-r from-[#172635] to-[#121c25] border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                        : "bg-[#161820] border-[#272a34] hover:bg-[#1a1d26]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="size-14 rounded-full bg-gradient-to-br from-[#00f0ff]/20 to-[#0066cc]/20 border border-[#00f0ff]/40 flex items-center justify-center font-display font-bold text-xl text-[#00f0ff]">
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                          {b.name}
                          {b.id === "barber-1" && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 font-bold">
                              Oficial
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-400">{b.specialty}</p>
                      </div>
                    </div>

                    <div
                      className={`size-6 rounded-full border flex items-center justify-center transition ${
                        isSelected
                          ? "bg-[#00f0ff] border-[#00f0ff] text-[#090a0f]"
                          : "border-gray-600"
                      }`}
                    >
                      {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* STEP 2: CHOOSE DATE & TIME */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
              Data e Horário
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {SHOP.hours} • Fechado aos domingos
            </p>
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { label: "Hoje", date: todayISO(), isToday: true },
              { label: "Amanhã", date: getRelativeDateISO(1) },
              { label: "Depois de Amanhã", date: getRelativeDateISO(2) },
              { label: "+3 Dias", date: getRelativeDateISO(3) },
            ].map((pill) => {
              const isSelected = selectedDate === pill.date;
              const isSunday = !isOpenDate(pill.date);
              const isTodayClosed = pill.isToday && isDayExpeditedPassed(pill.date);

              return (
                <button
                  key={pill.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(pill.date);
                    setSelectedTime("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#00f0ff] text-[#090a0f] font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                      : isTodayClosed
                      ? "bg-[#181a22] text-amber-400/80 border border-amber-500/30 hover:bg-[#1f222c]"
                      : isSunday
                      ? "bg-[#14151c] text-gray-500 border border-[#20232d] hover:bg-[#1a1d26]"
                      : "bg-[#161820] text-gray-300 border border-[#272a34] hover:bg-[#1f232e] hover:text-white"
                  }`}
                >
                  <span>{pill.label}</span>
                  {isTodayClosed && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Encerrado
                    </span>
                  )}
                  {isSunday && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                      Fechado
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Date Selector */}
          <div className="p-3.5 rounded-2xl bg-[#161820] border border-[#272a34]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={selectedDate <= todayISO()}
                onClick={() => handleDateChange(-1)}
                className={`p-2 rounded-xl text-gray-300 transition ${
                  selectedDate <= todayISO()
                    ? "opacity-30 cursor-not-allowed bg-transparent"
                    : "bg-[#1e222c] hover:bg-[#282f3d] hover:text-white"
                }`}
                title={
                  selectedDate <= todayISO()
                    ? "Não é possível selecionar datas passadas"
                    : "Dia anterior"
                }
              >
                <ChevronLeft className="size-4" />
              </button>

              <div className="text-center">
                <span className="text-xs font-bold text-[#00f0ff] block">
                  {formatDateBR(selectedDate)}
                  {isDateToday(selectedDate) && " (Hoje)"}
                </span>
                <span className="text-[11px] text-gray-400 font-mono">
                  {selectedDate.split("-").reverse().join("/")}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleDateChange(1)}
                className="p-2 rounded-xl bg-[#1e222c] hover:bg-[#282f3d] text-gray-300 hover:text-white transition"
                title="Próximo dia"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {!isOpenDate(selectedDate) && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center flex items-center justify-center gap-1.5">
                <AlertCircle className="size-4 shrink-0 text-red-400" />
                <span>A barbearia não abre aos domingos. Selecione outro dia.</span>
              </div>
            )}
          </div>

          {/* Expediente de hoje já encerrado */}
          {isOpenDate(selectedDate) &&
            isDateToday(selectedDate) &&
            isDayExpeditedPassed(selectedDate) && (
              <div className="p-5 rounded-2xl bg-[#171a24] border border-amber-500/30 text-center space-y-3 animate-in fade-in">
                <div className="size-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <Clock className="size-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-display">
                    Expediente de Hoje Encerrado
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    O horário de funcionamento para hoje encerrou (último atendimento às 18h). Escolha o próximo dia útil disponível para garantir sua vaga.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextDate = getNextAvailableBookingDate();
                    setSelectedDate(nextDate);
                    setSelectedTime("");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-[#090a0f] font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:brightness-110 transition active:scale-95"
                >
                  <Calendar className="size-4" />
                  <span>
                    Agendar para {formatDateBR(getNextAvailableBookingDate())}
                  </span>
                </button>
              </div>
            )}

          {/* Time Slots Grid (only if open date and day is not fully passed) */}
          {isOpenDate(selectedDate) && !isDayExpeditedPassed(selectedDate) && (
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Horários Disponíveis (Intervalos de 1h • Almoço: 12h–14h)
                </span>
                <p className="text-[11px] text-gray-500">
                  {isDateToday(selectedDate)
                    ? "Horários passados do dia já estão bloqueados automaticamente."
                    : "Toque no horário desejado para prosseguir com seu agendamento:"}
                </p>
              </div>

              {/* Turno da Manhã */}
              <div className="p-3.5 rounded-2xl bg-[#14161f] border border-[#232734]">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#00f0ff]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                      Manhã (08h às 12h)
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">4 opções</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.filter((t) => t < "12:00").map((timeSlot) => {
                    const isTaken = taken.has(timeSlot);
                    const isPast = isSlotInPast(selectedDate, timeSlot);
                    const isSelected = selectedTime === timeSlot;
                    const isValidHour = isWithinOpeningHours(
                      selectedDate,
                      timeSlot,
                      selectedService?.duration || 30
                    );
                    const disabled = isTaken || !isValidHour || isPast;

                    return (
                      <button
                        key={timeSlot}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedTime(timeSlot)}
                        title={
                          isPast
                            ? "Horário já encerrado para hoje"
                            : isTaken
                            ? "Horário já reservado"
                            : timeSlot
                        }
                        className={`h-12 rounded-xl text-xs font-bold font-mono transition relative flex flex-col items-center justify-center ${
                          isSelected
                            ? "bg-[#00f0ff] text-[#090a0f] shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-105"
                            : isPast
                            ? "bg-[#111319] text-gray-600 border border-[#1b1e26] cursor-not-allowed opacity-50"
                            : isTaken
                            ? "bg-[#14151a] text-gray-600 border border-[#1e2129] cursor-not-allowed line-through"
                            : "bg-[#1c202a] text-gray-300 border border-[#2b303e] hover:border-[#00f0ff] hover:text-white"
                        }`}
                      >
                        <span>{timeSlot}</span>
                        {isPast && (
                          <span className="text-[8px] font-sans font-normal text-gray-500 leading-none">
                            Encerrado
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Turno da Tarde & Noite */}
              <div className="p-3.5 rounded-2xl bg-[#14161f] border border-[#232734]">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#0099ff]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                      Tarde & Noite (14h às 19h)
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">5 opções (inclui 18h)</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {TIME_SLOTS.filter((t) => t >= "12:00").map((timeSlot) => {
                    const isTaken = taken.has(timeSlot);
                    const isPast = isSlotInPast(selectedDate, timeSlot);
                    const isSelected = selectedTime === timeSlot;
                    const isValidHour = isWithinOpeningHours(
                      selectedDate,
                      timeSlot,
                      selectedService?.duration || 30
                    );
                    const disabled = isTaken || !isValidHour || isPast;

                    return (
                      <button
                        key={timeSlot}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedTime(timeSlot)}
                        title={
                          isPast
                            ? "Horário já encerrado para hoje"
                            : isTaken
                            ? "Horário já reservado"
                            : timeSlot
                        }
                        className={`h-12 rounded-xl text-xs font-bold font-mono transition relative flex flex-col items-center justify-center ${
                          isSelected
                            ? "bg-[#00f0ff] text-[#090a0f] shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-105"
                            : isPast
                            ? "bg-[#111319] text-gray-600 border border-[#1b1e26] cursor-not-allowed opacity-50"
                            : isTaken
                            ? "bg-[#14151a] text-gray-600 border border-[#1e2129] cursor-not-allowed line-through"
                            : "bg-[#1c202a] text-gray-300 border border-[#2b303e] hover:border-[#00f0ff] hover:text-white"
                        }`}
                      >
                        <span>{timeSlot}</span>
                        {isPast && (
                          <span className="text-[8px] font-sans font-normal text-gray-500 leading-none">
                            Encerrado
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#00f0ff]" />
                  Disponível
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-gray-600" />
                  Ocupado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-gray-700" />
                  Encerrado / Passado
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: CLIENT DETAILS */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
              Seus Dados
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Sem burocracia ou senha: apenas seu nome e WhatsApp
            </p>
          </div>

          {/* Quick Recap */}
          <div className="p-3.5 rounded-xl bg-[#161820] border border-[#272a34] text-xs text-gray-300 space-y-1">
            <p>
              ✂️ <strong>Serviço:</strong> {selectedService?.name} (
              {brl(selectedService?.price || 0)})
            </p>
            <p>
              💈 <strong>Barbeiro:</strong> {selectedBarber?.name}
            </p>
            <p>
              📅 <strong>Quando:</strong> {formatDateBR(selectedDate)} às{" "}
              {selectedTime}
            </p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Seu Nome Completo *
              </label>
              <div className="relative">
                <User className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full h-12 rounded-xl bg-[#161820] border border-[#272a34] pl-10 pr-4 text-white text-sm focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Seu WhatsApp com DDD *
              </label>
              <div className="relative">
                <Phone className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  required
                  placeholder="(84) 99999-9999"
                  value={clientPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full h-12 rounded-xl bg-[#161820] border border-[#272a34] pl-10 pr-4 text-white text-sm focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Observação para o barbeiro (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Quero navalhado bem disfarçado"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#161820] border border-[#272a34] px-4 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Button */}
      <div className="mt-8 pt-4 border-t border-[#272a34]">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="w-full h-13 rounded-2xl bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-[#090a0f] font-bold text-sm shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:brightness-110 transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {step === 3 ? (
            <>
              <Check className="size-4 stroke-[3]" />
              Confirmar Agendamento
            </>
          ) : (
            <>
              <span>Avançar</span>
              <ChevronRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
