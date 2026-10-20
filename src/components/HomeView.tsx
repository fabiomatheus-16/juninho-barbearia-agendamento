import React from "react";
import {
  Clock,
  MessageCircle,
  Star,
  Scissors,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  MapPin,
} from "lucide-react";
import {
  SHOP,
  brl,
  buildWhatsappLink,
  formatTimeMinutes,
  useStore,
} from "../lib/store";
import { BrandLogo } from "./ui/BrandLogo";

interface HomeViewProps {
  onGoToBooking: (serviceId?: string) => void;
  onGoToAdmin: () => void;
}

export function HomeView({ onGoToBooking, onGoToAdmin }: HomeViewProps) {
  const services = useStore((s) => s.services);
  const activeServices = services.filter((s) => s.active !== false);

  const whatsappDirect = buildWhatsappLink(
    SHOP.whatsapp,
    `Olá, ${SHOP.name}! Gostaria de tirar uma dúvida sobre os serviços e agendamentos.`
  );

  return (
    <div className="min-h-screen pb-28 pt-4 px-4 sm:px-6 max-w-lg mx-auto">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center pt-4 pb-6">
        <BrandLogo size="xl" className="mb-4" />

        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#00f0ff] px-3 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/25 mb-2">
          Barbearia Oficial desde {SHOP.founded}
        </span>

        <h1 className="text-4xl sm:text-5xl font-bold font-display text-white tracking-tight">
          {SHOP.name}
        </h1>

        <p className="mt-2 text-sm text-gray-300 max-w-xs">{SHOP.tagline}</p>

        {/* Rating */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[#00f0ff]">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-3.5 fill-[#00f0ff] text-[#00f0ff]" />
            ))}
          </div>
          <span className="font-bold">4.9</span>
          <span className="text-gray-400">· 820 avaliações de clientes</span>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => onGoToBooking()}
          className="mt-6 w-full max-w-xs h-14 rounded-2xl bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-[#050b14] font-bold text-base shadow-[0_0_30px_rgba(0,240,255,0.45)] hover:brightness-110 transition active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Calendar className="size-5" />
          <span>Agendar Horário Online</span>
        </button>
      </section>

      {/* Info Cards (Hours & WhatsApp) */}
      <section className="space-y-2.5 my-6">
        <div className="p-4 rounded-2xl bg-[#161820] border border-[#272a34] flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20 flex items-center justify-center shrink-0">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{SHOP.hours}</p>
            <p className="text-[11px] text-gray-400">
              Almoço das 12h às 14h • Domingo fechado
            </p>
          </div>
        </div>

        <a
          href={whatsappDirect}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-2xl bg-[#161820] border border-[#272a34] hover:border-emerald-500/40 flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                WhatsApp Oficial
              </p>
              <p className="text-[11px] text-gray-400">{SHOP.phoneDisplay}</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-gray-500 group-hover:text-emerald-400 transition" />
        </a>
      </section>

      {/* Services Showcase */}
      <section className="my-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold font-display text-white">
              Tabela de Serviços
            </h2>
            <p className="text-xs text-gray-400">
              Preços atualizados em tempo real pelo administrador
            </p>
          </div>

          <button
            onClick={() => onGoToBooking()}
            className="text-xs font-bold text-[#00f0ff] hover:underline"
          >
            Ver todos
          </button>
        </div>

        <div className="space-y-2.5">
          {activeServices.map((svc) => (
            <div
              key={svc.id}
              onClick={() => onGoToBooking(svc.id)}
              className="p-4 rounded-2xl bg-[#161820] border border-[#272a34] hover:border-[#00f0ff]/40 hover:bg-[#1a1d26] transition cursor-pointer flex items-center justify-between group"
            >
              <div>
                {svc.category && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#00f0ff] block mb-0.5">
                    {svc.category}
                  </span>
                )}
                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#00f0ff] transition">
                  {svc.name}
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                  <Clock className="size-3 text-[#00f0ff]" />
                  <span>{formatTimeMinutes(svc.duration)}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="font-display font-bold text-lg text-[#00f0ff] block">
                  {brl(svc.price)}
                </span>
                <span className="text-[10px] text-gray-400 group-hover:text-white transition">
                  Agendar →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Admin Quick Entry Section */}
      <section className="mt-8 pt-6 border-t border-[#272a34]/80 text-center">
        <button
          onClick={onGoToAdmin}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#161820] border border-[#272a34] text-gray-400 hover:text-[#00f0ff] hover:border-[#00f0ff]/30 text-xs font-semibold transition"
        >
          <ShieldCheck className="size-4 text-[#00f0ff]" />
          Acesso Exclusivo do Administrador
        </button>
        <p className="text-[10px] text-gray-500 mt-2">
          Gerencie catálogo de serviços, preços, barbeiros e agenda
        </p>
      </section>
    </div>
  );
}
