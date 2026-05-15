"use client";
import { PhaseIndicator } from "@/components/PhaseIndicator";
import { CostCalculator } from "@/components/CostCalculator";
import { phaseLabels, getProgressValue, getStatusBadgeClass } from "@/lib/utils/jobUtils";
import type { InspectedResult } from "@/lib/types";

interface Props {
  job: any;
  onInspect: (result: InspectedResult) => void;
  onReplay: (jobId: string, phase: number) => void;
}

// Orden de las fases para renderizar en el panel
const PHASE_ORDER = [
  "download",
  "extract_frames",
  "select_frame",
  "base_image_start",
  "base_image",
  "elements",
  "director",
  "video",
  "ffmpeg",
];

export function PipelineStatus({ job, onInspect, onReplay }: Props) {
  const progress = getProgressValue(job);
  const phases = job.phases || {};

  // Información de modo y motor IA desde job.data
  const autoExecution = job.data?.auto_execution;
  const directorModel = job.data?.director_model || "—";
  const language = job.data?.language || "es";
  const audioMode = job.data?.audio_mode || "—";
  const resolution = job.data?.resolution || "—";

  return (
    <div className="space-y-4">
      {/* Header del panel */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">
          Pipeline
        </h3>
        <span className={`
          text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border
          ${getStatusBadgeClass(job.status)}
        `}>
          {job.status?.replace(/_/g, " ").slice(0, 20) || "—"}
        </span>
      </div>

      {/* Barra de progreso global */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Progreso</span>
          <span className="text-[10px] font-black text-white/60">{progress}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Fases del pipeline */}
      <div className="space-y-1.5">
        {PHASE_ORDER.map((key, idx) => {
          const status = phases[key] ?? "⏳ Pendiente";
          const label = phaseLabels[key] || key;
          const result = job.data?.[key] || phases[key];
          return (
            <PhaseIndicator
              key={key}
              label={label}
              status={status}
              index={idx + 1}
              result={result}
              onInspect={onInspect}
              payload={result}
              jobId={job.id}
              keyName={key}
              onReplay={onReplay}
            />
          );
        })}
      </div>

      {/* Meta del job */}
      <div className="pt-2 border-t border-white/5 space-y-2">
        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Configuración</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Modo", value: autoExecution ? "Automático" : "Iterativo" },
            { label: "Director", value: directorModel },
            { label: "Idioma", value: language.toUpperCase() },
            { label: "Audio", value: audioMode },
            { label: "Resolución", value: resolution },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.02] border border-white/5 rounded-xl px-2.5 py-1.5">
              <p className="text-[8px] text-white/25 font-bold uppercase tracking-wider">{label}</p>
              <p className="text-[10px] text-white/60 font-bold truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Calculadora de costes */}
      <div className="pt-1">
        <CostCalculator jobId={job.id} />
      </div>
    </div>
  );
}
