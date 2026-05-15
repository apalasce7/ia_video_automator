"use client";
import { toVideoUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, CheckCircle2 } from "lucide-react";

interface Props {
  job: any;
  onDownload: (url: string, filename: string) => void;
  onReassemble: (jobId: string) => void;
}

export function FinalVideoPanel({ job, onDownload, onReassemble }: Props) {
  const videoUrl = job.data?.final_video_url;
  const filename = `final_${job.id.slice(0, 8)}.mp4`;

  return (
    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-8 animate-in zoom-in-95 duration-700 shadow-[0_0_50px_rgba(16,185,129,0.08)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] shrink-0">
            <CheckCircle2 className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
              ¡Producción Completada!
            </h3>
            <p className="text-emerald-400/60 font-bold uppercase text-[10px] tracking-widest mt-1">
              El vídeo final ha sido ensamblado con éxito
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center md:justify-end">
          <Button
            onClick={() => onDownload(videoUrl, filename)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-8 h-14 rounded-2xl text-xs font-black uppercase transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Download className="w-5 h-5" />
            Descargar Vídeo Final
          </Button>

          <Button
            variant="outline"
            onClick={() => onReassemble(job.id)}
            className="flex items-center gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white px-6 h-14 rounded-2xl text-[10px] font-black uppercase transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Re-ensamblar Vídeo
          </Button>
        </div>
      </div>

      {/* Player 9:16 */}
      <div className="relative aspect-[9/16] max-w-sm mx-auto rounded-[2.5rem] overflow-hidden border-[8px] border-white/5 bg-black shadow-2xl">
        <video
          src={toVideoUrl(videoUrl)}
          className="w-full h-full object-cover"
          controls
          autoPlay
          playsInline
        />
        <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[2.2rem]" />
      </div>

      <p className="text-center text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">
        Vista Previa de Alta Resolución
      </p>
    </div>
  );
}
