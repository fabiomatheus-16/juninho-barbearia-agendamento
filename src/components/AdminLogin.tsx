import React, { useState } from "react";
import { Lock, Mail, KeyRound, ArrowRight, ShieldCheck, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { actions, useStore } from "../lib/store";
import { BrandLogo } from "./ui/BrandLogo";

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToHome: () => void;
}

export function AdminLogin({ onSuccess, onBackToHome }: AdminLoginProps) {
  const adminCredentials = useStore((s) => s.adminCredentials);

  const [mode, setMode] = useState<"credentials" | "pin">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      let success = false;
      if (mode === "credentials") {
        success = actions.loginAdmin(email, password);
      } else {
        success = actions.loginAdmin(pin);
      }

      setLoading(false);
      if (success) {
        onSuccess();
      } else {
        setError(
          mode === "credentials"
            ? "E-mail ou senha de administrador incorretos."
            : "PIN de acesso inválido. Tente novamente."
        );
      }
    }, 400);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Top Back button */}
        <button
          onClick={onBackToHome}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-[#00f0ff] transition"
        >
          <ArrowLeft className="size-4" /> Voltar para a Barbearia
        </button>

        {/* Card Box */}
        <div className="relative rounded-3xl border border-[#272a34] bg-gradient-to-b from-[#181a22] to-[#12141a] p-6 sm:p-8 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Neon background ambient glow */}
          <div className="absolute -top-24 -right-24 size-48 rounded-full bg-[#00f0ff]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 size-48 rounded-full bg-[#0088ff]/10 blur-3xl pointer-events-none" />

          {/* Logo & Header */}
          <div className="text-center flex flex-col items-center">
            <BrandLogo size="lg" className="mb-4" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="size-3.5" />
              Área Restrita
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
              Login do Administrador
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-400">
              Gerencie serviços, preços, barbeiros e relatórios
            </p>
          </div>

          {/* Tab switcher: Senha vs PIN */}
          <div className="mt-6 grid grid-cols-2 p-1 rounded-xl bg-[#14161c] border border-[#272a34]">
            <button
              type="button"
              onClick={() => {
                setMode("credentials");
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                mode === "credentials"
                  ? "bg-[#00f0ff] text-[#090a0f] shadow-sm font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              E-mail & Senha
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("pin");
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                mode === "pin"
                  ? "bg-[#00f0ff] text-[#090a0f] shadow-sm font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              PIN Rápido (4 Dígitos)
            </button>
          </div>

          {/* Error notice */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center animate-shake">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            {mode === "credentials" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    E-mail do Administrador
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Mail className="size-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="admin@juninbarbeiro.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#14161c] border border-[#272a34] pl-10 pr-4 text-white text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="size-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#14161c] border border-[#272a34] pl-10 pr-11 text-white text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                      aria-label="Ver senha"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 text-center">
                  Digite seu PIN de 4 dígitos
                </label>
                <div className="relative max-w-[200px] mx-auto">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <KeyRound className="size-4" />
                  </span>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    autoFocus
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-14 rounded-xl bg-[#14161c] border border-[#272a34] text-center tracking-[0.5em] text-2xl font-bold text-[#00f0ff] focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-[#090a0f] font-bold text-sm shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:brightness-110 transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Verificando credenciais...</span>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badge note */}
        <p className="mt-4 text-center text-[11px] text-gray-500">
          🔒 Sessão segura e persistente. Clientes não possuem acesso a esta área.
        </p>
      </div>
    </div>
  );
}