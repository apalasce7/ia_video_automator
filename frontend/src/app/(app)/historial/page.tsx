"use client";
import { useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useJobs } from "@/lib/hooks/useJobs";
import { JobCard } from "@/components/historial/JobCard";
import { HistorialFilters } from "@/components/historial/HistorialFilters";
import { Badge } from "@/components/ui/badge";
import { toVideoUrl } from "@/lib/utils";
import type { InspectedResult } from "@/lib/types";
import { ResultModal } from "@/components/ResultModal";
import { Archive } from "lucide-react";

// ── Tipo de filtro (5 estados) ─────────────────────────────────────────────
type FilterStatus = "all" | "completado" | "activo" | "error" | "interrumpido";

// ══════════════════════════════════════════════════════════════════════════════
// Componente principal — Historial
// ══════════════════════════════════════════════════════════════════════════════
function HistorialContent() {
  const router = useRouter();
  const { jobs, refetch } = useJobs();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectedResult, setInspectedResult] =
    useState<InspectedResult | null>(null);

  // ── Filtrado + búsqueda reactivos ──────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    // El hook ya ordena desc por fecha → invertimos para mostrar el más reciente primero
    let result = [...jobs].reverse();

    if (filterStatus !== "all") {
      result = result.filter((j) => {
        switch (filterStatus) {
          case "completado":
            return j.status === "completado";
          case "error":
            return j.status?.includes("error");
          case "interrumpido":
            return j.status?.includes("interrumpido");
          case "activo":
            return (
              !j.status?.includes("completado") &&
              !j.status?.includes("error") &&
              !j.status?.includes("interrumpido")
            );
          default:
            return true;
        }
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.id.toLowerCase().includes(q) ||
          ((j.data as any)?.product_name || "").toLowerCase().includes(q) ||
          ((j.data as any)?.influencer_name || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [jobs, filterStatus, searchQuery]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Purgar job — DELETE /api/jobs/{id}/purge */
  const handlePurge = async (jobId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}/purge`,
        { method: "DELETE" }
      );
      if (res.ok) await refetch();
    } catch (e) {
      console.error("[Historial] Error purgando job:", e);
    }
  };

  /**
   * Navegar a /montaje con el job pre-seleccionado.
   * Usa ?jobId= para ser consistente con montaje/page.tsx
   * que lee searchParams.get("jobId").
   */
  const handleManage = (jobId: string) => {
    router.push(`/montaje?jobId=${jobId}`);
  };

  /** Descargar vídeo final — migración de L.876–890 del monolito */
  const handleDownload = (videoUrl: string, jobId: string) => {
    const a = document.createElement("a");
    a.href = toVideoUrl(videoUrl);
    a.download = `ugc_${jobId.slice(0, 8)}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /** Abrir ResultModal con datos del job */
  const handleInspect = (job: any) => {
    setInspectedResult({
      label: `Resumen — ${job.data?.product_name || job.id.slice(0, 8)}`,
      value: job.data,
      payload: { id: job.id, status: job.status },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">
            Archivo Historial
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Gestión de producciones pasadas y en curso.
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-white/40 border-white/10 px-4 py-1 h-8 rounded-full text-xs font-black"
        >
          {filteredJobs.length} / {jobs.length} Producciones
        </Badge>
      </div>

      {/* ── Filtros ── */}
      <HistorialFilters
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* ── Grid de jobs o empty state ── */}
      {filteredJobs.length === 0 ? (
        <EmptyHistorial hasJobs={jobs.length > 0} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onManage={() => handleManage(job.id)}
              onDownload={() =>
                (job.data as any)?.final_video_url &&
                handleDownload((job.data as any).final_video_url, job.id)
              }
              onInspect={() => handleInspect(job)}
              onPurge={() => handlePurge(job.id)}
            />
          ))}
        </div>
      )}

      {/* ── Modal de inspección ── */}
      {inspectedResult && (
        <ResultModal
          data={inspectedResult}
          onClose={() => setInspectedResult(null)}
        />
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyHistorial({ hasJobs }: { hasJobs: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] text-center space-y-3">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Archive className="w-7 h-7 text-white/20" />
      </div>
      <p className="text-white/40 font-bold">
        {hasJobs
          ? "No hay resultados para este filtro"
          : "No hay producciones en el archivo"}
      </p>
      <p className="text-white/20 text-xs max-w-xs">
        {hasJobs
          ? "Prueba a cambiar los filtros o la búsqueda."
          : "Las producciones aparecerán aquí una vez creadas desde el Estudio."}
      </p>
    </div>
  );
}

// ── Export con Suspense (obligatorio por useRouter en Next.js App Router) ──────
export default function HistorialPage() {
  return (
    <Suspense>
      <HistorialContent />
    </Suspense>
  );
}
