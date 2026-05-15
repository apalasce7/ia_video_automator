"use client";
import React, { useState } from "react";
import { X, Zap, RefreshCw, Languages, Code, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toVideoUrl, parseSections, NOMINAL_ORDER } from "@/lib/utils";

export function ResultModal({ 
  data, 
  onClose, 
  handleContinueJob, 
  handleApproveScene, 
  handleRegenerateScene,
  showTranslation = {},
  translating = {},
  esCache = {},
  enOverride = {},
  contentVersion = {},
  handlePromptTranslation,
  handleScriptTranslation,
  liveValuesRef = { current: {} } as React.MutableRefObject<Record<string, string>>,
  dirtyTagsRef = { current: {} } as React.MutableRefObject<Record<string, Set<string>>>,
  setEsCache,
  setEnOverride
}: { 
  data: any; 
  onClose: () => void; 
  handleContinueJob?: (id: string, prompt: any) => void; 
  handleApproveScene?: (id: string) => void; 
  handleRegenerateScene?: (id: string, prompt?: string, script?: string, idx?: number) => void;
  showTranslation?: Record<string, boolean>;
  translating?: Record<string, boolean>;
  esCache?: Record<string, string>;
  enOverride?: Record<string, string>;
  contentVersion?: Record<string, number>;
  handlePromptTranslation?: (sceneKey: string, sections: any[]) => void;
  handleScriptTranslation?: (sceneKey: string, originalContent: string) => void;
  liveValuesRef?: React.MutableRefObject<Record<string, string>>;
  dirtyTagsRef?: React.MutableRefObject<Record<string, Set<string>>>;
  setEsCache?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setEnOverride?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  if (!data) return null;
  const { label, value, payload, jobId, isEditable, keyName } = data;

  const isUrl = typeof value === "string" && (value.startsWith("http") || value.includes("/downloads/"));
  const isVideo = isUrl && (value.split('?')[0].endsWith(".mp4") || value.split('?')[0].endsWith(".webm"));
  const isImage = isUrl && (value.split('?')[0].endsWith(".jpg") || value.split('?')[0].endsWith(".png") || value.split('?')[0].endsWith(".webp"));
  const isObject = typeof value === "object";

  const highlightText = (text: string) => {
    if (!text) return text;
    const parts = text.split(/(@Image\d|1\.\sSubject|2\.\sTimeline|3\.\sAudio|Cronología:|Sujeto y Escena:|Audio y Música:)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@Image")) {
        return <span key={i} className="text-violet-400 font-black">{part}</span>;
      }
      if (part.match(/(\d\.\s|Cronología|Sujeto|Audio y Música)/)) {
        return <span key={i} className="text-amber-400 font-black border-b border-amber-500/20 pb-1 inline-block mt-4 mb-2">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0a0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-violet-600 rounded-full" />
            <div>
              <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">Pipeline Insight</h3>
              <p className="text-xl font-bold text-white uppercase tracking-tight">{label}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-gradient-to-b from-transparent to-violet-500/5">
          <div className="flex flex-col gap-8">
            <div className="space-y-4 min-w-0">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Resultado de Fase</label>
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 min-h-[100px] text-sm text-white/80 font-sans leading-relaxed">
                {typeof value === 'object' && (value?.prompt_visual_ingles || value?.escenas) && isEditable ? (
                  <div className="space-y-6">
                    <p className="text-amber-500 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-3 h-3 fill-current" /> Pausa de Edición UGC
                    </p>

                    {value.escenas ? (
                      <div className="space-y-8">
                        <div className="p-6 rounded-2xl bg-violet-600/10 border border-violet-500/20">
                          <label className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block mb-2">Premisa del Director</label>
                          <Textarea
                            defaultValue={value.premisa}
                            id="manual-premise-editor"
                            className="bg-black/40 border-violet-500/30 text-white text-xs min-h-[60px]"
                          />
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Escenas Planificadas ({value.escenas.length})</label>
                          {value.escenas.map((scene: any, idx: number) => (
                            <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 hover:border-violet-500/20 transition-colors">
                              <div className="flex items-center justify-between">
                                <Badge className="bg-violet-600 text-[10px]">Escena {scene.id}</Badge>
                                <span className="text-[10px] font-mono text-white/40">{scene.duracion}s | {scene.audio_mode}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <span className="text-[9px] font-bold text-white/20 uppercase">Guion / Locución</span>
                                  <Textarea
                                    defaultValue={scene.script_completo || scene.script}
                                    id={`scene-script-${idx}`}
                                    className="bg-black/40 border-white/10 text-white text-xs min-h-[80px]"
                                  />
                                </div>
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-white/20 uppercase">Prompt Visual</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const sceneKey = `modal-${idx}`;
                                          const originalPrompt = scene.prompt_visual_ingles || scene.prompt_visual || '';
                                          const sections = parseSections(originalPrompt).map(s => ({ tag: s.tag, originalContent: s.content }));
                                          handlePromptTranslation?.(sceneKey, sections);
                                        }}
                                        className={`h-6 px-2 flex items-center justify-center rounded-lg transition-all border ${showTranslation[`modal-${idx}`] ? 'bg-amber-500 border-amber-500 text-black' : 'bg-amber-500/5 border-amber-500/10 text-amber-500/50 hover:text-amber-500'}`}
                                      >
                                        {translating[`modal-${idx}`] ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Languages className="w-3 h-3 mr-1" />}
                                        <span className="text-[9px] font-black">{showTranslation[`modal-${idx}`] ? 'ES' : 'EN'}</span>
                                      </Button>
                                    </div>

                                    {/* Master Input (Oculto) */}
                                    <textarea 
                                      id={`scene-prompt-${idx}`} 
                                      className="hidden" 
                                      defaultValue={scene.prompt_visual_ingles || scene.prompt_visual} 
                                    />

                                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                      {(() => {
                                        const sceneKey = `modal-${idx}`;
                                        const isES = showTranslation[sceneKey];
                                        const originalPrompt = scene.prompt_visual_ingles || scene.prompt_visual || '';
                                        
                                        return parseSections(originalPrompt).map(({ tag, content }) => {
                                          const compositeKey = `${sceneKey}___${tag}`;
                                          const tagLabel = tag.replace(/[\[\]:]/g, '');
                                          const displayValue = isES ? (esCache[compositeKey] || content) : (enOverride[compositeKey] || content);
                                          
                                          return (
                                            <div key={tag} className="group space-y-1 p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-amber-500/20 transition-all">
                                              <span className="text-[7px] font-black text-white/20 uppercase tracking-widest block">{tagLabel}</span>
                                              <Textarea
                                                key={`${compositeKey}-v${contentVersion[sceneKey] || 0}`}
                                                data-modal-prompt={idx} 
                                                data-tag={tag}
                                                defaultValue={displayValue}
                                                onChange={(e) => {
                                                  const newVal = e.target.value;
                                                  liveValuesRef.current[compositeKey] = newVal;
                                                  
                                                  if (isES) {
                                                    if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
                                                    dirtyTagsRef.current[sceneKey].add(tag);
                                                  } else {
                                                    const allParts = Array.from(document.querySelectorAll(`[data-modal-prompt="${idx}"]`)) as HTMLTextAreaElement[];
                                                    const merged = allParts.sort((a, b) => NOMINAL_ORDER.indexOf(a.getAttribute('data-tag')!) - NOMINAL_ORDER.indexOf(b.getAttribute('data-tag')!))
                                                                       .map(p => `${p.getAttribute('data-tag')} ${p.value}`).join('\n');
                                                    const master = document.getElementById(`scene-prompt-${idx}`) as HTMLTextAreaElement;
                                                    if (master) master.value = merged.trim();
                                                  }
                                                }}
                                                className="bg-transparent border-0 text-amber-200/60 font-mono text-[10px] p-0 focus-visible:ring-0 resize-none leading-relaxed min-h-[40px]"
                                                rows={Math.max(2, displayValue.split('\n').length)}
                                              />
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs h-14 shadow-lg shadow-emerald-500/20 rounded-2xl"
                          onClick={() => {
                            const newPlan = { ...value };
                            const premiseEl = document.getElementById('manual-premise-editor') as HTMLTextAreaElement;
                            if (premiseEl) newPlan.premisa = premiseEl.value;

                            newPlan.escenas = newPlan.escenas.map((s: any, idx: number) => {
                              const sEl = document.getElementById(`scene-script-${idx}`) as HTMLTextAreaElement;
                              const pEl = document.getElementById(`scene-prompt-${idx}`) as HTMLTextAreaElement;
                              return {
                                ...s,
                                script_completo: sEl?.value || s.script_completo,
                                script: sEl?.value || s.script,
                                prompt_visual_ingles: pEl?.value || s.prompt_visual_ingles,
                                prompt_visual: pEl?.value || s.prompt_visual
                              };
                            });

                            handleContinueJob?.(jobId || "", newPlan);
                          }}
                        >
                          🚀 APROBAR PLAN Y LANZAR PRODUCCIÓN COMPLETA
                        </Button>
                      </div>
                    ) : keyName === 'video' ? (
                      /* CASO C: Fase de Vídeo (Regeneración de Escena Individual) */
                      <div className="space-y-6">
                        <div className="group relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-black aspect-[9/16] max-h-[70vh] mx-auto flex items-center justify-center">
                          <video
                            src={value}
                            controls
                            className="max-w-full max-h-full object-contain"
                            style={{ objectFit: 'contain' }}
                            autoPlay
                          />
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-amber-500 text-black font-black uppercase tracking-widest text-[9px]">Escena en Revisión</Badge>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter block">Prompt Visual Utilizado</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const sceneKey = `modal-single-${jobId}`;
                                  const originalPrompt = payload?.prompt || payload?.prompt_visual_ingles || '';
                                  const sections = parseSections(originalPrompt).map(s => ({ tag: s.tag, originalContent: s.content }));
                                  handlePromptTranslation?.(sceneKey, sections);
                                }}
                                className={`h-6 px-2 flex items-center justify-center rounded-lg transition-all border ${showTranslation[`modal-single-${jobId}`] ? 'bg-amber-500 border-amber-500 text-black' : 'bg-amber-500/5 border-amber-500/10 text-amber-500/50 hover:text-amber-500'}`}
                              >
                                {translating[`modal-single-${jobId}`] ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Languages className="w-3 h-3 mr-1" />}
                                <span className="text-[9px] font-black">{showTranslation[`modal-single-${jobId}`] ? 'ES' : 'EN'}</span>
                              </Button>
                            </div>

                            {/* Master Input (Oculto) */}
                            <textarea 
                              id="manual-scene-prompt-editor" 
                              className="hidden" 
                              defaultValue={payload?.prompt || payload?.prompt_visual_ingles || ""} 
                            />

                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                              {(() => {
                                const sceneKey = `modal-single-${jobId}`;
                                const isES = showTranslation[sceneKey];
                                const originalPrompt = payload?.prompt || payload?.prompt_visual_ingles || '';
                                
                                return parseSections(originalPrompt).map(({ tag, content }) => {
                                  const compositeKey = `${sceneKey}___${tag}`;
                                  const tagLabel = tag.replace(/[\[\]:]/g, '');
                                  const displayValue = isES ? (esCache[compositeKey] || content) : (enOverride[compositeKey] || content);
                                  
                                  return (
                                    <div key={tag} className="group space-y-1 p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-amber-500/20 transition-all">
                                      <span className="text-[7px] font-black text-white/20 uppercase tracking-widest block">{tagLabel}</span>
                                      <Textarea
                                        key={`${compositeKey}-v${contentVersion[sceneKey] || 0}`}
                                        data-modal-single-prompt={jobId} 
                                        data-tag={tag}
                                        defaultValue={displayValue}
                                        onChange={(e) => {
                                          const newVal = e.target.value;
                                          liveValuesRef.current[compositeKey] = newVal;
                                          
                                          if (isES) {
                                            if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
                                            dirtyTagsRef.current[sceneKey].add(tag);
                                          } else {
                                            const allParts = Array.from(document.querySelectorAll(`[data-modal-single-prompt="${jobId}"]`)) as HTMLTextAreaElement[];
                                            const merged = allParts.sort((a, b) => NOMINAL_ORDER.indexOf(a.getAttribute('data-tag')!) - NOMINAL_ORDER.indexOf(b.getAttribute('data-tag')!))
                                                               .map(p => `${p.getAttribute('data-tag')} ${p.value}`).join('\n');
                                            const master = document.getElementById('manual-scene-prompt-editor') as HTMLTextAreaElement;
                                            if (master) master.value = merged.trim();
                                          }
                                        }}
                                        className="bg-transparent border-0 text-amber-200/60 font-mono text-[10px] p-0 focus-visible:ring-0 resize-none leading-relaxed min-h-[40px]"
                                        rows={Math.max(2, displayValue.split('\n').length)}
                                      />
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                            <Button
                              className="h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/20"
                              onClick={() => {
                                if (handleApproveScene) handleApproveScene(jobId || "");
                                onClose();
                              }}
                            >
                              ✅ APROBAR Y SIGUIENTE ESCENA
                            </Button>

                            <Button
                              variant="outline"
                              className="h-14 bg-amber-500/10 border-amber-500/40 text-amber-500 hover:bg-amber-500 hover:text-black font-black text-xs rounded-2xl transition-all"
                              onClick={() => {
                                const el = document.getElementById('manual-scene-prompt-editor') as HTMLTextAreaElement;
                                if (handleRegenerateScene) handleRegenerateScene(jobId || "", el.value);
                                onClose();
                              }}
                            >
                              🔄 REGENERAR ESTA ESCENA
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* CASO B: Escena Individual (Prompt simple - Director antiguo o fallback) */
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Prompt Visual para IA</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const sceneKey = `modal-fallback-${jobId}`;
                                const originalPrompt = value.prompt_visual_ingles || value.prompt_visual || '';
                                const sections = parseSections(originalPrompt).map(s => ({ tag: s.tag, originalContent: s.content }));
                                handlePromptTranslation?.(sceneKey, sections);
                              }}
                              className={`h-6 px-2 flex items-center justify-center rounded-lg transition-all border ${showTranslation[`modal-fallback-${jobId}`] ? 'bg-amber-500 border-amber-500 text-black' : 'bg-amber-500/5 border-amber-500/10 text-amber-500/50 hover:text-amber-500'}`}
                            >
                              {translating[`modal-fallback-${jobId}`] ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Languages className="w-3 h-3 mr-1" />}
                              <span className="text-[9px] font-black">{showTranslation[`modal-fallback-${jobId}`] ? 'ES' : 'EN'}</span>
                            </Button>
                          </div>

                          {/* Master Input (Oculto) */}
                          <textarea 
                            id="manual-prompt-editor" 
                            className="hidden" 
                            defaultValue={value.prompt_visual_ingles || value.prompt_visual} 
                          />

                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {(() => {
                              const sceneKey = `modal-fallback-${jobId}`;
                              const isES = showTranslation[sceneKey];
                              const originalPrompt = value.prompt_visual_ingles || value.prompt_visual || '';
                              
                              return parseSections(originalPrompt).map(({ tag, content }) => {
                                const compositeKey = `${sceneKey}___${tag}`;
                                const tagLabel = tag.replace(/[\[\]:]/g, '');
                                const displayValue = isES ? (esCache[compositeKey] || content) : (enOverride[compositeKey] || content);
                                
                                return (
                                  <div key={tag} className="group space-y-1 p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-amber-500/20 transition-all">
                                    <span className="text-[7px] font-black text-white/20 uppercase tracking-widest block">{tagLabel}</span>
                                    <Textarea
                                      key={`${compositeKey}-v${contentVersion[sceneKey] || 0}`}
                                      data-modal-fallback-prompt={jobId} 
                                      data-tag={tag}
                                      defaultValue={displayValue}
                                      onChange={(e) => {
                                        const newVal = e.target.value;
                                        liveValuesRef.current[compositeKey] = newVal;
                                        
                                        if (isES) {
                                          if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
                                          dirtyTagsRef.current[sceneKey].add(tag);
                                        } else {
                                          const allParts = Array.from(document.querySelectorAll(`[data-modal-fallback-prompt="${jobId}"]`)) as HTMLTextAreaElement[];
                                          const merged = allParts.sort((a, b) => NOMINAL_ORDER.indexOf(a.getAttribute('data-tag')!) - NOMINAL_ORDER.indexOf(b.getAttribute('data-tag')!))
                                                             .map(p => `${p.getAttribute('data-tag')} ${p.value}`).join('\n');
                                          const master = document.getElementById('manual-prompt-editor') as HTMLTextAreaElement;
                                          if (master) master.value = merged.trim();
                                        }
                                      }}
                                      className="bg-transparent border-0 text-amber-200/60 font-mono text-[10px] p-0 focus-visible:ring-0 resize-none leading-relaxed min-h-[40px]"
                                      rows={Math.max(2, displayValue.split('\n').length)}
                                    />
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 text-[12px] text-white/70 whitespace-pre-wrap break-words leading-relaxed select-text">
                          <span className="text-[9px] font-bold text-violet-400/50 uppercase block mb-2 tracking-widest">Previsualización con Colores (Guía Visual)</span>
                          {highlightText(value.prompt_visual_ingles)}
                        </div>

                        <Button
                          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-14 shadow-lg shadow-amber-500/20 rounded-2xl"
                          onClick={() => {
                            const el = document.getElementById('manual-prompt-editor') as HTMLTextAreaElement;
                            handleContinueJob?.(jobId || "", el.value);
                          }}
                        >
                          🚀 CONFIRMAR Y GENERAR VÍDEO
                        </Button>
                      </div>
                    )}

                    <div className="mt-8 border-t border-white/5 pt-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                      <p className="text-white/40 text-[10px] uppercase font-black mb-4 tracking-[0.2em] flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> Raw Phase Data (JSON)
                      </p>
                      <pre className="text-[10px] font-mono text-white/50 bg-black/80 p-5 rounded-2xl overflow-auto border border-white/5 max-h-[300px] custom-scrollbar shadow-inner whitespace-pre-wrap break-words">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : isImage ? (
                  <div className="group relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/40">
                    <img src={value} alt="Preview" className="w-full h-auto object-contain" />
                  </div>
                ) : isVideo ? (
                  <div className="group relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black aspect-[9/16] max-h-[70vh] mx-auto flex items-center justify-center">
                    <video
                      src={value}
                      controls
                      className="max-w-full max-h-full object-contain"
                      style={{ objectFit: 'contain' }}
                      autoPlay
                    />
                  </div>
                ) : isObject ? (
                  <pre className="text-[11px] font-mono bg-black/40 p-5 rounded-2xl overflow-x-auto custom-scrollbar border border-white/5 shadow-inner whitespace-pre-wrap break-words">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed break-words">{value}</div>
                )}
              </div>
            </div>

            {/* Sección de Payload — Ahora debajo del resultado si existe */}
            {(payload || isEditable) && (
              <div className="space-y-4 min-w-0">
                <label className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest block flex items-center gap-2">
                  <Code className="w-3 h-3" /> Petición Técnica (Payload Enviado a la API)
                </label>
                <div className="p-5 rounded-2xl bg-black/60 border border-amber-500/10 max-h-[400px] overflow-auto text-[11px] font-mono text-amber-400 custom-scrollbar shadow-inner shadow-black whitespace-pre-wrap break-words">
                  {payload ? (
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(payload, null, 2)}</pre>
                  ) : (
                    <span className="text-white/20 italic font-sans text-xs">No hay payload registrado para esta fase.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end">
          <Button onClick={onClose} className="bg-violet-600 hover:bg-violet-500 px-10 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-violet-600/20 active:scale-95 transition-all">Entendido</Button>
        </div>
      </div>
    </div>
  );
}
