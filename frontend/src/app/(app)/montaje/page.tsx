"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useJobs } from "@/lib/hooks/useJobs";
import { useDeepLTranslation } from "@/lib/hooks/useDeepLTranslation";
import { JobSelector } from "@/components/montaje/JobSelector";
import { PipelineStatus } from "@/components/montaje/PipelineStatus";
import { ActiveJobHeader } from "@/components/montaje/ActiveJobHeader";
import { BaseImageApproval } from "@/components/montaje/BaseImageApproval";
import { DirectorPlanApproval } from "@/components/montaje/DirectorPlanApproval";
import { SceneGrid } from "@/components/montaje/SceneGrid";
import { FinalVideoPanel } from "@/components/montaje/FinalVideoPanel";
import { AssemblyButton } from "@/components/montaje/AssemblyButton";
import { ResultModal } from "@/components/ResultModal";
import { API_URL, toVideoUrl } from "@/lib/utils";
import type { InspectedResult } from "@/lib/types";
import { MonitorPlay } from "lucide-react";

function MontajeContent() {
  const searchParams = useSearchParams();
  const urlJobId = searchParams?.get("jobId");

  const { jobs, activeJob, selectedJobId, setSelectedJobId, refetch } = useJobs();
  const [inspectedResult, setInspectedResult] = useState<InspectedResult | null>(null);

  // ── Sistema DeepL elevado — compartido entre SceneGrid y ResultModal ──
  const deepl = useDeepLTranslation();

  // ── Seleccionar job desde URL (?jobId=xxx) ──
  useEffect(() => {
    if (urlJobId) setSelectedJobId(urlJobId);
  }, [urlJobId, setSelectedJobId]);

  // ── Auto-scroll al bloque de aprobación cuando cambia el estado ──
  useEffect(() => {
    if (!activeJob) return;
    const waitingStatuses = [
      "esperando_aprobacion_imagen_base",
      "esperando_aprobacion_plan",
      "esperando_revision",
      "esperando_revision_siguiente_escena",
      "esperando_aprobacion_escena",
    ];
    if (waitingStatuses.includes(activeJob.status)) {
      setTimeout(() => {
        document.getElementById("production-monitor-header")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
    }
  }, [activeJob?.status]);

  // ── Handlers (1:1 del monolito) ──

  const handleApproveBaseImage = async (jobId: string) => {
    await fetch(`${API_URL}/api/jobs/${jobId}/approve_base_image`, { method: "POST" });
    refetch();
  };

  const handleContinueJob = async (jobId: string, plan: any) => {
    const fd = new FormData();
    if (typeof plan === "string") fd.append("prompt", plan);
    else fd.append("plan", JSON.stringify(plan));
    await fetch(`${API_URL}/api/jobs/${jobId}/continue`, { method: "POST", body: fd });
    refetch();
  };

  const handleReplayJob = async (jobId: string, phase: number, model?: string) => {
    const fd = new FormData();
    fd.append("phase", phase.toString());
    if (model) fd.append("director_model", model);
    await fetch(`${API_URL}/api/jobs/${jobId}/replay`, { method: "POST", body: fd });
    refetch();
  };

  const handleSelectVersion = async (jobId: string, sceneIdx: number, versionIdx: number) => {
    const fd = new FormData();
    fd.append("version_idx", versionIdx.toString());
    await fetch(`${API_URL}/api/jobs/${jobId}/scenes/${sceneIdx}/select_version`, { method: "POST", body: fd });
    refetch();
  };

  const handleRegenerateScene = async (jobId: string, prompt?: string, script?: string, sceneIdx?: number) => {
    const fd = new FormData();
    if (prompt) fd.append("manual_prompt", prompt);
    if (script) fd.append("manual_script", script);
    if (sceneIdx !== undefined) fd.append("scene_idx", sceneIdx.toString());
    await fetch(`${API_URL}/api/jobs/${jobId}/scenes/regenerate`, { method: "POST", body: fd });
    refetch();
  };

  const handleApproveScene = async (jobId: string) => {
    await fetch(`${API_URL}/api/jobs/${jobId}/scenes/approve`, { method: "POST" });
    refetch();
  };

  const handleGenerateNext = async (jobId: string) => {
    await fetch(`${API_URL}/api/jobs/${jobId}/scenes/generate_next`, { method: "POST" });
    refetch();
  };

  const handleUnlock = async (jobId: string, sceneIdx?: number) => {
    const fd = new FormData();
    if (sceneIdx !== undefined) fd.append("scene_idx", sceneIdx.toString());
    await fetch(`${API_URL}/api/jobs/${jobId}/unlock`, { method: "POST", body: fd });
    refetch();
  };

  const handleSaveClipEdits = async (jobId: string, sceneIdx: number, clipEdits: any) => {
    const job = jobs.find((j: any) => j.id === jobId);
    if (!job) return;
    const allEdits = { ...job.data.scene_edits || {} };
    allEdits[String(sceneIdx)] = clipEdits;
    const fd = new FormData();
    fd.append("edits", JSON.stringify(allEdits));
    await fetch(`${API_URL}/api/jobs/${jobId}/save_edits`, { method: "POST", body: fd });
    refetch();
  };

  const handleDownloadVideo = async (url: string, filename: string) => {
    try {
      const response = await fetch(toVideoUrl(url));
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "video_ugc.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(toVideoUrl(url), "_blank");
    }
  };

  const handlePurgeJob = async (jobId: string) => {
    try {
      await fetch(`${API_URL}/api/jobs/${jobId}/purge`, { method: "POST" });
      setSelectedJobId("");
      refetch();
    } catch (e) {
      console.error("Error purging job:", e);
    }
  };

  const handleSaveToLibrary = async (jobId: string, name: string) => {
    if (!name) { alert("Por favor, introduce un nombre para la modelo."); return; }
    try {
      const fd = new FormData();
      fd.append("job_id", jobId);
      fd.append("name", name);
      const res = await fetch(`${API_URL}/api/influencers/save`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();
      if (data.status === "ok") alert(`✅ Influencer '${name}' guardada correctamente.`);
      else alert("Error: " + data.error);
    } catch (e: any) {
      alert("❌ Error al guardar: " + e.message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <JobSelector jobs={jobs} selectedJobId={selectedJobId} onSelect={setSelectedJobId} />

      {!activeJob ? (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5">
            <MonitorPlay className="w-10 h-10 text-white/10" />
          </div>
          <p className="text-white/40 font-bold">Sin Producciones Activas</p>
          <p className="text-white/20 text-sm">Comienza una nueva producción en el Estudio de Creación.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
          <aside className="lg:w-[300px] shrink-0 space-y-4 lg:sticky lg:top-8 h-fit">
            <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
              <PipelineStatus job={activeJob} onInspect={setInspectedResult} onReplay={handleReplayJob} />
            </div>
          </aside>

          <div className="flex-1 space-y-6 min-w-0">
            {/* Header del Proyecto Activo */}
            <ActiveJobHeader job={activeJob} onInspect={setInspectedResult} onPurge={handlePurgeJob} />

            {activeJob.status === "esperando_aprobacion_imagen_base" && (
              <BaseImageApproval job={activeJob} onApprove={handleApproveBaseImage} onRegenerate={(id) => handleReplayJob(id, 4)} />
            )}

            {(activeJob.status === "esperando_aprobacion_plan" || activeJob.status === "esperando_revision") && (
              <DirectorPlanApproval job={activeJob} onApprove={handleContinueJob} onRegenerate={handleReplayJob} />
            )}

            {activeJob.status === "completado" && activeJob.data?.final_video_url && (
              <FinalVideoPanel job={activeJob} onDownload={handleDownloadVideo} onReassemble={(id) => fetch(`${API_URL}/api/jobs/${id}/assemble`, { method: "POST" })} />
            )}

            <AssemblyButton job={activeJob} />

            {/* SceneGrid recibe DeepL compartido desde MontajePage */}
            <SceneGrid
              job={activeJob}
              onSelectVersion={handleSelectVersion}
              onRegenerateScene={handleRegenerateScene}
              onApproveScene={handleApproveScene}
              onGenerateNext={handleGenerateNext}
              onUnlock={handleUnlock}
              onSaveClipEdits={handleSaveClipEdits}
              onInspect={setInspectedResult}
              showTranslation={deepl.showTranslation}
              esCache={deepl.esCache}
              enOverride={deepl.enOverride}
              contentVersion={deepl.contentVersion}
              translating={deepl.translating}
              liveValuesRef={deepl.liveValuesRef}
              dirtyTagsRef={deepl.dirtyTagsRef}
              setEsCache={deepl.setEsCache}
              setEnOverride={deepl.setEnOverride}
              handlePromptTranslation={deepl.handlePromptTranslation}
              handleScriptTranslation={deepl.handleScriptTranslation}
            />
          </div>
        </div>
      )}

      {/* ResultModal recibe DeepL + todos los handlers */}
      {inspectedResult && (
        <ResultModal
          data={inspectedResult}
          onClose={() => setInspectedResult(null)}
          handleContinueJob={handleContinueJob}
          handleApproveScene={handleApproveScene}
          handleRegenerateScene={handleRegenerateScene}
          showTranslation={deepl.showTranslation}
          translating={deepl.translating}
          esCache={deepl.esCache}
          enOverride={deepl.enOverride}
          contentVersion={deepl.contentVersion}
          handlePromptTranslation={deepl.handlePromptTranslation}
          handleScriptTranslation={deepl.handleScriptTranslation}
          liveValuesRef={deepl.liveValuesRef}
          dirtyTagsRef={deepl.dirtyTagsRef}
          setEsCache={deepl.setEsCache}
          setEnOverride={deepl.setEnOverride}
        />
      )}
    </div>
  );
}

export default function MontajePage() {
  return (
    <Suspense>
      <MontajeContent />
    </Suspense>
  );
}
