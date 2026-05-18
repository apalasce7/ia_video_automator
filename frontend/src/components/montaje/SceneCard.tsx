"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipEditor } from "@/components/ClipEditor";
import { ScenePreview } from "@/components/ScenePreview";
import {
  Scissors, RefreshCw, EyeOff, CheckCircle2, Languages,
  ChevronLeft, ChevronRight, Video, MonitorPlay, Zap, Sparkles
} from "lucide-react";
import { parseSections, NOMINAL_ORDER } from "@/lib/utils";

interface SceneCardProps {
  job: any;
  scene: any;
  idx: number;
  showTranslation: Record<string, boolean>;
  esCache: Record<string, string>;
  enOverride: Record<string, string>;
  contentVersion: Record<string, number>;
  translating: Record<string, boolean>;
  liveValuesRef: React.MutableRefObject<Record<string, string>>;
  dirtyTagsRef: React.MutableRefObject<Record<string, Set<string>>>;
  setEsCache: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setEnOverride: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSelectVersion: (jobId: string, sceneIdx: number, versionIdx: number) => void;
  onRegenerateScene: (jobId: string, prompt?: string, script?: string, sceneIdx?: number) => void;
  onApproveScene: (jobId: string) => void;
  onGenerateNext: (jobId: string) => void;
  onUnlock: (jobId: string, sceneIdx?: number) => void;
  onSaveClipEdits: (jobId: string, sceneIdx: number, edits: any) => void;
  onPromptTranslation: (sceneKey: string, sections: {tag:string;originalContent:string}[]) => void;
  onScriptTranslation: (sceneKey: string, originalContent: string) => void;
}

export function SceneCard({
  job, scene, idx,
  showTranslation, esCache, enOverride, contentVersion, translating,
  liveValuesRef, dirtyTagsRef, setEsCache, setEnOverride,
  onSelectVersion, onRegenerateScene, onApproveScene,
  onGenerateNext, onUnlock, onSaveClipEdits,
  onPromptTranslation, onScriptTranslation,
}: SceneCardProps) {
  const [editingClip, setEditingClip] = useState(false);

  const isCompleted = !!job.data.scene_results?.[idx];
  const isCurrent = idx === job.data.current_scene_idx;
  const videoUrl = job.data.scene_results?.[idx] ?? null;
  const isFinished = job.status === "completado";
  const isExcluded = !!job.data.scene_edits?.[String(idx)]?.excluded;
  const history = job.data.scene_history?.[String(idx)] || [];
  const currentVIdx = videoUrl ? history.indexOf(videoUrl) : -1;
  const sceneKey = `${job.id}-${idx}`;
  const scriptKey = `${sceneKey}___SCRIPT`;
  const isES = showTranslation[sceneKey];
  const isESScript = showTranslation[scriptKey];

  const cardClass = [
    "group relative rounded-3xl border transition-all duration-500 flex flex-col overflow-hidden",
    isCurrent
      ? "bg-violet-600/5 border-violet-500/50 shadow-2xl shadow-violet-500/10 ring-1 ring-violet-500/20"
      : "bg-white/[0.01] border-white/5",
    !isCompleted && !isCurrent && !isFinished
    && job.status !== "esperando_aprobacion_plan"
    && job.status !== "esperando_revision_siguiente_escena"
      ? "opacity-30 grayscale blur-[1px]"
      : "opacity-100",
  ].join(" ");

  // ── Script change: mirror al DIALOGUE — regex corregido 1:1 monolito ──
  const handleScriptChange = (newScript: string) => {
    const tagKey = "[DIALOGUE]:";
    const compKey = `${sceneKey}___${tagKey}`;
    if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
    dirtyTagsRef.current[sceneKey].add("SCRIPT");
    dirtyTagsRef.current[sceneKey].add(tagKey);
    liveValuesRef.current[scriptKey] = newScript;

    // 1. Mirror al master OCULTO (edit-prompt o plan-prompt)
    const masterEl = document.getElementById(`edit-prompt-${job.id}-${idx}`) as HTMLTextAreaElement
      || document.getElementById(`plan-prompt-${idx}`) as HTMLTextAreaElement;
    if (masterEl) {
      masterEl.value = masterEl.value.replace(
        /(\[DIALOGUE\]:[\s\S]*?['"])([^'"]*?)(['"])/gi,
        `$1${newScript}$3`
      );
    }

    // 2. Mirror al textarea VISIBLE del DIALOGUE (solo si Locución y Prompt están en el mismo idioma)
    const isESScript = showTranslation[scriptKey];
    const isESPrompt = showTranslation[sceneKey];
    if (!!isESScript === !!isESPrompt) {
      const visibleDialogueEdit = document.querySelector(`[data-edit-prompt="${idx}"][data-tag*="DIALOGUE"]`) as HTMLTextAreaElement;
      if (visibleDialogueEdit) {
        visibleDialogueEdit.value = visibleDialogueEdit.value.replace(/(['"])([^'"]*?)(['"])/gi, `$1${newScript}$3`);
      }
      const visibleDialoguePlan = document.querySelector(`[data-scene-prompt="${idx}"][data-tag*="DIALOGUE"]`) as HTMLTextAreaElement;
      if (visibleDialoguePlan) {
        visibleDialoguePlan.value = visibleDialoguePlan.value.replace(/(['"])([^'"]*?)(['"])/gi, `$1${newScript}$3`);
      }
    }

    const updateFn = (prev: any) => {
      const originalParsed = parseSections(scene.prompt_visual_ingles || scene.prompt_visual || "").find(s => s.tag === tagKey)?.content || "";
      const oldVal = prev[compKey] || originalParsed;
      const newVal = oldVal.replace(/(['"])([^'"]*)(['"])/, `$1${newScript}$3`);
      liveValuesRef.current[compKey] = newVal;
      return { ...prev, [compKey]: newVal, [scriptKey]: newScript };
    };
    if (isESScript) setEsCache(updateFn); else setEnOverride(updateFn);
  };


  // ── Tag change: mirror a master con NOMINAL_ORDER — 1:1 monolito ──
  const handleTagChange = (tag: string, newVal: string) => {
    const compositeKey = `${sceneKey}___${tag}`;
    liveValuesRef.current[compositeKey] = newVal;
    if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
    dirtyTagsRef.current[sceneKey].add(tag);

    const master = document.getElementById(`edit-prompt-${job.id}-${idx}`) as HTMLTextAreaElement;
    if (master && !isES) {
      const parts = Array.from(document.querySelectorAll(`[data-edit-prompt="${idx}"]`)) as HTMLTextAreaElement[];
      master.value = parts
        .sort((a, b) =>
          NOMINAL_ORDER.indexOf(a.getAttribute("data-tag")!) -
          NOMINAL_ORDER.indexOf(b.getAttribute("data-tag")!)
        )
        .map(p => `${p.getAttribute("data-tag")} ${p.value}`)
        .join("\n").trim();
    }

    if (tag.toUpperCase().includes("DIALOGUE")) {
      const match = /['"]([^'"]*)['"]/.exec(newVal);
      if (match) {
        const scriptEl = document.getElementById(`edit-script-${job.id}-${idx}`) as HTMLTextAreaElement;
        if (scriptEl) {
          scriptEl.value = match[1];
          liveValuesRef.current[scriptKey] = match[1];
          dirtyTagsRef.current[sceneKey]?.add("SCRIPT");
        }
      }
    }

    const update = (prev: any) => ({ ...prev, [compositeKey]: newVal });
    if (isES) setEsCache(update); else setEnOverride(update);
  };

  const scriptValue = isESScript
    ? (esCache[scriptKey] || scene.script_completo || scene.script || scene.locucion)
    : (enOverride[scriptKey] || scene.script_completo || scene.script || scene.locucion);

  const originalPrompt = scene.prompt_visual_ingles || scene.prompt_visual || "";
  const sections = parseSections(originalPrompt);

  return (
    <div className={cardClass}>
      {/* ── Header ── */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between gap-2 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black uppercase px-2 h-6 flex items-center rounded-full border
            ${isCurrent ? "border-violet-500/50 text-violet-400" : "border-white/10 text-white/30"}`}>
            {idx + 1}
          </span>
          <span className="text-[8px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded-full font-bold">
            {scene.duracion}s
          </span>
        </div>

        {(isCompleted || isFinished) ? (
          <div className="flex items-center gap-1">
            {history.length > 1 && (
              <div className="flex items-center bg-black/40 border border-white/10 rounded-xl h-7 mr-1">
                <Button variant="ghost" size="icon" className="h-6 w-5 text-white/30 hover:text-white"
                  onClick={() => onSelectVersion(job.id, idx, (currentVIdx - 1 + history.length) % history.length)}>
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <span className="text-[8px] font-black text-white/60 px-1 font-mono">V{currentVIdx + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-5 text-white/30 hover:text-white"
                  onClick={() => onSelectVersion(job.id, idx, (currentVIdx + 1) % history.length)}>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-white/40 hover:text-violet-400 hover:bg-violet-400/10"
                onClick={() => setEditingClip(true)} title="Editar recorte">
                <Scissors className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-white/40 hover:text-amber-500 hover:bg-amber-500/10"
                onClick={() => onRegenerateScene(job.id, originalPrompt, scene.script_completo || scene.script, idx)}
                title="Regenerar Clip">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon"
                className={`h-7 w-7 rounded-lg transition-colors ${isExcluded ? "text-red-500 bg-red-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                onClick={() => {
                  const cur = job.data.scene_edits?.[String(idx)] || {};
                  onSaveClipEdits(job.id, idx, { ...cur, excluded: !cur.excluded });
                }}
                title={isExcluded ? "Incluir escena" : "Excluir escena"}>
                {isExcluded ? <EyeOff className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        ) : isCurrent && job.status !== "esperando_aprobacion_plan" && job.status !== "esperando_revision_siguiente_escena" ? (
          <div className="flex items-center gap-2 pr-2">
            <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest animate-pulse">Live</span>
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
          </div>
        ) : null}
      </div>

      {/* ── Video Preview ── */}
      <div className="aspect-[9/16] bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-white/5">
        {(isCompleted || isFinished) && videoUrl ? (
          <div className="w-full h-full relative">
            <ScenePreview
              videoUrl={videoUrl}
              edits={job.data.scene_edits?.[String(idx)]}
              excluded={isExcluded}
              onEdit={() => setEditingClip(true)}
            />
            {isExcluded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none">
                <EyeOff className="w-8 h-8 text-white/20 mb-2" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Excluida</span>
              </div>
            )}
          </div>
        ) : isCurrent && job.status !== "esperando_aprobacion_plan" && job.status !== "esperando_revision_siguiente_escena" ? (
          <div className="flex flex-col items-center gap-6 text-center p-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-violet-500/10 border-t-violet-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="w-7 h-7 text-violet-500 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black text-violet-400 uppercase tracking-[0.3em]">IA Renderizando</p>
              <button onClick={() => onUnlock(job.id, idx)}
                className="px-3 py-1.5 rounded-full bg-white/5 text-[9px] text-white/30 hover:text-white/60 hover:bg-white/10 transition-all border border-white/5 uppercase font-bold tracking-tighter">
                ¿Atascado? Forzar Re-intento
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-20">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <MonitorPlay className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">En Espera</span>
          </div>
        )}

        {editingClip && videoUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-[450px] max-h-[90vh] flex flex-col relative bg-black/95 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
              <ClipEditor
                jobId={job.id} idx={idx} videoUrl={videoUrl}
                initialEdits={job.data.scene_edits?.[String(idx)]}
                onClose={() => setEditingClip(false)}
                onSave={(edits) => { onSaveClipEdits(job.id, idx, edits); setEditingClip(false); }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Interaction Area ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Modo Plan */}
        {(job.status === "esperando_aprobacion_plan" ||
          (isCurrent && job.status === "esperando_revision_siguiente_escena")) && (
          <div className="p-4 space-y-4 bg-white/[0.01] flex-1 flex flex-col">
            {isCurrent && (
              job.status === "esperando_aprobacion_plan" ? (
                <button onClick={() => {
                  const script = (document.getElementById(`plan-script-${idx}`) as HTMLTextAreaElement)?.value;
                  const prompt = (document.getElementById(`plan-prompt-${idx}`) as HTMLTextAreaElement)?.value;
                  const updatedPlan = { ...job.data.story_plan };
                  if (updatedPlan.escenas?.[idx]) {
                    updatedPlan.escenas[idx].script_completo = script;
                    updatedPlan.escenas[idx].prompt_visual_ingles = prompt;
                  }
                }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase py-3 rounded-2xl text-[11px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Sparkles className="w-4 h-4" /> Confirmar y Generar
                </button>
              ) : (
                <button onClick={() => onGenerateNext(job.id)}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black uppercase py-3 rounded-2xl text-[11px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Zap className="w-4 h-4 fill-current" /> Generar Escena {idx + 1}
                </button>
              )
            )}
            {/* IDs sagrados: plan-script-{idx} y plan-prompt-{idx} */}
            <ScriptField id={`plan-script-${idx}`} sceneKey={sceneKey} scriptKey={scriptKey}
              value={scriptValue} isES={isESScript} translating={!!translating[scriptKey]}
              onTranslate={() => onScriptTranslation(sceneKey, scene.script_completo || scene.script || scene.locucion)}
              onChange={handleScriptChange} />
            <textarea id={`plan-prompt-${idx}`} className="hidden" defaultValue={originalPrompt} />
            <PromptSections sceneKey={sceneKey} sections={sections} isES={isES}
              esCache={esCache} enOverride={enOverride} contentVersion={contentVersion}
              translating={!!translating[sceneKey]} dataAttr="data-scene-prompt" idx={idx}
              onTranslate={() => onPromptTranslation(sceneKey, sections.map(s => ({ tag: s.tag, originalContent: s.content })))}
              onChange={handleTagChange} />
          </div>
        )}

        {/* Modo Aprobación Escena */}
        {isCurrent && job.status === "esperando_aprobacion_escena" && (
          <div className="p-4 space-y-4 border-t border-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="bg-emerald-500/80 text-black text-[8px] font-black uppercase tracking-widest h-5 px-2 rounded-full flex items-center">OK</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[9px] font-black text-amber-500/40 uppercase tracking-widest">Acción Requerida</span>
              </div>
            </div>
            {/* IDs sagrados: edit-script-{jobId}-{idx} y edit-prompt-{jobId}-{idx} */}
            <ScriptField id={`edit-script-${job.id}-${idx}`} sceneKey={sceneKey} scriptKey={scriptKey}
              value={scriptValue} isES={isESScript} translating={!!translating[scriptKey]}
              onTranslate={() => onScriptTranslation(sceneKey, scene.script_completo || scene.script || scene.locucion)}
              onChange={handleScriptChange} />
            <textarea id={`edit-prompt-${job.id}-${idx}`} className="hidden" defaultValue={originalPrompt} />
            <PromptSections sceneKey={sceneKey} sections={sections} isES={isES}
              esCache={esCache} enOverride={enOverride} contentVersion={contentVersion}
              translating={!!translating[sceneKey]} dataAttr="data-edit-prompt" idx={idx}
              onTranslate={() => onPromptTranslation(sceneKey, sections.map(s => ({ tag: s.tag, originalContent: s.content })))}
              onChange={handleTagChange} />
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <button onClick={() => onApproveScene(job.id)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase py-3 rounded-2xl text-[10px] tracking-widest transition-all active:scale-95">
                ✅ Aprobar Escena
              </button>
              <button onClick={() => {
                const prompt = (document.getElementById(`edit-prompt-${job.id}-${idx}`) as HTMLTextAreaElement)?.value || originalPrompt;
                const script = (document.getElementById(`edit-script-${job.id}-${idx}`) as HTMLTextAreaElement)?.value;
                onRegenerateScene(job.id, prompt, script, idx);
              }}
                className="w-full bg-white/5 hover:bg-amber-500/10 text-amber-500 font-black uppercase py-2.5 rounded-2xl text-[9px] tracking-widest border border-white/5 hover:border-amber-500/20 transition-all active:scale-95">
                🔄 Rehacer con Modificaciones
              </button>
            </div>
          </div>
        )}

        {/* Panel read-only: escena completada no activa */}
        {(isCompleted || isFinished) && !isCurrent
          && job.status !== "esperando_aprobacion_plan"
          && job.status !== "esperando_revision_siguiente_escena" && (
          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="group/script">
                <label className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest block mb-1">Guión Generado</label>
                <p className="text-[11px] text-white/60 leading-relaxed font-medium line-clamp-3 group-hover/script:line-clamp-none transition-all">
                  {scene.script_completo || scene.script || scene.locucion || "—"}
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <label className="text-[9px] font-black text-amber-500/40 uppercase tracking-widest block">Prompt Visual</label>
                <div className="space-y-1">
                  {sections.map(({ tag, content }) => (
                    <div key={tag} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-0.5">{tag.replace(/:/g, "")}</span>
                      <p className="text-[9px] text-amber-200/25 font-mono leading-tight line-clamp-2">{content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-auto">
              <span className="text-[8px] font-bold text-white/15 uppercase tracking-widest">{scene.duracion}s · {scene.audio_mode}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-componentes ──

function ScriptField({ id, sceneKey, scriptKey, value, isES, translating, onTranslate, onChange }: {
  id: string; sceneKey: string; scriptKey: string;
  value: string; isES: boolean; translating: boolean;
  onTranslate: () => void; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black text-emerald-400/80 uppercase tracking-[0.2em]">Locución</label>
        <Button variant="ghost" size="sm" disabled={translating} onClick={onTranslate}
          className={`h-6 w-6 p-0 rounded-lg border transition-all ${isES ? "bg-emerald-500 border-emerald-500 text-black" : "bg-emerald-500/5 border-white/5 text-emerald-500/60 hover:bg-emerald-500/10"}`}>
          {translating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 focus-within:border-emerald-500/30 transition-all">
        <textarea id={id} key={`${scriptKey}-${isES ? "es" : "en"}`} defaultValue={value}
          onChange={e => onChange(e.target.value)}
          className="bg-transparent border-0 text-white/90 font-medium text-[11px] min-h-[36px] w-full outline-none resize-none leading-tight placeholder:text-white/10"
          placeholder="Script de voz..." />
      </div>
    </div>
  );
}

function PromptSections({ sceneKey, sections, isES, esCache, enOverride, contentVersion, translating, dataAttr, idx, onTranslate, onChange }: {
  sceneKey: string; sections: { tag: string; content: string }[];
  isES: boolean; esCache: Record<string, string>; enOverride: Record<string, string>;
  contentVersion: Record<string, number>; translating: boolean;
  dataAttr: string; idx: number;
  onTranslate: () => void; onChange: (tag: string, val: string) => void;
}) {
  const version = contentVersion[sceneKey] || 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black text-amber-500/80 uppercase tracking-[0.2em]">Prompt Visual</label>
        <Button variant="ghost" size="sm" disabled={translating} onClick={onTranslate}
          className={`h-7 w-7 p-0 rounded-xl border transition-all ${isES ? "bg-amber-500 border-amber-500 text-black" : "bg-amber-500/5 border-white/5 text-amber-500/60 hover:bg-amber-500/10"}`}>
          {translating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-4 h-4" />}
        </Button>
      </div>
      <div className="space-y-1.5">
        {sections.map(({ tag, content }) => {
          const compKey = `${sceneKey}___${tag}`;
          const display = isES ? (esCache[compKey] || content) : (enOverride[compKey] || content);
          return (
            <div key={tag} className="group space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 transition-all">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">{tag.replace(/:/g, "")}</span>
              <textarea key={`${compKey}-v${version}`} {...{ [dataAttr]: idx }} data-tag={tag}
                defaultValue={display} onChange={e => onChange(tag, e.target.value)}
                className="bg-transparent border-0 text-amber-100/70 font-medium text-[10px] w-full outline-none resize-none leading-normal"
                rows={Math.max(1, display.split("\n").length)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
