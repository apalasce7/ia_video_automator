"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Sparkles,
  Video,
  Layers,
  Camera,
  Layout,
  Check,
  Trash2,
  Box,
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Code,
  Settings2,
  Film,
  MessageSquareText,
  Volume2,
  Globe,
  User,
  Brain,
  MonitorPlay,
  Target,
  Rocket,
  ExternalLink,
  Languages,
  X,
  Calendar,
  Activity,
  Zap,
  RefreshCw,
  Download,
  ShieldCheck,
  Terminal,
  Scissors,
  Eye,
  EyeOff,
  Pause,
  Play,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { CostCalculator } from "@/components/CostCalculator";
import { DropZone } from "@/components/DropZone";
import { PhaseIndicator } from "@/components/PhaseIndicator";
import { ClipEditor } from "@/components/ClipEditor";
import { ScenePreview } from "@/components/ScenePreview";
import { ResultModal } from "@/components/ResultModal";
import { toVideoUrl, parseSections, NOMINAL_ORDER, API_URL } from "@/lib/utils";
import { Job, Scene, ClipEdits, InspectedResult } from "@/lib/types";




// ─────────────────────────────────────────────
// Helper: convierte cualquier path/URL a URL válida del servidor
// Maneja: rutas absolutas Windows, rutas relativas, URLs ya completas
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Hook personalizado para Drag & Drop
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Componente Phase Indicator
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Componente Editor de Clips (Trimming)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Componente ScenePreview: Previsualización de escena con recorte
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Página Principal v2
// ─────────────────────────────────────────────
function DashboardContent() {
  const searchParams = useSearchParams();
  const urlJobId = searchParams?.get("jobId");

  useEffect(() => {
    if (urlJobId) {
      setSelectedJobId(urlJobId);
    }
  }, [urlJobId]);

  const [tiktokUrl, setTiktokUrl] = useState("");
  const [influencerFile, setInfluencerFile] = useState<File | null>(null);
  const [influencerSheet, setInfluencerSheet] = useState<File | null>(null);
  const [influencerName, setInfluencerName] = useState("");
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [productName, setProductName] = useState("");
  const [productDetails, setProductDetails] = useState("");

  // Ajustes de Producción
  const [duration, setDuration] = useState(5);
  const [cfgScale, setCfgScale] = useState(0.5);
  const [shotType, setShotType] = useState("customize");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [model, setModel] = useState("seedance");
  const [skipVideo, setSkipVideo] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [resolution, setResolution] = useState("480p");
  const [storyGuide, setStoryGuide] = useState("");
  const [audioMode, setAudioMode] = useState("lip-sync"); // lip-sync, voice-over, asmr, silent
  const [autoExecution, setAutoExecution] = useState(false);
  const [language, setLanguage] = useState("es"); // es, en, fr, de, it, pt
  const [editStyle, setEditStyle] = useState("fast-cuts"); // standard, fast-cuts, b-roll-focused
  const [activeTab, setActiveTab] = useState("create");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [directorModel, setDirectorModel] = useState("gemini-flash"); // gemini-flash, minimax, groq, gemini
  const [inputMode, setInputMode] = useState<"url" | "image">("url");
  const [directImage, setDirectImage] = useState<File | null>(null);
  const [autoSearchDetails, setAutoSearchDetails] = useState(false);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  const [influencerId, setInfluencerId] = useState<string>("new");
  const [savedInfluencers, setSavedInfluencers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<any>(null);

  // ── Sistema de Traducción DeepL ──
  // showTranslation[sceneKey] = true → modo ES
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  // esCache[`${sceneKey}___${tag}`] = texto en ES (cacheado)
  const [esCache, setEsCache] = useState<Record<string, string>>({});
  // enOverride[`${sceneKey}___${tag}`] = texto en EN tras traducción inversa
  const [enOverride, setEnOverride] = useState<Record<string, string>>({});
  // contentVersion[sceneKey] incrementa para forzar re-render de Textareas
  const [contentVersion, setContentVersion] = useState<Record<string, number>>({});
  // translating[sceneKey] = true → spinner activo
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  // Ref: último valor tecleado por el usuario en cada sección (sin trigger de re-render)
  const liveValuesRef = useRef<Record<string, string>>({});
  // Ref: qué tags han sido modificados desde la última traducción
  const dirtyTagsRef = useRef<Record<string, Set<string>>>({});

  // --- NUEVOS ESTADOS PARA ANÁLISIS ---
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null); // { job_id, video_url, frames, recommended_frame }
  const [selectedFrameUrl, setSelectedFrameUrl] = useState<string | null>(null);
  const [capturingFrame, setCapturingFrame] = useState(false);
  const [inspectedResult, setInspectedResult] = useState<{ label: string, value: any, payload?: any } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [editingClip, setEditingClip] = useState<{ idx: number; videoUrl: string } | null>(null);

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const handleSaveClipEdits = async (jobId: string, sceneIdx: number, clipEdits: any) => {
    try {
      const job = jobs.find((j: any) => j.id === jobId);
      if (!job) return;

      const allEdits = { ...job.data.scene_edits || {} };
      allEdits[String(sceneIdx)] = clipEdits;

      const formData = new FormData();
      formData.append("edits", JSON.stringify(allEdits));

      const res = await fetch(`${API_URL}/api/jobs/${jobId}/save_edits`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        // Optimistic update
        setJobs((prevJobs) => 
          prevJobs.map(j => {
            if (j.id === jobId) {
              return {
                ...j,
                data: {
                  ...j.data,
                  scene_edits: allEdits
                }
              };
            }
            return j;
          })
        );
        setEditingClip(null);
        fetchJobs();
      }
    } catch (err) {
      console.error("Error saving clip edits:", err);
    }
  };

  const activeJob = jobs.find(j => j.id === selectedJobId);

  // ── Helper: llamada al proxy DeepL ──
  const translateWithDeepL = async (texts: string[], targetLang: string): Promise<string[]> => {
    try {
      const res = await fetch(`${API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, target_lang: targetLang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return (data.translations as any[]).map((t: any) => t.text);
    } catch (e) {
      console.error('[DeepL]', e);
      return texts; // fallback: devolvemos el original
    }
  };

  // ── Toggle Traducción: gestiona caché + dirty + traducción inversa ──
  const handlePromptTranslation = async (
    sceneKey: string,
    sections: { tag: string; originalContent: string }[]
  ) => {
    const isCurrentlyES = showTranslation[sceneKey];
    setTranslating(prev => ({ ...prev, [sceneKey]: true }));

    try {
      if (!isCurrentlyES) {
        // ── Cambio EN → ES ──
        const newEsCache: Record<string, string> = {};
        const toTranslate: { compositeKey: string; text: string }[] = [];

        for (const { tag, originalContent } of sections) {
          const compositeKey = `${sceneKey}___${tag}`;
          const currentVal = liveValuesRef.current[compositeKey] ?? originalContent;
          const cached = esCache[compositeKey];
          const isDirty = dirtyTagsRef.current[sceneKey]?.has(tag);

          if (cached && !isDirty) {
            newEsCache[compositeKey] = cached; // usar caché
          } else {
            toTranslate.push({ compositeKey, text: currentVal });
          }
        }

        if (toTranslate.length > 0) {
          // Proteger diálogos: no traducir contenido entre comillas
          const protectedMap: Record<number, string> = {};
          const textsToTranslate = toTranslate.map((t, idx) => {
            if (t.compositeKey.toUpperCase().includes('DIALOGUE')) {
              const match = t.text.match(/(['"])([^'"]*)(['"])/);
              if (match) {
                protectedMap[idx] = match[2];
                // Reemplazamos por un placeholder que DeepL no suele tocar
                return t.text.replace(match[2], 'PROTECTED_SPOKEN_TEXT');
              }
            }
            return t.text;
          });

          const translated = await translateWithDeepL(textsToTranslate, 'ES');

          toTranslate.forEach(({ compositeKey }, i) => {
            let val = translated[i];
            if (protectedMap[i] !== undefined) {
              val = val.replace('PROTECTED_SPOKEN_TEXT', protectedMap[i]);
            }
            newEsCache[compositeKey] = val;
          });
        }

        setEsCache(prev => ({ ...prev, ...newEsCache }));
        setShowTranslation(prev => ({ ...prev, [sceneKey]: true }));
        setContentVersion(prev => ({ ...prev, [sceneKey]: (prev[sceneKey] || 0) + 1 }));
        if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
        dirtyTagsRef.current[sceneKey].clear();

      } else {
        // ── Cambio ES → EN ──
        const dirtySet = dirtyTagsRef.current[sceneKey] || new Set<string>();
        const dirtyList = [...dirtySet];

        if (dirtyList.length > 0) {
          // Traducir de vuelta las secciones modificadas en ES
          const protectedMap: Record<number, string> = {};
          const textsToTranslate = dirtyList.map((tag, idx) => {
            const compositeKey = `${sceneKey}___${tag}`;
            const text = liveValuesRef.current[compositeKey] || esCache[compositeKey] || '';
            if (tag.toUpperCase().includes('DIALOGUE')) {
              const match = text.match(/(['"])([^'"]*)(['"])/);
              if (match) {
                protectedMap[idx] = match[2];
                return text.replace(match[2], 'PROTECTED_SPOKEN_TEXT');
              }
            }
            return text;
          });

          const translated = await translateWithDeepL(textsToTranslate, 'EN-US');
          const newEnOverride: Record<string, string> = {};
          dirtyList.forEach((tag, i) => {
            let val = translated[i];
            if (protectedMap[i] !== undefined) {
              val = val.replace('PROTECTED_SPOKEN_TEXT', protectedMap[i]);
            }
            newEnOverride[`${sceneKey}___${tag}`] = val;
          });
          setEnOverride(prev => ({ ...prev, ...newEnOverride }));
        }

        setShowTranslation(prev => ({ ...prev, [sceneKey]: false }));
        setContentVersion(prev => ({ ...prev, [sceneKey]: (prev[sceneKey] || 0) + 1 }));
        if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
        dirtyTagsRef.current[sceneKey].clear();

        // Sincronizar con el Master DOM tras la traducción inversa
        setTimeout(() => {
          // Intentar sincronizar tanto en el monitor como en el modal (si aplica)
          const sceneIdx = sceneKey.split('-').pop();
          const parts = Array.from(document.querySelectorAll(`[data-edit-prompt="${sceneIdx}"], [data-scene-prompt="${sceneIdx}"]`)) as HTMLTextAreaElement[];
          if (parts.length > 0) {
            const merged = parts.sort((a, b) => NOMINAL_ORDER.indexOf(a.getAttribute('data-tag')!) - NOMINAL_ORDER.indexOf(b.getAttribute('data-tag')!))
              .map(p => `${p.getAttribute('data-tag')} ${p.value}`).join('\n');
            const jobId = sceneKey.substring(0, sceneKey.lastIndexOf('-'));
            // Intentar varios IDs de master (plan-prompt o edit-prompt)
            const masterIds = [`edit-prompt-${jobId}-${sceneIdx}`, `plan-prompt-${sceneIdx}`];
            masterIds.forEach(id => {
              const master = document.getElementById(id) as HTMLTextAreaElement;
              if (master) master.value = merged.trim();
            });
          }
        }, 150);
      }
    } finally {
      setTranslating(prev => ({ ...prev, [sceneKey]: false }));
    }
  };

  const handleScriptTranslation = async (sceneKey: string, originalContent: string) => {
    const scriptKey = sceneKey + "___SCRIPT";
    const isCurrentlyES = showTranslation[scriptKey];
    setTranslating(prev => ({ ...prev, [scriptKey]: true }));

    try {
      if (!isCurrentlyES) {
        // ── EN/Other → ES ──
        const currentVal = liveValuesRef.current[scriptKey] ?? originalContent;
        const cached = esCache[scriptKey];
        const isDirty = dirtyTagsRef.current[sceneKey]?.has("SCRIPT");

        if (cached && !isDirty) {
          setShowTranslation(prev => ({ ...prev, [scriptKey]: true }));
        } else {
          const translated = await translateWithDeepL([currentVal], 'ES');
          setEsCache(prev => ({ ...prev, [scriptKey]: translated[0] }));
          setShowTranslation(prev => ({ ...prev, [scriptKey]: true }));
        }
      } else {
        // ── ES → EN/Original ──
        const isDirty = dirtyTagsRef.current[sceneKey]?.has("SCRIPT");
        if (isDirty) {
          const currentES = liveValuesRef.current[scriptKey] || esCache[scriptKey] || "";
          const translated = await translateWithDeepL([currentES], 'EN-US');

          setEnOverride(prev => {
            const newValues = { ...prev, [scriptKey]: translated[0] };
            // Sincronizar con el bloque [DIALOGUE]
            const tagKey = '[DIALOGUE]:';
            const compKey = `${sceneKey}___${tagKey}`;
            const sceneIdx = parseInt(sceneKey.split('-').pop() || "0");
            const sceneObj = activeJob?.data?.story_plan?.escenas?.[sceneIdx];
            const originalDialogue = sceneObj ? (parseSections(sceneObj.prompt_visual_ingles || sceneObj.prompt_visual).find(s => s.tag === tagKey)?.content || "") : "";
            const oldDialogue = prev[compKey] || originalDialogue;
            if (oldDialogue) {
              const newVal = oldDialogue.replace(/(['"])([\s\S]*?)(['"])/, `$1${translated[0]}$3`);
              newValues[compKey] = newVal;
              liveValuesRef.current[compKey] = newVal;
            }
            return newValues;
          });
        }
        setShowTranslation(prev => ({ ...prev, [scriptKey]: false }));
      }
      setContentVersion(prev => {
        const scriptKey = sceneKey + "___SCRIPT";
        return {
          ...prev,
          [scriptKey]: (prev[scriptKey] || 0) + 1,
          [sceneKey]: (prev[sceneKey] || 0) + 1 // Forzar re-render de las secciones del prompt
        };
      });
      if (dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey].delete("SCRIPT");
    } finally {
      setTranslating(prev => ({ ...prev, [scriptKey]: false }));
    }
  };

  // ── Helper: construir secciones desde un prompt completo ──
  const parseSections = (prompt: string): { tag: string; content: string }[] => {
    const raw = prompt.split(/(\[[^\]]+\]:)/g);
    const pairs: { tag: string; content: string }[] = [];
    for (let i = 1; i < raw.length; i += 2) {
      pairs.push({ tag: raw[i], content: (raw[i + 1] || '').trim() });
    }
    // Reordenar: ACTION primero
    return [...pairs].sort((a, b) => {
      const aIsAction = a.tag.toUpperCase().includes('ACTION');
      const bIsAction = b.tag.toUpperCase().includes('ACTION');
      if (aIsAction && !bIsAction) return -1;
      if (!aIsAction && bIsAction) return 1;
      return 0;
    });
  };

  // ── Orden nominal para el master prompt (Seedance requiere EN) ──
  const NOMINAL_ORDER = [
    '[CAMERA]:', '[CHARACTER]:', '[SCENE & AUDIO]:', '[DIALOGUE]:',
    '[ACTION & TIMELINE]:', '[ACTION]:', '[TECHNICAL RESTRAINTS]:',
  ];

  // Efecto para "fijar" el primer job activo si no hay ninguno seleccionado
  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      const latestActive = [...jobs].reverse().find(j => j.status !== "completado" && !j.status.includes("error") && j.status !== "creado");
      if (latestActive) setSelectedJobId(latestActive.id);
      else setSelectedJobId(jobs[jobs.length - 1].id);
    }
  }, [jobs, selectedJobId]);

  // Polling de jobs
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/jobs`);
      const data = await res.json();
      setJobs(data);
    } catch (e) { /* backend offline */ }
  }, []);

  const fetchInfluencers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/influencers`);
      const data = await res.json();
      setSavedInfluencers(data);
    } catch (e) { /* backend offline */ }
  }, []);

  // Polling de jobs
  useEffect(() => {
    fetchJobs();
    fetchInfluencers();
    const interval = setInterval(() => {
      fetchJobs();
      fetchInfluencers();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchJobs, fetchInfluencers]);

  // Health check
  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(r => r.json())
      .then(setBackendStatus)
      .catch(() => setBackendStatus(null));
  }, []);

  // Auto-scroll a bloques de aprobación cuando el estado cambia a espera
  useEffect(() => {
    if (!activeJob) return;
    const waitingStatuses = [
      "esperando_aprobacion_imagen_base",
      "esperando_aprobacion_plan",
      "esperando_revision",
      "esperando_revision_siguiente_escena",
      "esperando_aprobacion_escena"
    ];
    if (waitingStatuses.includes(activeJob.status)) {
      setTimeout(() => {
        const header = document.getElementById("production-monitor-header");
        if (header) {
          header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [activeJob?.status]);

  // --- FUNCIÓN ANALIZAR ---
  const handleApproveBaseImage = async (jobId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/jobs/${jobId}/approve_base_image`, { method: "POST" });
      if (res.ok) {
        console.log("✅ Imagen base aprobada");
      }
    } catch (e) {
      console.error("Error approving base image:", e);
    }
  };

  const handleApproveScene = async (jobId: string) => {
    try {
      await fetch(`${API_URL}/api/jobs/${jobId}/scenes/approve`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegenerateScene = async (jobId: string, prompt?: string, script?: string, sceneIdx?: number) => {
    try {
      const formData = new FormData();
      if (prompt) formData.append("manual_prompt", prompt);
      if (script) formData.append("manual_script", script);
      if (sceneIdx !== undefined) formData.append("scene_idx", sceneIdx.toString());

      const res = await fetch(`${API_URL}/api/jobs/${jobId}/scenes/regenerate`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.status === "ok") {
        console.log("🔄 Regenerando escena...");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateNextScene = async (jobId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/jobs/${jobId}/scenes/generate_next`, { method: "POST" });
      if (res.ok) {
        console.log("🎬 Generando siguiente escena...");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnlockScene = async (jobId: string, sceneIdx?: number) => {
    try {
      const formData = new FormData();
      if (sceneIdx !== undefined) formData.append("scene_idx", sceneIdx.toString());
      const res = await fetch(`${API_URL}/api/jobs/${jobId}/unlock`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.status === "ok") {
        alert("⏪ Rebobinado completado. Ahora puedes editar el plan de esta escena.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectVersion = async (jobId: string, sceneIdx: number, versionIdx: number) => {
    try {
      const formData = new FormData();
      formData.append("version_idx", versionIdx.toString());
      const res = await fetch(`${API_URL}/api/jobs/${jobId}/scenes/${sceneIdx}/select_version`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.status === "ok") {
        // Forzar recarga de los datos del job
        const updatedRes = await fetch(`${API_URL}/api/jobs/${jobId}`);
        const updatedJob = await updatedRes.json();

        // Actualizar la lista de jobs para que la reactividad refresque el UI
        setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnalyze = async () => {
    if (!tiktokUrl) return;
    setAnalyzeLoading(true);
    setAnalysisResult(null);
    setSelectedFrameUrl(null);

    console.log(`[Analyze] Iniciando análisis para: ${tiktokUrl}`);
    console.log(`[Analyze] API URL: ${API_URL}/api/analyze`);

    try {
      const formData = new FormData();
      formData.append("tiktok_url", tiktokUrl);

      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body: formData,
        // Añadimos un timeout corto para detectar fallos de red rápido
        signal: AbortSignal.timeout(30000)
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("[Analyze] Respuesta recibida:", data);

      if (data.error) {
        alert("Error analizando: " + data.error);
      } else {
        setAnalysisResult(data);
        setSelectedFrameUrl(data.recommended_frame);
      }
    } catch (e: any) {
      console.error(" Error en handleAnalyze:", e);
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        alert("⏱️ La petición ha tardado demasiado. El backend podría estar procesando el vídeo, pero la conexión se cerró.");
      } else {
        alert("❌ Error de Conexión: " + e.message + "\n\nVerifica que el Backend (Python) esté corriendo en el puerto 8000.");
      }
    }
    setAnalyzeLoading(false);
  };

  // --- FUNCIÓN CAPTURAR MOMENTO ---
  const handleCaptureFrame = async () => {
    if (!videoRef.current || !analysisResult) return;
    setCapturingFrame(true);

    try {
      const timestamp = videoRef.current.currentTime;
      const formData = new FormData();
      formData.append("job_id", analysisResult.job_id);
      formData.append("timestamp", timestamp.toString());

      const res = await fetch(`${API_URL}/api/capture_frame`, { method: "POST", body: formData });
      const data = await res.json();

      if (data.frame_url) {
        // Añadir a los frames mostrados de forma segura
        setAnalysisResult((prev: any) => {
          if (!prev) return prev;
          const currentFrames = Array.isArray(prev.frames) ? prev.frames : [];
          return {
            ...prev,
            frames: [...currentFrames, data.frame_url]
          };
        });
        setSelectedFrameUrl(data.frame_url);
        alert("📸 Frame capturado con éxito!");
      } else if (data.error) {
        alert("❌ Error capturando frame: " + data.error);
      }
    } catch (e) {
      console.error("Error capturando frame:", e);
    }
    setCapturingFrame(false);
  };

  const handleSubmit = async () => {
    const isNewInfluencer = influencerId === "new";

    // Validación de entrada principal según el modo
    const hasMainInput = inputMode === "url" ? !!tiktokUrl : !!directImage;

    if (!hasMainInput || (isNewInfluencer && !influencerFile) || productFiles.length === 0 || !productDetails) {
      console.warn("[Submit] Validación fallida:", { hasMainInput, isNewInfluencer, influencerFile: !!influencerFile, productFiles: productFiles.length, productDetails: !!productDetails });
      return;
    }

    setLoading(true);

    try {
      // 1. Subir todo al backend
      const formData = new FormData();

      if (inputMode === "url") {
        formData.append("tiktok_url", tiktokUrl);
        if (selectedFrameUrl) {
          formData.append("selected_frame_url", selectedFrameUrl);
        }
      } else {
        if (directImage) formData.append("direct_image", directImage);
      }

      if (analysisResult?.job_id) {
        formData.append("job_id", analysisResult.job_id);
      }

      if (isNewInfluencer) {
        formData.append("influencer_image", influencerFile!);
        if (influencerSheet) formData.append("influencer_sheet", influencerSheet);
        formData.append("influencer_name", influencerName || "Modelo");
      } else {
        formData.append("influencer_id", influencerId);
      }
      productFiles.forEach((f) => formData.append("product_images", f));
      formData.append("product_name", productName || "Producto");
      formData.append("product_details", productDetails);

      // Ajustes avanzados
      formData.append("duration", duration.toString());
      formData.append("cfg_scale", cfgScale.toString());
      formData.append("shot_type", shotType);
      formData.append("negative_prompt", negativePrompt);
      formData.append("model", model);
      formData.append("debug_mode", debugMode.toString());
      formData.append("resolution", resolution);
      if (storyGuide) formData.append("story_guide", storyGuide);
      formData.append("audio_mode", audioMode);
      formData.append("auto_execution", autoExecution.toString());
      formData.append("language", language);
      formData.append("edit_style", editStyle);
      formData.append("director_model", directorModel);

      const uploadRes = await fetch(`${API_URL}/api/produce`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(60000) // 1 minuto de margen para subidas pesadas
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Fallo en el servidor (${uploadRes.status}): ${errorText}`);
      }

      const uploadData = await uploadRes.json();

      if (uploadData.error) {
        throw new Error(uploadData.error);
      }

      const jobId = uploadData.job_id;
      console.log(`[Submit] Job creado y pipeline iniciado: ${jobId}`);

      // Reset formulario
      setTiktokUrl("");
      setInfluencerId("new");
      setInfluencerFile(null);
      setInfluencerSheet(null);
      setInfluencerName("");
      setProductFiles([]);
      setProductName("");
      setProductDetails("");
      setAnalysisResult(null);
      setSelectedFrameUrl(null);
      setDirectImage(null);
      setSelectedJobId(jobId); // ← Apuntar directamente al nuevo job (antes era null y podía elegir el equivocado)
      setActiveTab("monitor"); // Saltar al monitor automáticamente

      alert(`🚀 Producción Iniciada!\n\nID del Trabajo: ${jobId.substring(0, 8)}...`);

    } catch (e: any) {
      console.error("Error lanzando pipeline:", e);
      alert(`❌ Error al iniciar producción:\n${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueJob = async (jobId: string, promptOrPlan: any) => {
    try {
      const formData = new FormData();
      if (typeof promptOrPlan === "string") {
        formData.append("prompt", promptOrPlan);
      } else {
        formData.append("plan", JSON.stringify(promptOrPlan));
      }

      const res = await fetch(`${API_URL}/api/jobs/${jobId}/continue`, { method: "POST", body: formData });
      if (res.ok) {
        setInspectedResult(null);
      }
    } catch (e) {
      console.error("Error continuing job:", e);
    }
  };

  const handlePurgeJob = async (jobId: string) => {
    try {
      await fetch(`${API_URL}/api/jobs/${jobId}/purge`, { method: "POST" });
    } catch (e) {
      console.error("Error purging job:", e);
    }
  };

  const handleSaveToLibrary = async (jobId: string, name: string) => {
    if (!name) {
      alert("Por favor, introduce un nombre para la modelo.");
      return;
    }

    setLoading(true);
    try {
      let res;
      // CASO A: Influencer Nueva (Subida directa desde el formulario)
      if (influencerId === "new" && influencerFile) {
        console.log("[Library] Guardando modelo NUEVA directamente...");
        const formData = new FormData();
        formData.append("name", name);
        formData.append("image", influencerFile);
        if (influencerSheet) formData.append("sheet", influencerSheet);

        res = await fetch(`${API_URL}/api/influencers/create`, { method: "POST", body: formData });
      }
      // CASO B: Influencer desde un Trabajo (Job) existente
      else {
        const targetJobId = jobId === "last" ? (jobs[0]?.id || "") : jobId;
        if (!targetJobId) {
          alert("No hay ningún trabajo reciente para guardar.");
          setLoading(false);
          return;
        }
        console.log(`[Library] Guardando modelo desde JOB: ${targetJobId}`);
        const formData = new FormData();
        formData.append("job_id", targetJobId);
        formData.append("name", name);
        res = await fetch(`${API_URL}/api/influencers/save`, { method: "POST", body: formData });
      }

      if (!res.ok) throw new Error(`Fallo en el servidor: ${res.status}`);

      const data = await res.json();
      if (data.status === "ok") {
        alert(`✅ Influencer '${name}' guardada correctamente.`);
        // Refrescar lista de influencers
        const infRes = await fetch(`${API_URL}/api/influencers`);
        const infData = await infRes.json();
        setSavedInfluencers(infData);
      } else {
        alert("Error: " + data.error);
      }
    } catch (e: any) {
      console.error("Error saving to library:", e);
      alert("❌ Error al guardar: " + e.message + "\n\nVerifica que el servidor esté activo.");
    }
    setLoading(false);
  };

  const handleReplayJob = async (jobId: string, phase: number, selectedDirectorModel?: string) => {
    try {
      const formData = new FormData();
      formData.append("phase", phase.toString());
      if (selectedDirectorModel) {
        formData.append("director_model", selectedDirectorModel);
      }
      await fetch(`${API_URL}/api/jobs/${jobId}/replay`, { method: "POST", body: formData });
    } catch (e) {
      console.error("Error replaying job:", e);
    }
  };

  const handleSearchProduct = async () => {
    if (!productName) return;
    setIsSearchingProduct(true);
    try {
      const res = await fetch(`${API_URL}/api/search_product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: productName })
      });
      const data = await res.json();
      if (data.details) {
        setProductDetails(data.details);
      }
    } catch (e) {
      console.error("Error searching product:", e);
    }
    setIsSearchingProduct(false);
  };

  const handleRegenerateAssembly = async (jobId: string) => {
    try {
      await fetch(`${API_URL}/api/jobs/${jobId}/assemble`, { method: "POST" });
    } catch (e) {
      console.error("Error regenerating assembly:", e);
    }
  };

  const phaseLabels: Record<string, string> = {
    download: "Analizar Viral",
    extract_frames: "Extraer Fotograma",
    select_frame: "Seleccionar Frame",
    base_image_start: "Clonar Influencer",
    base_image: "Generar Imagen Base",
    elements: "Registrar Elementos",
    director: "IA Director",
    video: "Producción Escenas",
    ffmpeg: "Ensamblaje Final",
  };

  const getProgressValue = (job: any) => {
    if (!job || !job.phases) return 0;
    // Unificamos a 9 fases según el nuevo esquema del backend
    const total = 9;
    const completed = Object.values(job.phases).filter((s: any) => typeof s === "string" && s.includes("✅")).length;
    const progress = Math.round((completed / total) * 100);
    return isNaN(progress) ? 0 : Math.min(100, progress);
  };

  const handleDownloadVideo = async (url: string, filename: string) => {
    try {
      const response = await fetch(toVideoUrl(url));
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "video_ugc.mp4";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Error downloading video:", e);
      // Fallback: abrir en nueva pestaña
      window.open(toVideoUrl(url), "_blank");
    }
  };

  const isFormValid = (inputMode === "url" ? (tiktokUrl && (!analysisResult || selectedFrameUrl)) : !!directImage) &&
    (influencerId !== "new" || influencerFile) &&
    productFiles.length > 0 &&
    productDetails;

  return (
    <div className="dark min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-violet-500/30">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/30 via-transparent to-pink-950/20 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-violet-500/40 transform hover:rotate-3 transition-transform cursor-default">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                  UGC AUTOMATOR v2
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-2 py-0">Pipeline Ready</Badge>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-tight">Wavespeed AI · Seedance 2.0</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-white/50 max-w-lg leading-relaxed">
              Transforma cualquier tendencia de TikTok en tu próxima campaña ganadora.
              Extrae la pose, clona la identidad y genera anuncios virales en minutos.
            </p>
          </div>

          {/* Status bar */}
          {backendStatus && (
            <div className="flex gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Wavespeed</span>
                <span className={`text-[11px] font-bold ${backendStatus.wavespeed_api?.includes("✅") ? "text-emerald-400" : "text-red-400"}`}>
                  {backendStatus.wavespeed_api?.includes("✅") ? "Connected" : "Offline"}
                </span>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-white/30 tracking-widest">MiniMax</span>
                <span className={`text-[11px] font-bold ${backendStatus.minimax_api?.includes("✅") ? "text-emerald-400" : "text-red-400"}`}>
                  {backendStatus.minimax_api?.includes("✅") ? "Active" : "Offline"}
                </span>
              </div>
            </div>
          )}
        </div>

        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm shadow-xl shadow-black/20 overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-lg">Mesa de Montaje</CardTitle>
                <CardDescription className="text-white/40">Control de producción escena a escena.</CardDescription>
              </div>
              {activeJob && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  Trabajo en Curso: {activeJob.id.slice(0, 8)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!activeJob ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                  <MonitorPlay className="w-10 h-10 text-white/10" />
                </div>
                <div className="space-y-1">
                  <p className="text-white/40 font-bold">Sin Producciones Activas</p>
                  <p className="text-white/20 text-xs">Comienza una nueva producción en el "Estudio de Creación".</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">

                {/* SIDEBAR STICKY IZQUIERDO */}
                <aside className="lg:w-[320px] shrink-0 space-y-6 lg:sticky lg:top-10 h-fit">

                  <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-2xl">
                    <div className="flex items-center gap-3 mb-6 px-1">
                      <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Pipeline</h3>
                        <p className="text-xs font-bold text-white">Estado de Fase</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {Object.entries(phaseLabels).map(([key, label], idx) => (
                        <PhaseIndicator
                          key={key}
                          index={idx + 1}
                          label={label}
                          status={
                            (idx + 1 < activeJob.phase && (!activeJob.phases?.[key] || activeJob.phases?.[key].includes("Pendiente") || activeJob.phases?.[key].includes("cola")))
                              ? "✅ Listo (Omitido)"
                              : (activeJob.phases?.[key] || "⏳ Pendiente")
                          }
                          result={activeJob.phases_results?.[key]}
                          payload={activeJob.phases_payloads?.[key]}
                          jobId={activeJob.id}
                          keyName={key}
                          onInspect={setInspectedResult}
                          onReplay={handleReplayJob}
                        />
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Progreso Global</span>
                        <span className="text-[10px] font-black text-emerald-400">{getProgressValue(activeJob)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-600 to-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          style={{ width: `${getProgressValue(activeJob)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <CostCalculator
                      jobId={selectedJobId}
                      duration={activeJob.data?.duration || activeJob.data?.story_plan?.escenas?.reduce((acc: number, esc: any) => acc + (esc.duracion || 5), 0) || 0}
                      resolution={activeJob.data?.resolution || "1080p"}
                    />

                    <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <Zap className="w-4 h-4 text-emerald-400 fill-current" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Optimización Activa</span>
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed uppercase">
                        Modo: <span className="text-white font-bold">{!activeJob.data?.auto_execution ? "Iterativo (Manual)" : "Automático"}</span><br />
                        Motor: <span className="text-white font-bold">{activeJob.data?.model || "Seedance 2.0"}</span>
                      </p>
                    </div>
                  </div>
                </aside>

                {/* CONTENIDO PRINCIPAL (DERECHA) */}
                <div className="flex-1 space-y-8 min-w-0">
                  {/* Header del Job Activo */}
                  <div className="flex flex-col h-fit justify-center gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="space-y-2 flex-1">
                      <label className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Proyecto Actual</label>
                      <h2 className="text-2xl font-bold text-white leading-tight">
                        {activeJob.data?.story_plan?.premisa || (activeJob.status === "base_image" ? "Clonando Influencer..." : "Iniciando Producción...")}
                      </h2>
                      <div className="flex items-center gap-6 pt-4 border-t border-white/5 mt-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Estado:</span>
                          <Badge className={`${activeJob.status.includes('interrumpido') ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} text-[9px] uppercase font-black px-3 py-1`}>
                            {activeJob.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Fase:</span>
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                              style={{ width: `${getProgressValue(activeJob)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-violet-400">{getProgressValue(activeJob)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="border-white/10 text-white/40 hover:bg-white/5 h-10 px-4 text-xs font-bold uppercase rounded-xl" onClick={() => setInspectedResult({ label: "Estado Global", value: activeJob.data, payload: { id: activeJob.id } })}>
                        Inspeccionar JSON
                      </Button>
                    </div>
                  </div>

                  {/* ═══ BLOQUES DE REVISIÓN Y PLANIFICACIÓN (DEBAJO DE PROYECTO ACTUAL) ═══ */}
                  {/* Panel de Imagen Base: Solo si el estado es específicamente este */}
                  {(activeJob.status === "esperando_aprobacion_imagen_base") && activeJob.phases_results?.base_image && (
                    <div className="p-6 rounded-3xl bg-violet-500/5 border border-violet-500/20 space-y-6 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-violet-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-violet-400 uppercase tracking-widest">Validación de Identidad</h3>
                            <p className="text-[10px] text-white/40 uppercase">Comprueba que la influencer se haya integrado correctamente.</p>
                          </div>
                        </div>
                        <Badge className="bg-violet-600 text-white font-black text-[10px]">REVISIÓN ACTIVA</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Frame Original (TikTok)</label>
                          <div className="aspect-[9/16] rounded-2xl overflow-hidden border border-white/5 bg-black/40 max-h-[400px] mx-auto">
                            <img src={toVideoUrl(activeJob.data?.best_frame_url)} className="w-full h-full object-contain" alt="Original" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Imagen Base (IA clonada)</label>
                          <div className="aspect-[9/16] rounded-2xl overflow-hidden border border-emerald-500/30 bg-black/40 shadow-2xl shadow-emerald-500/10 max-h-[400px] mx-auto">
                            <img src={toVideoUrl(activeJob.phases_results?.base_image)} className="w-full h-full object-contain" alt="IA Generated" />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button onClick={() => handleApproveBaseImage(activeJob.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/20">
                          ✅ IMAGEN CORRECTA - SEGUIR AL DIRECTOR
                        </Button>
                        <Button variant="outline" onClick={() => handleReplayJob(activeJob.id, 4)} className="border-violet-500/30 text-violet-400 hover:bg-violet-500 hover:text-white font-black text-xs h-12 px-8 rounded-xl">
                          🔄 REGENERAR IMAGEN BASE
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Panel del Director: Solo si el estado es específicamente este */}
                  {(activeJob.status === "esperando_aprobacion_plan" || activeJob.status === "esperando_revision") && activeJob.data?.story_plan && (
                    <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-6 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                            <Film className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">Revisión del Plan Requerida</h3>
                            <p className="text-[10px] text-white/40 uppercase">El Director IA ha propuesto escenas. Puedes editarlas abajo.</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500 text-black font-black text-[10px]">PENDIENTE DE EDICIÓN</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Premisa del Guion</label>
                          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-xs text-white/70 leading-relaxed italic">
                            "{activeJob.data.story_plan.premisa}"
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Instrucciones de Ajuste (Opcional)</label>
                          <Textarea
                            id={`story-guide-active-${activeJob.id}`}
                            defaultValue={activeJob.data?.story_guide || ""}
                            placeholder="Ej: Haz que el tono sea más energético..."
                            className="bg-black/40 border-amber-500/20 text-white text-xs min-h-[80px] rounded-2xl focus:ring-amber-500/30"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={() => {
                            const modifiedScenes = activeJob.data.story_plan.escenas.map((s: any, i: number) => ({
                              ...s,
                              script_completo: (document.getElementById(`plan-script-${i}`) as HTMLTextAreaElement)?.value || s.script_completo || s.script || s.locucion,
                              prompt_visual_ingles: (document.getElementById(`plan-prompt-${i}`) as HTMLTextAreaElement)?.value || s.prompt_visual_ingles || s.prompt_visual || s.prompt
                            }));
                            handleContinueJob(activeJob.id, { ...activeJob.data.story_plan, escenas: modifiedScenes });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/20"
                        >
                          🚀 APROBAR TODO Y COMENZAR RODAJE
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const model = (document.getElementById(`director-model-active-${activeJob.id}`) as HTMLSelectElement)?.value || "minimax";
                            handleReplayJob(activeJob.id, 6, model);
                          }}
                          className="border-violet-500/30 text-violet-400 hover:bg-violet-500 hover:text-white font-black text-xs h-12 px-8 rounded-xl"
                        >
                          🔄 REGENERAR PLAN
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ═══ VISTA DE ÉXITO (VÍDEO FINAL) ═══ */}
                  {activeJob.status === "completado" && activeJob.data?.final_video_url && (
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-8 animate-in zoom-in-95 duration-700 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-3xl bg-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                            <CheckCircle2 className="w-8 h-8 text-black" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">¡Producción Completada!</h3>
                            <p className="text-emerald-400/60 font-bold uppercase text-[10px] tracking-widest">El vídeo final ha sido ensamblado con éxito</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <Button
                            onClick={() => handleDownloadVideo(activeJob.data.final_video_url, `final_${activeJob.id.slice(0, 8)}.mp4`)}
                            className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-black px-10 h-14 rounded-2xl text-xs font-black uppercase transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <Download className="w-5 h-5" /> Descargar Vídeo Final
                          </Button>

                          <Button
                            onClick={() => handleRegenerateAssembly(activeJob.id)}
                            variant="outline"
                            className="flex items-center justify-center gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white px-8 h-14 rounded-2xl text-[10px] font-black uppercase transition-all"
                          >
                            <RefreshCw className="w-4 h-4" /> Re-ensamblar Vídeo
                          </Button>
                        </div>
                      </div>

                      <div className="relative aspect-[9/16] max-w-sm mx-auto rounded-[2.5rem] overflow-hidden border-[8px] border-white/5 bg-black shadow-2xl group">
                        <video
                          src={toVideoUrl(activeJob.data.final_video_url)}
                          className="w-full h-full object-cover"
                          controls
                          autoPlay
                        />
                        <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[2.2rem]"></div>
                      </div>

                      <div className="text-center">
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Vista Previa de Alta Resolución</p>
                      </div>
                    </div>
                  )}

                  {/* BOTÓN DE EMERGENCIA: ENSAMBLADO MANUAL */}
                  {activeJob.data?.scene_results?.length === (activeJob.data?.story_plan?.escenas?.length || 6) && activeJob.data?.scene_results?.every((v: any) => v !== null) && activeJob.status !== "completado" && (
                    <div className="mb-8 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-in zoom-in-95 duration-500">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                          <Layers className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">Producción de Clips Finalizada</h3>
                          <p className="text-[10px] text-white/40 uppercase">Todas las escenas están listas. Pulsa para generar el vídeo final montado.</p>
                        </div>
                      </div>
                      <Button
                        onClick={async () => {
                          const res = await fetch(`${API_URL}/api/jobs/${activeJob.id}/assemble`, { method: "POST" });
                          if (res.ok) alert("🚀 Iniciando ensamblado final...");
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-8 h-12 rounded-xl"
                      >
                        FORZAR MONTAJE FINAL
                      </Button>
                    </div>
                  )}

                  {/* Grid de Escenas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(activeJob.data?.story_plan?.escenas || []).map((scene: any, idx: number) => {
                      const isCompleted = !!activeJob.data.scene_results?.[idx];
                      const isCurrent = idx === activeJob.data.current_scene_idx;
                      const videoUrl = activeJob.data.scene_results?.[idx];
                      const isFinished = activeJob.status === "completado";

                      return (
                        <div key={idx} className={`group relative rounded-3xl border transition-all duration-500 flex flex-col ${isCurrent ? "bg-violet-600/5 border-violet-500/50 shadow-2xl shadow-violet-500/10 ring-1 ring-violet-500/20" : "bg-white/[0.01] border-white/5"} ${!isCompleted && !isCurrent && !isFinished && activeJob.status !== "esperando_aprobacion_plan" && activeJob.status !== "esperando_revision_siguiente_escena" ? "opacity-30 grayscale blur-[1px]" : "opacity-100"}`}>
                          {/* Card Header: Rediseñado para evitar colisiones */}
                          <div className="p-3 border-b border-white/5 flex items-center justify-between gap-3 bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 h-6 flex items-center ${isCurrent ? "border-violet-500/50 text-violet-400 bg-violet-500/5" : "border-white/10 text-white/30"}`}>
                                {idx + 1}
                              </Badge>
                              <Badge className="bg-white/5 text-white/40 text-[9px] font-black border-0 h-6 px-1.5">{scene.duracion}s</Badge>
                            </div>

                            {isCompleted || isFinished ? (
                              <div className="flex items-center gap-1">
                                {/* Selector de Versiones Compacto */}
                                {activeJob.data.scene_history?.[String(idx)]?.length > 1 && (
                                  <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5 h-7 mr-1">
                                    <Button
                                      variant="ghost" size="icon" className="h-6 w-5 text-white/30 hover:text-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const history = activeJob.data.scene_history[String(idx)];
                                        const currentUrl = activeJob.data.scene_results[idx];
                                        const currentVIdx = history.indexOf(currentUrl);
                                        handleSelectVersion(activeJob.id, idx, (currentVIdx - 1 + history.length) % history.length);
                                      }}
                                    >
                                      <ChevronLeft className="w-3 h-3" />
                                    </Button>
                                    <span className="text-[8px] font-black text-white/60 px-1 min-w-[20px] text-center font-mono">
                                      V{(activeJob.data.scene_history[String(idx)].indexOf(activeJob.data.scene_results[idx]) + 1)}
                                    </span>
                                    <Button
                                      variant="ghost" size="icon" className="h-6 w-5 text-white/30 hover:text-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const history = activeJob.data.scene_history[String(idx)];
                                        const currentUrl = activeJob.data.scene_results[idx];
                                        const currentVIdx = history.indexOf(currentUrl);
                                        handleSelectVersion(activeJob.id, idx, (currentVIdx + 1) % history.length);
                                      }}
                                    >
                                      <ChevronRight className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}

                                {/* Botones de Acción Directos */}
                                <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-white/40 hover:text-violet-400 hover:bg-violet-400/10"
                                    onClick={(e) => { e.stopPropagation(); setEditingClip({ idx, videoUrl }); }}
                                    title="Editar recorte"
                                  >
                                    <Scissors className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-white/40 hover:text-amber-500 hover:bg-amber-500/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRegenerateScene(activeJob.id, scene.prompt_visual_ingles || scene.prompt_visual, scene.script_completo || scene.script || scene.locucion, idx);
                                    }}
                                    title="Regenerar Clip"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 rounded-lg transition-colors ${activeJob.data.scene_edits?.[String(idx)]?.excluded ? "text-red-500 bg-red-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentEdits = activeJob.data.scene_edits?.[String(idx)] || {};
                                      handleSaveClipEdits(activeJob.id, idx, { ...currentEdits, excluded: !currentEdits.excluded });
                                    }}
                                    title={activeJob.data.scene_edits?.[String(idx)]?.excluded ? "Incluir escena" : "Excluir escena"}
                                  >
                                    {activeJob.data.scene_edits?.[String(idx)]?.excluded ? <EyeOff className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                  </Button>
                                </div>
                              </div>
                            ) : (isCurrent && activeJob.status !== "esperando_aprobacion_plan" && activeJob.status !== "esperando_revision_siguiente_escena" ? (
                              <div className="flex items-center gap-2 pr-2">
                                <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest animate-pulse">Live</span>
                                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                              </div>
                            ) : null)}
                          </div>

                          {/* Scene Content Container */}
                          <div className="flex-1 flex flex-col min-h-0">
                            {/* Video Preview: Mejorado con Overlay de Pausa */}
                            <div className="aspect-[9/16] bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-white/5 group/video transition-all duration-700">
                              {(() => {
                                if ((isCompleted || isFinished) && videoUrl) {
                                  return (
                                    <div className="w-full h-full relative">
                                      <ScenePreview
                                        videoUrl={videoUrl}
                                        edits={activeJob.data.scene_edits?.[String(idx)]}
                                        excluded={activeJob.data.scene_edits?.[String(idx)]?.excluded}
                                        onEdit={() => setEditingClip({ idx, videoUrl })}
                                      />
                                      {activeJob.data.scene_edits?.[String(idx)]?.excluded && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none">
                                          <EyeOff className="w-8 h-8 text-white/20 mb-2" />
                                          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Excluida</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                if (isCurrent && activeJob.status !== "esperando_aprobacion_plan" && activeJob.status !== "esperando_revision_siguiente_escena") {
                                  return (
                                    <div className="flex flex-col items-center gap-6 text-center p-8">
                                      <div className="relative">
                                        <div className="w-20 h-20 rounded-full border-2 border-violet-500/10 border-t-violet-500 animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Video className="w-7 h-7 text-violet-500 animate-pulse" />
                                        </div>
                                        <div className="absolute -inset-4 bg-violet-500/10 rounded-full blur-2xl animate-pulse -z-10" />
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-[11px] font-black text-violet-400 uppercase tracking-[0.3em]">IA Renderizando</p>
                                        <button onClick={() => handleUnlockScene && handleUnlockScene(activeJob.id)} className="px-3 py-1.5 rounded-full bg-white/5 text-[9px] text-white/30 hover:text-white/60 hover:bg-white/10 transition-all border border-white/5 uppercase font-bold tracking-tighter">¿Atascado? Forzar Re-intento</button>
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-col items-center gap-3 opacity-20 group-hover/video:opacity-40 transition-opacity">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                      <MonitorPlay className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">En Espera</span>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Editor Modal Overlay: Pantalla completa */}
                            {editingClip?.idx === idx && (isCompleted || isFinished) && (
                              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                                <div className="w-full max-w-[450px] max-h-[90vh] flex flex-col relative bg-black/95 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                                  <ClipEditor
                                    jobId={activeJob.id}
                                    idx={idx}
                                    videoUrl={videoUrl}
                                    initialEdits={activeJob.data.scene_edits?.[String(idx)]}
                                    onClose={() => setEditingClip(null)}
                                    onSave={(edits) => handleSaveClipEdits(activeJob.id, idx, edits)}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Dynamic Interaction Area: Refinado */}
                            {(() => {
                              if (activeJob.status === "esperando_aprobacion_plan" || (isCurrent && activeJob.status === "esperando_revision_siguiente_escena")) {
                                return (
                                  <div className="p-6 space-y-6 bg-white/[0.01] flex-1 flex flex-col justify-between">
                                    <div className="space-y-6">
                                      {isCurrent && (
                                        activeJob.status === "esperando_aprobacion_plan" ? (
                                          <button
                                            onClick={() => {
                                              const script = (document.getElementById(`plan-script-${idx}`) as HTMLTextAreaElement)?.value;
                                              const planDesc = (document.getElementById(`plan-prompt-${idx}`) as HTMLTextAreaElement)?.value;
                                              const updatedPlan = { ...activeJob.data.story_plan };
                                              if (updatedPlan.escenas && updatedPlan.escenas[idx]) {
                                                updatedPlan.escenas[idx].prompt_visual_espanol = planDesc;
                                                updatedPlan.escenas[idx].script_completo = script;
                                              }
                                              handleContinueJob && handleContinueJob(activeJob.id, updatedPlan);
                                            }}
                                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase py-4 rounded-2xl shadow-xl shadow-emerald-500/20 mb-2 transition-all active:scale-95 text-[11px] tracking-[0.2em] flex items-center justify-center gap-2 group/btn"
                                          >
                                            <Sparkles className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" /> CONFIRMAR Y GENERAR
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleGenerateNextScene(activeJob.id)}
                                            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black uppercase py-4 rounded-2xl shadow-xl shadow-violet-500/20 mb-2 transition-all active:scale-95 text-[11px] tracking-[0.2em] flex items-center justify-center gap-2 group/btn"
                                          >
                                            <Zap className="w-4 h-4 fill-current group-hover/btn:scale-110 transition-transform" /> GENERAR ESCENA {idx + 1}
                                          </button>
                                        )
                                      )}

                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <label className="text-[10px] font-black text-emerald-400/80 uppercase tracking-[0.2em] block">Locución (Script)</label>
                                          <Button
                                            variant="ghost" size="sm"
                                            disabled={translating[`${activeJob.id}-${idx}___SCRIPT`]}
                                            onClick={() => handleScriptTranslation(`${activeJob.id}-${idx}`, scene.script_completo || scene.script || scene.locucion)}
                                            className={`h-6 w-6 p-0 flex items-center justify-center rounded-lg transition-all border ${showTranslation[`${activeJob.id}-${idx}___SCRIPT`] ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-emerald-500/5 border-white/5 text-emerald-500/60 hover:bg-emerald-500/10'}`}
                                          >
                                            {translating[`${activeJob.id}-${idx}___SCRIPT`] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                                          </Button>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 focus-within:border-emerald-500/30 transition-all shadow-inner">
                                          <Textarea
                                            id={`plan-script-${idx}`}
                                            key={`plan-script-${idx}-v${contentVersion[`${activeJob.id}-${idx}___SCRIPT`] || 0}`}
                                            defaultValue={(() => {
                                              const sk = `${activeJob.id}-${idx}___SCRIPT`;
                                              if (showTranslation[sk]) return esCache[sk] || scene.script_completo || scene.script || scene.locucion;
                                              return enOverride[sk] || scene.script_completo || scene.script || scene.locucion;
                                            })()}
                                            onChange={(e) => {
                                              const newScript = e.target.value;
                                              const masterEl = document.getElementById(`plan-prompt-${idx}`) as HTMLTextAreaElement;
                                              if (masterEl) {
                                                const regexNarrative = /(\[DIALOGUE\]:[\s\S]*?['"])([\s\S]*?)(['"])/gi;
                                                masterEl.value = masterEl.value.replace(regexNarrative, `$1${newScript}$3`);
                                              }
                                              const sceneKey = `${activeJob.id}-${idx}`;
                                              const scriptKey = `${sceneKey}___SCRIPT`;
                                              const isESPrompt = showTranslation[sceneKey];
                                              const isESScript = showTranslation[scriptKey];
                                              const tagKey = '[DIALOGUE]:';
                                              const compKey = `${sceneKey}___${tagKey}`;

                                              // Sincronizar con la caja modular de DIALOGUE visible SOLO si están en el mismo idioma
                                              if (!!isESPrompt === !!isESScript) {
                                                const visibleDialogue = document.querySelector(`[data-scene-prompt="${idx}"][data-tag*="DIALOGUE"]`) as HTMLTextAreaElement;
                                                if (visibleDialogue) {
                                                  const regexInternal = /(['"])([\s\S]*?)(['"])/;
                                                  visibleDialogue.value = visibleDialogue.value.replace(regexInternal, `$1${newScript}$3`);
                                                }
                                              }

                                              if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
                                              dirtyTagsRef.current[sceneKey].add("SCRIPT");
                                              dirtyTagsRef.current[sceneKey].add(tagKey);

                                              liveValuesRef.current[scriptKey] = newScript;

                                              const updateFunc = (prev: any) => {
                                                const oldVal = prev[compKey] || (parseSections(scene.prompt_visual_ingles || scene.prompt_visual).find(s => s.tag === tagKey)?.content || "");
                                                const newVal = oldVal.replace(/(['"])([\s\S]*?)(['"])/, `$1${newScript}$3`);
                                                liveValuesRef.current[compKey] = newVal;
                                                return { ...prev, [compKey]: newVal, [scriptKey]: newScript };
                                              };

                                              if (isESScript) setEsCache(updateFunc);
                                              else setEnOverride(updateFunc);
                                            }}
                                            className="bg-transparent border-0 text-white/90 font-medium text-[11px] min-h-[40px] p-0 focus-visible:ring-0 resize-none leading-tight placeholder:text-white/5"
                                            placeholder="Escribe el diálogo de esta escena..."
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <label className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.2em] block">Prompt Visual</label>
                                          <Button
                                            variant="ghost" size="sm"
                                            disabled={translating[`${activeJob.id}-${idx}`]}
                                            onClick={() => {
                                              const sceneKey = `${activeJob.id}-${idx}`;
                                              const originalPrompt = scene.prompt_visual_ingles || scene.prompt_visual || '';
                                              const sections = parseSections(originalPrompt).map(s => ({ tag: s.tag, originalContent: s.content }));
                                              handlePromptTranslation(sceneKey, sections);
                                            }}
                                            className={`h-7 w-7 p-0 flex items-center justify-center rounded-xl transition-all border ${showTranslation[`${activeJob.id}-${idx}`] ? 'bg-amber-500 border-amber-500 text-black' : 'bg-amber-500/5 border-white/5 text-amber-500/60 hover:bg-amber-500/10'}`}
                                          >
                                            {translating[`${activeJob.id}-${idx}`] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-4 h-4" />}
                                          </Button>
                                        </div>
                                        <textarea id={`plan-prompt-${idx}`} className="hidden" defaultValue={scene.prompt_visual_ingles || scene.prompt_visual || ''} />
                                        <div className="space-y-2">
                                          {(() => {
                                            const sceneKey = `${activeJob.id}-${idx}`;
                                            const isES = showTranslation[sceneKey];
                                            const originalPrompt = scene.prompt_visual_ingles || scene.prompt_visual || '';
                                            return parseSections(originalPrompt).map(({ tag, content }) => {
                                              const compositeKey = `${sceneKey}___${tag}`;
                                              const tagLabel = tag.replace(/:/g, '');
                                              const displayValue = isES ? (esCache[compositeKey] || content) : (enOverride[compositeKey] || content);
                                              return (
                                                <div key={tag} className="group space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 transition-all hover:bg-white/[0.04]">
                                                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">{tagLabel}</span>
                                                  <Textarea
                                                    key={`${compositeKey}-v${contentVersion[sceneKey] || 0}`}
                                                    data-scene-prompt={idx} data-tag={tag}
                                                    defaultValue={displayValue}
                                                    onChange={(e) => {
                                                      const newVal = e.target.value;
                                                      liveValuesRef.current[compositeKey] = newVal;
                                                      if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
                                                      dirtyTagsRef.current[sceneKey].add(tag);

                                                      if (!isES) {
                                                        const allParts = Array.from(document.querySelectorAll(`[data-scene-prompt="${idx}"]`));
                                                        const merged = allParts.map((p: any) => `${p.getAttribute('data-tag')} ${p.value}`).join('\n');
                                                        const master = document.getElementById(`plan-prompt-${idx}`) as HTMLTextAreaElement;
                                                        if (master) master.value = merged.trim();
                                                      }

                                                      // Mirroring hacia el Script si es la caja de DIALOGUE
                                                      if (tag.toUpperCase().includes('DIALOGUE')) {
                                                        const scriptEl = document.getElementById(`plan-script-${idx}`) as HTMLTextAreaElement;
                                                        const match = /['"]([^'"]*)['"]/.exec(newVal);
                                                        if (scriptEl && match) {
                                                          scriptEl.value = match[1];
                                                          const scriptKey = `${sceneKey}___SCRIPT`;
                                                          liveValuesRef.current[scriptKey] = match[1];
                                                          dirtyTagsRef.current[sceneKey].add("SCRIPT");
                                                          const scriptUpdate = (prev: any) => ({ ...prev, [scriptKey]: match[1] });
                                                          if (isES) setEsCache(scriptUpdate);
                                                          else setEnOverride(scriptUpdate);
                                                        }
                                                      }
                                                    }}
                                                    className="bg-transparent border-0 text-amber-100/70 font-medium text-[11px] p-0 focus-visible:ring-0 resize-none leading-normal"
                                                    rows={Math.max(1, displayValue.split('\n').length)}
                                                  />
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                      <Badge variant="outline" className="text-[8px] border-white/10 text-white/20 uppercase font-black">{scene.audio_mode}</Badge>
                                      <span className="text-[10px] font-black text-white/10">v2.4.0</span>
                                    </div>
                                  </div>
                                );
                              }

                              if (isCurrent && activeJob.status === "esperando_aprobacion_escena") {
                                return (
                                  <div className="p-4 bg-amber-500/[0.01] border-t border-amber-500/5 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                      <Badge className="bg-emerald-500/80 text-black text-[8px] font-black uppercase tracking-widest h-5 px-2">OK</Badge>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-amber-500/40 uppercase tracking-widest">Acción</span>
                                      </div>
                                    </div>
                                    <div className="space-y-5">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <label className="text-[9px] font-black text-emerald-400/80 uppercase tracking-[0.2em] block">Locución (Script)</label>
                                          <Button
                                            variant="ghost" size="sm"
                                            disabled={translating[`${activeJob.id}-${idx}___SCRIPT`]}
                                            onClick={() => handleScriptTranslation(`${activeJob.id}-${idx}`, scene.script_completo || scene.script || scene.locucion)}
                                            className={`h-6 w-6 p-0 flex items-center justify-center rounded-lg transition-all border ${showTranslation[`${activeJob.id}-${idx}___SCRIPT`] ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-emerald-500/5 border-white/5 text-emerald-500/60 hover:bg-emerald-500/10'}`}
                                          >
                                            {translating[`${activeJob.id}-${idx}___SCRIPT`] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                                          </Button>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 focus-within:border-emerald-500/30 transition-all shadow-inner">
                                          <Textarea
                                            id={`edit-script-${activeJob.id}-${idx}`}
                                            key={`edit-script-${activeJob.id}-${idx}-v${contentVersion[`${activeJob.id}-${idx}___SCRIPT`] || 0}`}
                                            defaultValue={(() => {
                                              const sk = `${activeJob.id}-${idx}___SCRIPT`;
                                              if (showTranslation[sk]) return esCache[sk] || scene.script_completo || scene.script || scene.locucion;
                                              return enOverride[sk] || scene.script_completo || scene.script || scene.locucion;
                                            })()}
                                            onChange={(e) => {
                                              const newScript = e.target.value;
                                              const masterEl = document.getElementById(`edit-prompt-${activeJob.id}-${idx}`) as HTMLTextAreaElement;
                                              if (masterEl) {
                                                const regexNarrative = /(\[DIALOGUE\]:[\s\S]*?['"])([\s\S]*?)(['"])/gi;
                                                masterEl.value = masterEl.value.replace(regexNarrative, `$1${newScript}$3`);
                                              }
                                              const sceneKey = `${activeJob.id}-${idx}`;
                                              const scriptKey = `${sceneKey}___SCRIPT`;
                                              const isESPrompt = showTranslation[sceneKey];
                                              const isESScript = showTranslation[scriptKey];
                                              const tagKey = '[DIALOGUE]:';
                                              const compKey = `${sceneKey}___${tagKey}`;

                                              if (!!isESPrompt === !!isESScript) {
                                                const visibleDialogue = document.querySelector(`[data-edit-prompt="${idx}"][data-tag*="DIALOGUE"]`) as HTMLTextAreaElement;
                                                if (visibleDialogue) {
                                                  const regexInternal = /(['"])([\s\S]*?)(['"])/;
                                                  visibleDialogue.value = visibleDialogue.value.replace(regexInternal, `$1${newScript}$3`);
                                                }
                                              }

                                              if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
                                              dirtyTagsRef.current[sceneKey].add("SCRIPT");
                                              dirtyTagsRef.current[sceneKey].add(tagKey);
                                              liveValuesRef.current[scriptKey] = newScript;

                                              const updateFunc = (prev: any) => {
                                                const oldVal = prev[compKey] || (parseSections(scene.prompt_visual_ingles || scene.prompt_visual).find(s => s.tag === tagKey)?.content || "");
                                                const newVal = oldVal.replace(/(['"])([\s\S]*?)(['"])/, `$1${newScript}$3`);
                                                liveValuesRef.current[compKey] = newVal;
                                                return { ...prev, [compKey]: newVal, [scriptKey]: newScript };
                                              };
                                              if (isESScript) setEsCache(updateFunc);
                                              else setEnOverride(updateFunc);
                                            }}
                                            className="bg-transparent border-0 text-white/90 font-medium text-[11px] min-h-[40px] p-0 focus-visible:ring-0 resize-none leading-tight placeholder:text-white/5"
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <label className="text-[9px] font-black text-amber-500/80 uppercase tracking-[0.2em] block">Prompt Visual</label>
                                          <Button
                                            variant="ghost" size="sm"
                                            disabled={translating[`${activeJob.id}-${idx}`]}
                                            onClick={() => {
                                              const sceneKey = `${activeJob.id}-${idx}`;
                                              const originalPrompt = scene.prompt_visual_ingles || scene.prompt_visual || '';
                                              const sections = parseSections(originalPrompt).map(s => ({ tag: s.tag, originalContent: s.content }));
                                              handlePromptTranslation(sceneKey, sections);
                                            }}
                                            className={`h-7 w-7 p-0 flex items-center justify-center rounded-xl transition-all border ${showTranslation[`${activeJob.id}-${idx}`] ? 'bg-amber-500 border-amber-500 text-black' : 'bg-amber-500/5 border-white/5 text-amber-500/60 hover:bg-amber-500/10'}`}
                                          >
                                            {translating[`${activeJob.id}-${idx}`] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-4 h-4" />}
                                          </Button>
                                        </div>

                                        <textarea
                                          id={`edit-prompt-${activeJob.id}-${idx}`}
                                          className="hidden"
                                          defaultValue={scene.prompt_visual_ingles || scene.prompt_visual}
                                        />

                                        <div className="space-y-2">
                                          {(() => {
                                            const sceneKey = `${activeJob.id}-${idx}`;
                                            const isES = showTranslation[sceneKey];
                                            const originalPrompt = scene.prompt_visual_ingles || scene.prompt_visual || '';

                                            return parseSections(originalPrompt).map(({ tag, content }) => {
                                              const compositeKey = `${sceneKey}___${tag}`;
                                              const tagLabel = tag.replace(/:/g, '');
                                              const displayValue = isES ? (esCache[compositeKey] || content) : (enOverride[compositeKey] || content);

                                              return (
                                                <div key={tag} className="group space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 transition-all hover:bg-white/[0.04]">
                                                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">{tagLabel}</span>
                                                  <Textarea
                                                    key={`${compositeKey}-v${contentVersion[sceneKey] || 0}`}
                                                    data-edit-prompt={idx}
                                                    data-tag={tag}
                                                    defaultValue={displayValue}
                                                    onChange={(e) => {
                                                      const newVal = e.target.value;
                                                      liveValuesRef.current[compositeKey] = newVal;
                                                      if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
                                                      dirtyTagsRef.current[sceneKey].add(tag);

                                                      if (!isES) {
                                                        const allParts = Array.from(document.querySelectorAll(`[data-edit-prompt="${idx}"]`)) as HTMLTextAreaElement[];
                                                        const merged = allParts.sort((a, b) => NOMINAL_ORDER.indexOf(a.getAttribute('data-tag')!) - NOMINAL_ORDER.indexOf(b.getAttribute('data-tag')!))
                                                          .map(p => `${p.getAttribute('data-tag')} ${p.value}`).join('\n');
                                                        const master = document.getElementById(`edit-prompt-${activeJob.id}-${idx}`) as HTMLTextAreaElement;
                                                        if (master) master.value = merged.trim();
                                                      }

                                                      if (tag.toUpperCase().includes('DIALOGUE')) {
                                                        const scriptEl = document.getElementById(`edit-script-${activeJob.id}-${idx}`) as HTMLTextAreaElement;
                                                        const match = /['"]([^'"]*)['"]/.exec(newVal);
                                                        if (scriptEl && match) {
                                                          scriptEl.value = match[1];
                                                          const scriptKey = `${sceneKey}___SCRIPT`;
                                                          liveValuesRef.current[scriptKey] = match[1];
                                                          dirtyTagsRef.current[sceneKey].add("SCRIPT");
                                                          const scriptUpdate = (prev: any) => ({ ...prev, [scriptKey]: match[1] });
                                                          if (isES) setEsCache(scriptUpdate);
                                                          else setEnOverride(scriptUpdate);
                                                        }
                                                      }
                                                    }}
                                                    className="bg-transparent border-0 text-amber-100/70 font-medium text-[11px] p-0 focus-visible:ring-0 resize-none leading-normal"
                                                    rows={Math.max(1, displayValue.split('\n').length)}
                                                  />
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 pt-4">
                                        <Button onClick={() => handleApproveScene(activeJob.id)} className="bg-emerald-500 hover:bg-emerald-400 text-black h-14 font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95">APROBAR</Button>
                                        <Button variant="outline" onClick={() => {
                                          const s = (document.getElementById(`edit-script-${activeJob.id}-${idx}`) as HTMLTextAreaElement)?.value;
                                          const p = (document.getElementById(`edit-prompt-${activeJob.id}-${idx}`) as HTMLTextAreaElement)?.value;
                                          handleRegenerateScene(activeJob.id, p, s, idx);
                                        }} className="border-white/5 bg-white/5 text-white/60 hover:bg-white/10 h-14 font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl transition-all">REGENERAR</Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                                  <div className="space-y-4">
                                    <div className="group/script">
                                      <label className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest block mb-1.5">Guión Generado</label>
                                      <p className="text-[12px] text-white/70 leading-relaxed font-medium line-clamp-4 group-hover/script:line-clamp-none transition-all">
                                        {scene.script_completo || scene.script}
                                      </p>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 space-y-3">
                                      <label className="text-[9px] font-black text-amber-500/40 uppercase tracking-widest block mb-1">Visual Prompt (Estructurado)</label>
                                      <div className="grid grid-cols-1 gap-2">
                                        {parseSections(scene.prompt_visual_ingles || scene.prompt_visual || '').map(({ tag, content }) => (
                                          <div key={tag} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/10 transition-all">
                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1">{tag.replace(/:/g, '')}</span>
                                            <p className="text-[10px] text-amber-200/30 font-mono leading-tight">{content}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between pt-4 mt-auto border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                      <span className="text-[9px] font-bold text-white/15 uppercase tracking-widest">{scene.duracion}s · {scene.audio_mode}</span>
                                    </div>
                                    <Button variant="ghost" className="h-7 px-3 text-[9px] font-black text-white/10 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all uppercase tracking-tighter" onClick={() => setInspectedResult({ label: `Escena ${idx + 1}`, value: scene, payload: { id: activeJob.id } })}>v2.4.0 Info</Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modales */}
        <ResultModal
          data={inspectedResult}
          onClose={() => setInspectedResult(null)}
          handleContinueJob={handleContinueJob}
          handleApproveScene={handleApproveScene}
          handleRegenerateScene={handleRegenerateScene}
          showTranslation={showTranslation}
          translating={translating}
          esCache={esCache}
          enOverride={enOverride}
          contentVersion={contentVersion}
          handlePromptTranslation={handlePromptTranslation}
          handleScriptTranslation={handleScriptTranslation}
          liveValuesRef={liveValuesRef}
          dirtyTagsRef={dirtyTagsRef}
          setEsCache={setEsCache}
          setEnOverride={setEnOverride}
        />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
