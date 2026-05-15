"use client";

import { Textarea } from "@/components/ui/textarea";
import { Film } from "lucide-react";

const AUDIO_MODES = [
  { id: "lip-sync", label: "Lip-Sync", icon: "🗣️", desc: "Labios sincronizados" },
  { id: "mixed", label: "Híbrido", icon: "🎭", desc: "Mix lip-sync + off" },
  { id: "voice-over", label: "Voz en Off", icon: "🎙️", desc: "Narración en off" },
  { id: "asmr", label: "ASMR", icon: "🍃", desc: "Susurrado, íntimo" },
];

const LANGUAGES = [
  { id: "es", label: "Español (ES)", icon: "🇪🇸" },
  { id: "es-latam", label: "Español (MX)", icon: "🇲🇽" },
  { id: "en", label: "English (US)", icon: "🇺🇸" },
  { id: "fr", label: "Français (FR)", icon: "🇫🇷" },
  { id: "de", label: "Deutsch (DE)", icon: "🇩🇪" },
  { id: "it", label: "Italiano (IT)", icon: "🇮🇹" },
  { id: "pt", label: "Português (PT)", icon: "🇵🇹" },
];

interface NarrativeConfigProps {
  audioMode: string;
  onAudioModeChange: (mode: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  autoExecution: boolean;
  onAutoExecutionChange: (val: boolean) => void;
  storyGuide: string;
  onStoryGuideChange: (guide: string) => void;
}

export function NarrativeConfig({
  audioMode,
  onAudioModeChange,
  language,
  onLanguageChange,
  autoExecution,
  onAutoExecutionChange,
  storyGuide,
  onStoryGuideChange,
}: NarrativeConfigProps) {
  return (
    <div className="space-y-6">
      <label className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest">
        <Film className="w-3.5 h-3.5" /> Narrativa y Guión
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modo Audio */}
        <div className="space-y-3">
          <label className="text-[10px] text-violet-400 uppercase font-black tracking-widest">Modo Audio</label>
          <div className="grid grid-cols-1 gap-2">
            {AUDIO_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => onAudioModeChange(m.id)}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  audioMode === m.id
                    ? "bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-500/10"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                }`}
              >
                <span className="text-xl">{m.icon}</span>
                <div>
                  <span className={`text-[10px] font-bold block ${audioMode === m.id ? "text-white" : "text-white/40"}`}>
                    {m.label}
                  </span>
                  <span className="text-[9px] text-white/20">{m.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Idioma */}
        <div className="space-y-3">
          <label className="text-[10px] text-emerald-400 uppercase font-black tracking-widest">Idioma</label>
          <div className="grid grid-cols-1 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => onLanguageChange(l.id)}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  language === l.id
                    ? "bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-500/10"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                }`}
              >
                <span className="text-xl">{l.icon}</span>
                <span className={`text-[10px] font-bold ${language === l.id ? "text-white" : "text-white/40"}`}>
                  {l.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Opciones adicionales */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        {/* Toggle modo iterativo */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div>
            <p className="text-xs font-bold text-white">Modo Iterativo (Aprobación manual por escena)</p>
            <p className="text-[10px] text-white/30 mt-0.5">Pausa entre cada escena para revisión</p>
          </div>
          <button
            onClick={() => onAutoExecutionChange(!autoExecution)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              !autoExecution ? "bg-emerald-600" : "bg-white/10"
            }`}
          >
            <div
              className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                !autoExecution ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Guía de historia */}
        <div className="space-y-2">
          <label className="text-[10px] text-amber-400 uppercase font-black">
            Guía de Historia (Opcional)
          </label>
          <Textarea
            value={storyGuide}
            onChange={(e) => onStoryGuideChange(e.target.value)}
            placeholder="Ej: Empieza con un problema, muestra el producto en acción, termina con CTA directo..."
            className="bg-white/5 border-white/10 text-white text-xs min-h-[80px] focus:border-amber-500/50"
          />
        </div>
      </div>
    </div>
  );
}
