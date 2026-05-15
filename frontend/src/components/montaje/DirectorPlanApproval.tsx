"use client";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Film, Sparkles, RefreshCw } from "lucide-react";
import { parseSections } from "@/lib/utils";

interface Props {
  job: any;
  onApprove: (jobId: string, plan: any) => void;
  onRegenerate: (jobId: string, phase: number, model?: string) => void;
}

export function DirectorPlanApproval({ job, onApprove, onRegenerate }: Props) {
  const plan = job.data?.story_plan;
  const escenas = plan?.escenas || [];
  const modelSelectRef = useRef<HTMLSelectElement>(null);

  const handleApprove = () => {
    // Recoger ediciones de los textareas (IDs sagrados del monolito)
    const modifiedEscenas = escenas.map((s: any, i: number) => ({
      ...s,
      script_completo:
        (document.getElementById(`plan-script-${i}`) as HTMLTextAreaElement)
          ?.value ?? s.script_completo ?? s.script ?? s.locucion,
      prompt_visual_ingles:
        (document.getElementById(`plan-prompt-${i}`) as HTMLTextAreaElement)
          ?.value ?? s.prompt_visual_ingles ?? s.prompt_visual ?? s.prompt,
    }));
    onApprove(job.id, { ...plan, escenas: modifiedEscenas });
  };

  const handleRegenerate = () => {
    const model = modelSelectRef.current?.value || "minimax";
    onRegenerate(job.id, 6, model); // fase 6 = director
  };

  return (
    <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-6 animate-in slide-in-from-top-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center">
            <Film className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">
              Revisión del Plan Requerida
            </h3>
            <p className="text-[10px] text-white/40 uppercase">
              El Director IA ha propuesto escenas. Puedes editarlas abajo.
            </p>
          </div>
        </div>
        <span className="bg-amber-500 text-black font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
          Pendiente de Edición
        </span>
      </div>

      {/* Premisa + Guía */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block">
            Premisa del Guion
          </label>
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-xs text-white/70 leading-relaxed italic min-h-[80px]">
            "{plan?.premisa || "Sin premisa"}"
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block">
            Instrucciones de Ajuste (Opcional)
          </label>
          <Textarea
            id={`story-guide-active-${job.id}`}
            defaultValue={job.data?.story_guide || ""}
            placeholder="Ej: Haz que el tono sea más energético..."
            className="bg-black/40 border-amber-500/20 text-white text-xs min-h-[80px] rounded-2xl focus:ring-amber-500/30 placeholder:text-white/20"
          />
        </div>
      </div>

      {/* Vista previa de escenas */}
      {escenas.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
            {escenas.length} Escenas Planificadas
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {escenas.map((scene: any, i: number) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">
                    Escena {i + 1}
                  </span>
                  <span className="text-[8px] text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
                    {scene.duracion}s · {scene.audio_mode}
                  </span>
                </div>

                {/* Script — ID sagrado para el monolito */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-emerald-400/60 uppercase tracking-wider block">
                    Locución
                  </label>
                  <textarea
                    id={`plan-script-${i}`}
                    defaultValue={scene.script_completo || scene.script || scene.locucion || ""}
                    className="w-full bg-transparent border-0 text-white/70 text-[10px] resize-none outline-none leading-snug min-h-[40px] placeholder:text-white/10"
                    placeholder="Script de voz..."
                  />
                </div>

                {/* Prompt — ID sagrado para el monolito */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-amber-500/60 uppercase tracking-wider block">
                    Prompt Visual
                  </label>
                  <textarea
                    id={`plan-prompt-${i}`}
                    defaultValue={scene.prompt_visual_ingles || scene.prompt_visual || scene.prompt || ""}
                    className="w-full bg-transparent border-0 text-amber-100/50 text-[9px] resize-none outline-none leading-snug min-h-[50px] font-mono placeholder:text-white/10"
                    placeholder="Prompt visual..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={handleApprove}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/20 uppercase tracking-wider transition-all active:scale-95"
        >
          <Sparkles className="w-4 h-4 mr-2" /> 🚀 Aprobar Todo y Comenzar Rodaje
        </Button>

        <div className="flex gap-2">
          <select
            ref={modelSelectRef}
            id={`director-model-active-${job.id}`}
            defaultValue={job.data?.director_model || "minimax"}
            className="bg-white/5 border border-white/10 text-white text-[10px] rounded-xl px-3 h-12 font-bold outline-none focus:border-violet-500/50"
          >
            <option value="minimax">MiniMax</option>
            <option value="gemini-flash">Gemini Flash</option>
            <option value="gemini">Gemini Pro</option>
            <option value="groq">Groq</option>
          </select>

          <Button
            variant="outline"
            onClick={handleRegenerate}
            className="border-violet-500/30 text-violet-400 hover:bg-violet-500 hover:text-white font-black text-xs h-12 px-6 rounded-xl uppercase tracking-wider transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Regenerar Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
