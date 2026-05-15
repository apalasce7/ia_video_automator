"use client";
import type { Job } from "@/lib/types";
import { getStatusColor, getStatusLabel } from "@/lib/utils/jobUtils";

interface Props {
  jobs: Job[];
  selectedJobId: string | null;
  onSelect: (id: string) => void;
}

export function JobSelector({ jobs, selectedJobId, onSelect }: Props) {
  if (jobs.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em]">
          Producciones
        </span>
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[9px] font-bold text-white/20">{jobs.length} jobs</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
      >
        {jobs.slice(0, 10).map((job) => {
          const isActive = selectedJobId === job.id;
          const colorClass = getStatusColor(job.status);
          return (
            <button
              key={job.id}
              id={`job-selector-${job.id}`}
              onClick={() => onSelect(job.id)}
              className={`
                shrink-0 flex flex-col gap-1.5 px-3.5 py-2.5 rounded-2xl border text-left
                transition-all duration-200 group relative overflow-hidden
                ${isActive
                  ? "bg-white/10 border-white/20 shadow-lg shadow-black/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                }
              `}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
              )}
              <span className={`text-[10px] font-mono font-bold ${isActive ? "text-white" : "text-white/50 group-hover:text-white/70"}`}>
                #{job.id.slice(0, 8)}
              </span>
              <span className={`
                inline-flex items-center px-1.5 py-0.5 rounded-md border text-[8px] font-bold uppercase tracking-wide
                ${colorClass}
              `}>
                {getStatusLabel(job.status)}
              </span>
              {job.created_at && (
                <span className="text-[8px] text-white/20 font-medium">
                  {new Date(job.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
