"use client";

import { ChevronDown, Zap } from "lucide-react";

const DIRECTOR_MODELS = [
  { value: "minimax", label: "🇨🇳 MiniMax M2.7" },
  { value: "groq", label: "⚡ Groq Llama 3.3" },
  { value: "gemini", label: "💎 Gemini 2.5 Pro" },
  { value: "gemini-flash", label: "⚡ Gemini 2.5 Flash" },
  { value: "gemini-lite", label: "🍃 Gemini 2.0 Lite" },
];

const EDIT_STYLES = [
  { value: "standard", label: "🎬 Clásico" },
  { value: "fast-cuts", label: "⚡ Cortes Rápidos" },
  { value: "b-roll-focused", label: "🤲 Enfocado en Detalle" },
];

const RESOLUTIONS = [
  { value: "480p", label: "480p", cost: 0.12 },
  { value: "720p", label: "720p", cost: 0.24 },
  { value: "1080p", label: "1080p", cost: 0.60 },
];

interface ProductionConfigProps {
  directorModel: string;
  onDirectorModelChange: (m: string) => void;
  editStyle: string;
  onEditStyleChange: (s: string) => void;
  resolution: string;
  onResolutionChange: (r: string) => void;
  duration: number;
  onDurationChange: (d: number) => void;
}

export function ProductionConfig({
  directorModel,
  onDirectorModelChange,
  editStyle,
  onEditStyleChange,
  resolution,
  onResolutionChange,
  duration,
  onDurationChange,
}: ProductionConfigProps) {
  const costPerSec = RESOLUTIONS.find((r) => r.value === resolution)?.cost ?? 0.12;
  const estimatedCost = (duration * costPerSec).toFixed(2);

  const SelectField = ({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-white/30 uppercase block">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white appearance-none focus:ring-2 focus:ring-pink-500/50 outline-none transition-all font-bold"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#050508]">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <label className="flex items-center gap-2 text-[10px] font-black text-pink-400 uppercase tracking-widest">
        <Zap className="w-3.5 h-3.5" /> Motor IA y Producción
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectField
          label="Director LLM"
          value={directorModel}
          onChange={onDirectorModelChange}
          options={DIRECTOR_MODELS}
        />
        <SelectField
          label="Estilo Montaje"
          value={editStyle}
          onChange={onEditStyleChange}
          options={EDIT_STYLES}
        />
        <SelectField
          label="Resolución"
          value={resolution}
          onChange={onResolutionChange}
          options={RESOLUTIONS}
        />
      </div>

      {/* Duración */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-white/30 uppercase font-bold">Duración del Vídeo</label>
          <span className="text-violet-400 font-black text-sm">{duration}s</span>
        </div>
        <input
          type="range"
          min="4"
          max="60"
          step="1"
          value={duration}
          onChange={(e) => onDurationChange(parseInt(e.target.value))}
          className="w-full accent-violet-500 h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-white/20">
          <span>4s (mini)</span>
          <span>30s (óptimo)</span>
          <span>60s (max)</span>
        </div>
      </div>

      {/* Coste estimado */}
      <div className="flex justify-between items-center bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
        <div>
          <span className="text-xs font-bold text-white/70">Coste Total Estimado</span>
          <p className="text-[10px] text-white/30 mt-0.5">
            {duration}s × ${costPerSec}/s ({resolution})
          </p>
        </div>
        <span className="text-2xl font-black text-emerald-400">${estimatedCost}</span>
      </div>
    </div>
  );
}
