"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProgressValue, getStatusBadgeClass } from "@/lib/utils/jobUtils";
import type { InspectedResult } from "@/lib/types";
import { Trash2 } from "lucide-react";

interface Props {
  job: any;
  onInspect: (result: InspectedResult) => void;
  onPurge: (jobId: string) => void;
}

/**
 * Header del proyecto activo — migración exacta del monolito (L.1046-1076)
 * id="production-monitor-header" es sagrado para el auto-scroll.
 */
export function ActiveJobHeader({ job, onInspect, onPurge }: Props) {
  const progress = getProgressValue(job);

  return (
    <div
      id="production-monitor-header"
      className="flex flex-col h-fit justify-center gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5 animate-in fade-in duration-500"
    >
      <div className="space-y-2 flex-1">
        <label className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
          Proyecto Actual
        </label>
        <h2 className="text-xl font-bold text-white leading-tight">
          {job.data?.story_plan?.premisa ||
            (job.status?.includes("base_image") ? "Clonando Influencer..." : "Iniciando Producción...")}
        </h2>
        <div className="flex items-center gap-6 pt-4 border-t border-white/5 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Estado:</span>
            <Badge className={`${getStatusBadgeClass(job.status)} text-[9px] uppercase font-black px-3 py-1`}>
              {job.status?.replace(/_/g, " ") || "—"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 flex-1">
            <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Fase:</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-violet-400">{progress}%</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          className="border-white/10 text-white/40 hover:bg-white/5 h-10 px-4 text-xs font-bold uppercase rounded-xl"
          onClick={() => onInspect({ label: "Estado Global", value: job.data, payload: { id: job.id } })}
        >
          Inspeccionar JSON
        </Button>
        <Button
          variant="outline"
          className="border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 h-10 px-4 text-xs font-bold uppercase rounded-xl flex items-center gap-2"
          onClick={() => {
            if (confirm(`¿Eliminar el job ${job.id?.slice(0, 8)}...?\nEsta acción no se puede deshacer.`)) {
              onPurge(job.id);
            }
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar Job
        </Button>
      </div>
    </div>
  );
}
