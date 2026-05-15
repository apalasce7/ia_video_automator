"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Layers, RefreshCw } from "lucide-react";
import { API_URL } from "@/lib/utils";

interface Props {
  job: any;
}

export function AssemblyButton({ job }: Props) {
  const [loading, setLoading] = useState(false);

  const sceneResults: (string | null)[] = job.data?.scene_results || [];
  const totalScenes: number = job.data?.story_plan?.escenas?.length || 0;

  // Mostrar solo si: todas las escenas tienen video, no están todas nulas, y el job no está completado
  const allReady =
    totalScenes > 0 &&
    sceneResults.length === totalScenes &&
    sceneResults.every((v) => v !== null && v !== undefined) &&
    job.status !== "completado";

  if (!allReady) return null;

  const handleAssemble = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/jobs/${job.id}/assemble`, {
        method: "POST",
      });
      if (res.ok) {
        // El polling de useJobs actualizará el estado automáticamente
      }
    } catch (e) {
      console.error("Error forzando ensamblado:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in zoom-in-95 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <Layers className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">
            Producción de Clips Finalizada
          </h3>
          <p className="text-[10px] text-white/40 uppercase mt-0.5">
            Todas las escenas están listas. Pulsa para generar el vídeo final montado.
          </p>
        </div>
      </div>

      <Button
        onClick={handleAssemble}
        disabled={loading}
        className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-8 h-12 rounded-xl uppercase tracking-wider shrink-0 transition-all active:scale-95 disabled:opacity-60"
      >
        {loading ? (
          <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Iniciando...</>
        ) : (
          "🚀 Forzar Montaje Final"
        )}
      </Button>
    </div>
  );
}
