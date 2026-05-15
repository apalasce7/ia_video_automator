"use client";

import { ChevronDown, User, Mic } from "lucide-react";
import type { Influencer } from "@/lib/types";
import { API_URL } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ── Opciones de producción de voz (por vídeo) ──
const MIC_DISTANCE_OPTIONS = [
  { label: "Cercano (íntimo, ASMR)", value: "close-mic" },
  { label: "Medio (conversacional)", value: "medium-distance mic" },
  { label: "Lejano (natural, UGC)", value: "far-mic" },
];

const SPEECH_PACE_OPTIONS = [
  { label: "Rápido (energético)", value: "fast-paced speech" },
  { label: "Moderado (natural)", value: "moderate pacing" },
  { label: "Pausado (énfasis)", value: "slow deliberate pacing" },
];

const PITCH_OPTIONS = [
  { label: "Bajo (grave)", value: "low pitch" },
  { label: "Medio (consistente)", value: "consistent mid-range pitch" },
  { label: "Alto (agudo)", value: "high pitch" },
];

export interface VoiceProductionParams {
  micDistance: string;
  speechPace: string;
  pitch: string;
}

interface InfluencerSelectorProps {
  influencers: Influencer[];
  selectedId: string;
  onSelect: (id: string) => void;
  voiceParams: VoiceProductionParams;
  onVoiceParamsChange: (params: VoiceProductionParams) => void;
  /** voice_print generado dinámicamente para preview */
  dynamicVoicePrint: string;
}

export function InfluencerSelector({
  influencers,
  selectedId,
  onSelect,
  voiceParams,
  onVoiceParamsChange,
  dynamicVoicePrint,
}: InfluencerSelectorProps) {
  const selected = influencers.find((i) => i.id === selectedId);
  const faceUrl = selected?.local_path ? `${API_URL}/${selected.local_path}` : null;

  return (
    <div className="space-y-5">
      {/* Selector principal */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
          Influencer IA
        </label>
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:ring-2 focus:ring-violet-500 outline-none transition-all"
          >
            <option value="" className="bg-[#050508]">— Selecciona un influencer —</option>
            {influencers.map((inf) => (
              <option key={inf.id} value={inf.id} className="bg-[#050508]">
                {inf.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Preview del influencer seleccionado */}
      {selected && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-full border-2 border-violet-500/40 overflow-hidden shrink-0">
            {faceUrl ? (
              <img src={faceUrl} alt={selected.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-violet-900/30">
                <User className="w-6 h-6 text-violet-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">{selected.name}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selected.age && (
                <Badge className="bg-white/5 border-none text-[9px] text-zinc-400 px-2">{selected.age} años</Badge>
              )}
              {selected.gender && (
                <Badge className="bg-white/5 border-none text-[9px] text-zinc-400 px-2">
                  {selected.gender === 'female' ? 'Fem' : selected.gender === 'male' ? 'Masc' : 'NB'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Parámetros de Producción de Voz (por vídeo) ── */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Mic className="h-3.5 w-3.5 text-violet-400" />
          <label className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
            Configuración de Voz (este vídeo)
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Distancia de Micro */}
          <div className="space-y-2">
            <label className="text-zinc-500 text-[10px] uppercase tracking-wider">Distancia Micro</label>
            <div className="relative">
              <select
                value={voiceParams.micDistance}
                onChange={(e) => onVoiceParamsChange({ ...voiceParams, micDistance: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-[11px] text-white appearance-none focus:ring-1 focus:ring-violet-500 outline-none"
              >
                {MIC_DISTANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#050508]">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Ritmo de Habla */}
          <div className="space-y-2">
            <label className="text-zinc-500 text-[10px] uppercase tracking-wider">Ritmo de Habla</label>
            <div className="relative">
              <select
                value={voiceParams.speechPace}
                onChange={(e) => onVoiceParamsChange({ ...voiceParams, speechPace: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-[11px] text-white appearance-none focus:ring-1 focus:ring-violet-500 outline-none"
              >
                {SPEECH_PACE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#050508]">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Tono (Pitch) */}
          <div className="space-y-2">
            <label className="text-zinc-500 text-[10px] uppercase tracking-wider">Tono (Pitch)</label>
            <div className="relative">
              <select
                value={voiceParams.pitch}
                onChange={(e) => onVoiceParamsChange({ ...voiceParams, pitch: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-[11px] text-white appearance-none focus:ring-1 focus:ring-violet-500 outline-none"
              >
                {PITCH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#050508]">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Preview del Voice Print dinámico generado */}
        {dynamicVoicePrint && (
          <div className="flex items-start gap-2 rounded-lg bg-violet-500/5 border border-violet-500/20 p-3">
            <Mic className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
            <div>
              <p className="text-[9px] text-violet-400 uppercase tracking-wider font-bold mb-1">Voice Print generado</p>
              <p className="text-[11px] leading-relaxed text-zinc-400 font-mono">{dynamicVoicePrint}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
