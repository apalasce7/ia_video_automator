"use client";
import { Check, CheckCircle2, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PhaseIndicator = ({ 
  label, 
  status, 
  index, 
  result, 
  onInspect, 
  payload, 
  jobId, 
  keyName, 
  onReplay 
}: { 
  label: string, 
  status: string, 
  index: number, 
  result?: any, 
  onInspect: (res: any) => void, 
  payload?: any, 
  jobId?: string, 
  keyName?: string, 
  onReplay?: (id: string, phase: number) => void 
}) => {
  const isCompleted = typeof status === "string" && (status.startsWith("✅") || status.startsWith("[OK]"));
  const isActive = typeof status === "string" && (status.startsWith("🔄") || status.startsWith("[RUN]"));
  const isWaiting = typeof status === "string" && (status.startsWith("⏸️") || status.startsWith("[PAUSE]"));
  const isError = typeof status === "string" && (status.startsWith("❌") || status.startsWith("[ERR]"));

  const hasAction = isCompleted || isWaiting;

  return (
    <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all relative overflow-hidden group
        ${isCompleted ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/[0.02] border-white/5 opacity-40"}
        ${isActive ? "bg-violet-500/10 border-violet-500/30 opacity-100 ring-1 ring-violet-500/50" : ""}
        ${isWaiting ? "bg-amber-500/20 border-amber-500/40 opacity-100 ring-1 ring-amber-500/50 animate-pulse" : ""}
        ${isError ? "bg-red-500/10 border-red-500/30 opacity-100" : ""}
      `}
    >
      <div
        className={`flex items-center gap-3 flex-1 min-w-0 ${hasAction && result ? "cursor-pointer active:scale-95 hover:bg-white/5" : ""}`}
        onClick={() => hasAction && result && onInspect({ label, value: result, payload, jobId, isEditable: isWaiting, keyName })}
      >
        <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-transform
        ${isActive ? "bg-violet-500 text-white animate-pulse shadow-lg" : ""}
        ${isCompleted ? "bg-emerald-500 text-white shadow-lg" : ""}
        ${isError ? "bg-red-500 text-white shadow-lg" : ""}
        ${isWaiting ? "bg-amber-500 text-black" : ""}
        ${!isActive && !isCompleted && !isError && !isWaiting ? "bg-white/10 text-white/40" : ""}
      `}>
          {isCompleted ? <Check className="w-4 h-4 stroke-[3px]" /> : isError ? <CheckCircle2 className="w-4 h-4" /> : isWaiting ? "!" : index}
        </div>
        <div className="flex flex-col min-w-0 overflow-hidden">
          <span className="text-[11px] font-black text-white/90 uppercase tracking-tight flex items-center gap-2">
            {label}
            {isActive && <Zap className="w-2 h-2 text-violet-400 fill-violet-400 animate-pulse" />}
          </span>
          <span className={`text-[10px] font-medium ${isActive ? "text-violet-300" : isError ? "text-red-400" : "text-white/30"}`}>
            {status}
          </span>
        </div>
      </div>
      {(onReplay && jobId) && (
        <div className="z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onReplay(jobId, index + 1); }}
            className={`h-7 w-7 rounded-full shrink-0 ml-2 transition-all shadow-lg
              ${isError ? "bg-red-500 text-white hover:bg-red-400 animate-bounce" : "bg-white/5 hover:bg-violet-500/20 text-white/40 hover:text-white"}
            `}
            title="Re-ejecutar desde esta fase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isError ? "animate-spin-slow" : ""}`} />
          </Button>
        </div>
      )}
    </div>
  );
};
