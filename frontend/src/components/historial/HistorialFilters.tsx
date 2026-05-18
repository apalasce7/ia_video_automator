"use client";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const FILTER_OPTIONS = [
  { id: "all",          label: "Todos",           emoji: "🗂️" },
  { id: "completado",   label: "Completados",      emoji: "✅" },
  { id: "activo",       label: "Activos",          emoji: "⚡" },
  { id: "interrumpido", label: "Interrumpidos",    emoji: "⚠️" },
  { id: "error",        label: "Con Error",        emoji: "❌" },
] as const;

type FilterStatus = (typeof FILTER_OPTIONS)[number]["id"];

interface Props {
  filterStatus: FilterStatus;
  setFilterStatus: (v: FilterStatus) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}

export function HistorialFilters({
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">

      {/* ── Búsqueda ── */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por producto, influencer, ID..."
          className="pl-10 pr-8 bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 h-9 text-xs rounded-xl focus:border-violet-500/50 focus:ring-0"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Filtros de estado ── */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilterStatus(opt.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5
              ${
                filterStatus === opt.id
                  ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                  : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
              }`}
          >
            <span>{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
