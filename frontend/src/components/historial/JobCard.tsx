"use client";
import { toVideoUrl } from "@/lib/utils";
import {
  AUDIO_LABELS,
  LANG_LABELS,
  MODEL_LABELS,
  STYLE_LABELS,
} from "@/lib/utils/jobUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  Trash2,
  ExternalLink,
  Video,
  Calendar,
  Settings2,
  Eye,
} from "lucide-react";

interface JobCardProps {
  job: any;
  onManage: () => void;
  onDownload: () => void;
  onInspect: () => void;
  onPurge: () => void;
}

export function JobCard({
  job,
  onManage,
  onDownload,
  onInspect,
  onPurge,
}: JobCardProps) {
  // Badge de estado — migración exacta del monolito
  const isCompleted = job.status === "completado";
  const isError = job.status?.includes("error");
  const isInterrupted = job.status?.includes("interrumpido");

  const statusBadgeClass = isCompleted
    ? "bg-emerald-500 text-black"
    : isError
    ? "bg-red-500 text-white"
    : isInterrupted
    ? "bg-amber-500 text-black"
    : "bg-violet-600 text-white animate-pulse";

  const statusLabel = isCompleted
    ? "Listo"
    : (job.status?.split(":")?.[0] || job.status)?.slice(0, 15);

  return (
    <Card className="group bg-white/[0.02] border-white/5 hover:border-violet-500/30 hover:bg-white/[0.04] transition-all duration-300 overflow-hidden flex flex-col shadow-lg shadow-black/20 rounded-2xl">

      {/* ── Preview area — migración exacta de L.2235–2291 ── */}
      <div className="aspect-video relative bg-black/40 overflow-hidden">

        {/* Vídeo o placeholder */}
        {job.data?.final_video_url ? (
          <video
            src={toVideoUrl(job.data.final_video_url)}
            className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-300"
            muted
            preload="metadata"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-violet-500/5">
            <div className="flex -space-x-3">
              {job.data?.influencer_path && (
                <img
                  src={toVideoUrl(job.data.influencer_path)}
                  className="w-10 h-10 rounded-full border-2 border-indigo-500/30 object-cover shadow-xl"
                  alt="Influencer"
                />
              )}
              {job.data?.product_paths?.[0] && (
                <img
                  src={toVideoUrl(job.data.product_paths[0])}
                  className="w-10 h-10 rounded-lg border-2 border-pink-500/30 object-cover rotate-6 shadow-xl"
                  alt="Producto"
                />
              )}
              {!job.data?.influencer_path && !job.data?.product_paths?.[0] && (
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-white/20" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Badge de estado — top-left */}
        <div className="absolute top-3 left-3">
          <Badge
            className={`text-[8px] font-black uppercase tracking-tighter h-5 px-2 border-0 ${statusBadgeClass}`}
          >
            {statusLabel}
          </Badge>
        </div>

        {/* Botón Eliminar — top-right */}
        <div className="absolute top-3 right-3 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 bg-black/60 hover:bg-red-500 text-white/40 hover:text-white rounded-lg backdrop-blur-md border border-white/10 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              if (
                confirm(
                  "¿Eliminar este proyecto definitivamente? Esta acción borra todos los archivos."
                )
              ) {
                onPurge();
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Link TikTok original — bottom-left */}
        {job.data?.tiktok_url && (
          <a
            href={job.data.tiktok_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 left-3 w-8 h-8 bg-black/60 hover:bg-white hover:text-black rounded-lg flex items-center justify-center backdrop-blur-md transition-all z-10 border border-white/10"
            title="Ver TikTok Original"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Play overlay — solo si hay vídeo final */}
        {job.data?.final_video_url && (
          <button
            onClick={onInspect}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 cursor-pointer z-20"
          >
            <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:scale-110 transition-transform">
              <Video className="w-8 h-8 text-white fill-current" />
            </div>
          </button>
        )}
      </div>

      {/* ── Card content — migración exacta de L.2293–2373 ── */}
      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Nombre del producto */}
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-sm font-bold text-white truncate pr-2 uppercase tracking-tight">
              {job.data?.product_name || "Sin Nombre"}
            </h3>
          </div>

          {/* Fecha */}
          {job.created_at && (
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3 h-3 text-amber-500/80" />
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                {job.created_at}
              </p>
            </div>
          )}

          {/* ID + Influencer */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-white/20">
              ID: {job.id.slice(0, 8)}
            </p>
            <p className="text-[9px] font-black text-violet-400/60 uppercase">
              {job.data?.influencer_name}
            </p>
          </div>
        </div>

        {/* Badges de configuración */}
        <div className="flex flex-wrap gap-1.5 py-1">
          {[
            job.data?.resolution,
            STYLE_LABELS[job.data?.edit_style],
            MODEL_LABELS[job.data?.director_model],
          ]
            .filter(Boolean)
            .map((label, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="bg-white/5 border-0 text-[8px] h-5 px-1.5 text-white/40 uppercase font-black"
              >
                {label}
              </Badge>
            ))}
          {job.data?.debug_mode && (
            <Badge
              variant="secondary"
              className="bg-red-500/10 border-0 text-[8px] h-5 px-1.5 text-red-400 uppercase font-black"
            >
              Debug
            </Badge>
          )}
        </div>

        {/* Footer: idioma + audio + duración */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex gap-2">
            <Badge
              variant="secondary"
              className="bg-white/5 border-0 text-[10px] h-6 px-1.5 grayscale opacity-60"
            >
              {LANG_LABELS[job.data?.language] || "🌐"}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-white/5 border-0 text-[10px] h-6 px-1.5 grayscale opacity-60"
            >
              {AUDIO_LABELS[job.data?.audio_mode] || "🔇"}
            </Badge>
          </div>
          <span className="text-[10px] font-black text-white/40 uppercase">
            {job.data?.duration || 0}s
          </span>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-2 pt-2">
          {/* Descargar — solo si hay vídeo */}
          {job.data?.final_video_url && (
            <Button
              onClick={onDownload}
              className="w-full flex items-center justify-center gap-3 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-black py-3 rounded-lg text-[10px] font-black uppercase transition-all border border-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              Descargar Vídeo Final
            </Button>
          )}

          {/* Gestionar + Detalles */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={onManage}
              className="border-violet-500/20 text-violet-400 hover:bg-violet-600 hover:text-white h-9 text-[10px] font-black uppercase transition-all gap-1.5"
            >
              <Settings2 className="w-3 h-3" />
              Gestionar
            </Button>
            <Button
              variant="ghost"
              onClick={onInspect}
              className="h-9 text-[10px] text-white/20 hover:text-white uppercase font-bold gap-1.5"
            >
              <Eye className="w-3 h-3" />
              Detalles
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
