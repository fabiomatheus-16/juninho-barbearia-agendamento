import React, { useState } from "react";
import { X, Clock, Sparkles, Check, DollarSign } from "lucide-react";
import type { Service } from "../types";
import { brl, formatTimeMinutes } from "../lib/store";

interface ServiceModalProps {
  service?: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Omit<Service, "id"> & { id?: string }) => void;
}

const CATEGORY_PRESETS = [
  "Química & Corte",
  "Cortes",
  "Barba",
  "Combos",
  "Tratamentos",
];

const DURATION_PRESETS = [15, 20, 30, 45, 60, 90, 120];

export function ServiceModal({
  service,
  isOpen,
  onClose,
  onSave,
}: ServiceModalProps) {
  const isEditing = Boolean(service && service.id);

  const [name, setName] = useState(service?.name || "");
  const [price, setPrice] = useState<string>(
    service?.price ? String(service.price) : ""
  );
  const [duration, setDuration] = useState<number>(service?.duration || 30);
  const [category, setCategory] = useState(
    service?.category || "Cortes"
  );
  const [description, setDescription] = useState(service?.description || "");
  const [active, setActive] = useState(service?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  // Sync state when modal opens or service changes
  React.useEffect(() => {
    if (service) {
      setName(service.name);
      setPrice(String(service.price));
      setDuration(service.duration);
      setCategory(service.category || "Cortes");
      setDescription(service.description || "");
      setActive(service.active ?? true);
    } else {
      setName("");
      setPrice("");
      setDuration(30);
      setCategory("Cortes");
      setDescription("");
      setActive(true);
    }
    setError(null);
  }, [service, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Por favor, digite o nome do serviço.");
      return;
    }

    const numPrice = parseFloat(price.replace(",", "."));
    if (isNaN(numPrice) || numPrice <= 0) {
      setError("Informe um preço válido maior que zero (R$).");
      return;
    }

    if (!duration || duration < 5) {
      setError("A duração mínima do serviço deve ser de 5 minutos.");
      return;
    }

    onSave({
      ...(isEditing && service ? { id: service.id } : {}),
      name: cleanName,
      price: numPrice,
      duration,
      category: category.trim() || "Cortes",
      description: description.trim(),
      active,
    });
    onClose();
  };

  const parsedPrice = parseFloat(price.replace(",", ".")) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#272a34] bg-[#14161c] p-5 sm:p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#272a34]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">
                {isEditing ? "Editar Serviço" : "Novo Serviço"}
              </h2>
              <p className="text-xs text-gray-400">
                Gerencie catálogo e preços da barbearia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#20242e] text-gray-400 hover:text-white transition"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <span className="font-semibold">Atenção:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Nome do Serviço */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Nome do Serviço *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nevou + corte, Barba, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 rounded-xl bg-[#1c202a] border border-[#2b303e] px-4 text-white text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition"
            />
          </div>

          {/* Preço e Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Preço (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  placeholder="0,00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full h-12 rounded-xl bg-[#1c202a] border border-[#2b303e] pl-10 pr-4 text-white text-base font-semibold focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Duração (Minutos) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Clock className="size-4" />
                </span>
                <input
                  type="number"
                  step="5"
                  min="5"
                  required
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-12 rounded-xl bg-[#1c202a] border border-[#2b303e] pl-10 pr-4 text-white text-base font-semibold focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition"
                />
              </div>
            </div>
          </div>

          {/* Atalhos rápidos de duração */}
          <div>
            <span className="block text-[11px] text-gray-400 mb-1">
              Durações comuns:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDuration(mins)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                    duration === mins
                      ? "bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50 font-bold"
                      : "bg-[#1c202a] text-gray-400 border-[#2b303e] hover:border-gray-500"
                  }`}
                >
                  {formatTimeMinutes(mins)}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Categoria
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CATEGORY_PRESETS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-lg border transition ${
                    category === cat
                      ? "bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50 font-semibold"
                      : "bg-[#1c202a] text-gray-400 border-[#2b303e] hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Ou digite outra categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 rounded-xl bg-[#1c202a] border border-[#2b303e] px-4 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Descrição do Serviço (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalhes sobre técnica, produtos inclusos, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl bg-[#1c202a] border border-[#2b303e] p-3 text-white text-xs focus:outline-none focus:border-[#00f0ff]"
            />
          </div>

          {/* Ativo no agendamento */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#1c202a] border border-[#2b303e] cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-white block">
                Disponível para agendamento online
              </span>
              <span className="text-xs text-gray-400">
                Se desativado, o cliente não verá este serviço no formulário
              </span>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="size-5 rounded accent-[#00f0ff] cursor-pointer"
            />
          </label>

          {/* Pré-visualização ao vivo */}
          <div className="pt-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block mb-1.5">
              Pré-visualização do Cartão (Como o cliente verá):
            </span>
            <div className="p-3.5 rounded-xl border border-[#00f0ff]/30 bg-gradient-to-r from-[#18232e] to-[#14161c] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#00f0ff] tracking-wider block">
                  {category || "Serviço"}
                </span>
                <p className="font-bold text-white text-sm">
                  {name || "Nome do Serviço"}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Clock className="size-3 text-[#00f0ff]" />
                  {formatTimeMinutes(duration)}
                </p>
              </div>
              <div className="text-right">
                <span className="font-display font-bold text-lg text-[#00f0ff]">
                  {brl(parsedPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#272a34]">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-xl border border-[#2b303e] bg-[#1a1d24] text-gray-300 font-semibold text-sm hover:bg-[#222630] transition active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-12 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0099ff] text-[#050b14] font-bold text-sm shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:brightness-110 transition active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <Check className="size-4" />
              {isEditing ? "Salvar Alterações" : "Cadastrar Serviço"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
