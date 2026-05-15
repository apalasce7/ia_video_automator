"use client";
import { toVideoUrl, API_URL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { User, RefreshCw } from "lucide-react";

interface Props {
  job: any;
  onApprove: (jobId: string) => void;
  onRegenerate: (jobId: string) => void;
}

export function BaseImageApproval({ job, onApprove, onRegenerate }: Props) {
  const originalUrl = toVideoUrl(job.data?.best_frame_url);
  const generatedUrl = toVideoUrl(job.phases_results?.base_image);

  return (
    <div className="p-6 rounded-3xl bg-violet-500/5 border border-violet-500/20 space-y-6 animate-in slide-in-from-top-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-violet-400 uppercase tracking-widest">
              Validación de Identidad
            </h3>
            <p className="text-[10px] text-white/40 uppercase">
              Comprueba que la influencer se haya integrado correctamente.
            </p>
          </div>
        </div>
        <span className="bg-violet-600 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
          Revisión Activa
        </span>
      </div>

      {/* Comparativa de imágenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block">
            Frame Original (TikTok)
          </label>
          <div className="aspect-[9/16] rounded-2xl overflow-hidden border border-white/5 bg-black/40 max-h-[380px] mx-auto flex items-center justify-center">
            {originalUrl ? (
              <img src={originalUrl} className="w-full h-full object-contain" alt="Original" />
            ) : (
              <span className="text-white/20 text-xs">Sin frame disponible</span>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
            Imagen Base (IA clonada)
          </label>
          <div className="aspect-[9/16] rounded-2xl overflow-hidden border border-emerald-500/30 bg-black/40 shadow-2xl shadow-emerald-500/10 max-h-[380px] mx-auto flex items-center justify-center">
            {generatedUrl ? (
              <img src={generatedUrl} className="w-full h-full object-contain" alt="IA Generated" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/20">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs">Generando...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={() => onApprove(job.id)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/20 uppercase tracking-wider transition-all active:scale-95"
        >
          ✅ Imagen Correcta — Seguir al Director
        </Button>
        <Button
          variant="outline"
          onClick={() => onRegenerate(job.id)}
          className="border-violet-500/30 text-violet-400 hover:bg-violet-500 hover:text-white font-black text-xs h-12 px-8 rounded-xl uppercase tracking-wider transition-all active:scale-95"
        >
          🔄 Regenerar Imagen Base
        </Button>
      </div>
    </div>
  );
}
