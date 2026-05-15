"use client";
import { useState, useEffect, useRef } from "react";
import { Scissors, RefreshCw, EyeOff, Eye, X, Pause, Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL, toVideoUrl } from "@/lib/utils";

export function ClipEditor({ 
  jobId, 
  idx, 
  videoUrl,
  initialEdits, 
  onClose, 
  onSave 
}: { 
  jobId: string; 
  idx: number; 
  videoUrl: string;
  initialEdits: any; 
  onClose: () => void; 
  onSave: (edits: any) => void 
}) {
  const [duration, setDuration] = useState<number | null>(null);
  const [start, setStart] = useState(initialEdits?.start || 0);
  const [end, setEnd] = useState(initialEdits?.end || 0);

  // Refs para el arrastre (siempre actualizados)
  const startRef = useRef(start);
  const endRef = useRef(end);
  const durationRef = useRef(duration);

  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => { endRef.current = end; }, [end]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  const [excluded, setExcluded] = useState(initialEdits?.excluded || false);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Efecto para cargar la duración real del clip desde la API
  useEffect(() => {
    let isMounted = true;
    async function fetchDuration() {
      try {
        const res = await fetch(`${API_URL}/api/jobs/${jobId}/scenes/${idx}/duration`);
        const data = await res.json();
        if (isMounted && data.duration) {
          const dur = parseFloat(data.duration);
          if (dur > 0) setDuration(dur);
        }
      } catch (err) {
        console.error("Error fetching duration from API:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDuration();
    return () => { isMounted = false; };
  }, [jobId, idx]);

  // Respaldo: Obtener duración del video si la API falla o es lenta
  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoDur = e.currentTarget.duration;
    if (videoDur > 0) {
      if (!duration || Math.abs(duration - videoDur) > 0.1) {
        setDuration(videoDur);
      }
      // Si es una apertura nueva (end es 0) o end es inválido, inicializar al final
      if (endRef.current === 0 || endRef.current > videoDur + 0.5) {
        setEnd(videoDur);
      }
    }
  };

  // Sincronizar 'end' cuando la duración esté disponible (vía API o Metadata)
  useEffect(() => {
    if (duration !== null && duration > 0) {
      if (end === 0 || end > duration + 0.5) {
        setEnd(duration);
      }
    }
  }, [duration]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && videoRef.current) {
      interval = setInterval(() => {
        if (videoRef.current && videoRef.current.currentTime >= end) {
          videoRef.current.currentTime = start;
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, start, end]);

  useEffect(() => {
    if (videoRef.current && !isPlaying) {
      videoRef.current.currentTime = start;
    }
  }, [start, isPlaying]);

  const calculateTimeFromX = (clientX: number) => {
    if (!trackRef.current || durationRef.current === null) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * durationRef.current;
  };

  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = 'grabbing';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const time = calculateTimeFromX(moveEvent.clientX);
      setStart(Math.max(0, Math.min(time, endRef.current - 0.05)));
    };
    const onPointerUp = () => {
      document.body.style.cursor = '';
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = 'grabbing';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const time = calculateTimeFromX(moveEvent.clientX);
      setEnd(Math.max(startRef.current + 0.05, Math.min(time, durationRef.current || 1)));
    };
    const onPointerUp = () => {
      document.body.style.cursor = '';
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.currentTime = start;
        videoRef.current.muted = false; 
        videoRef.current.play().catch(e => console.log("Playback error:", e));
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-black/60 backdrop-blur-xl">
      <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
    </div>
  );

  const durationSafe = duration || 1;

  return (
    <div className="absolute inset-0 bg-black/95 z-[100] flex flex-col animate-in fade-in zoom-in-95 duration-300 rounded-3xl overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
            <Scissors className="w-4 h-4 text-violet-400" />
          </div>
          <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Editor de Recorte</h4>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setExcluded(!excluded)}
            className={`h-8 px-3 rounded-xl text-[9px] font-bold uppercase transition-all ${excluded ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"}`}
          >
            {excluded ? <><EyeOff className="w-3 h-3 mr-1.5" /> Excluido</> : <><Eye className="w-3 h-3 mr-1.5" /> Incluido</>}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-white/20 hover:text-white hover:bg-white/5 rounded-xl"><X className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {!excluded ? (
          <>
            <div className="relative aspect-[9/16] max-h-[450px] mx-auto bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
              <video 
                ref={videoRef}
                src={toVideoUrl(videoUrl)} 
                onLoadedMetadata={handleVideoMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={togglePlay}
                playsInline
              />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-violet-600/90 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full shadow-2xl">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                    Selección: {(end - start).toFixed(2)}s
                  </span>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className={`w-14 h-14 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all duration-300 pointer-events-auto ${isPlaying ? 'opacity-0 scale-90' : 'opacity-100 scale-100 hover:scale-110 shadow-2xl'}`}
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-white fill-current" /> : <Play className="w-5 h-5 text-white fill-current ml-1" />}
                </button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2 pointer-events-none">
                <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg">
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">{start.toFixed(2)}s</span>
                </div>
                <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg">
                  <span className="text-[9px] font-mono text-red-400 font-bold">{end.toFixed(2)}s</span>
                </div>
              </div>
            </div>

            <div className="space-y-10 py-4">
              <div 
                ref={trackRef}
                className="relative h-2 bg-white/10 rounded-full cursor-pointer touch-none select-none"
                onPointerDown={(e) => {
                  const time = calculateTimeFromX(e.clientX);
                  const distStart = Math.abs(time - start);
                  const distEnd = Math.abs(time - end);
                  if (distStart < distEnd) { 
                    if (time < end - 0.05) setStart(Math.max(0, time)); 
                  } 
                  else { 
                    if (time > start + 0.05) setEnd(Math.min(time, durationSafe)); 
                  }
                }}
              >
                <div 
                  className="absolute h-full bg-violet-500 rounded-full"
                  style={{ left: `${(start / durationSafe) * 100}%`, width: `${((end - start) / durationSafe) * 100}%` }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 z-[60] cursor-grab active:cursor-grabbing -translate-x-1/2"
                  style={{ left: `${(start / durationSafe) * 100}%`, touchAction: 'none' }}
                  onPointerDown={handleDragStart}
                >
                  <div className="w-7 h-7 bg-white rounded-full border-2 border-violet-500 shadow-xl flex items-center justify-center hover:scale-125 transition-transform">
                    <div className="w-1.5 h-3.5 bg-violet-500/20 rounded-full" />
                  </div>
                </div>
                <div 
                  className="absolute top-1/2 -translate-y-1/2 z-[60] cursor-grab active:cursor-grabbing -translate-x-1/2"
                  style={{ left: `${(end / durationSafe) * 100}%`, touchAction: 'none' }}
                  onPointerDown={handleDragEnd}
                >
                  <div className="w-7 h-7 bg-white rounded-full border-2 border-violet-500 shadow-xl flex items-center justify-center hover:scale-125 transition-transform">
                    <div className="w-1.5 h-3.5 bg-violet-500/20 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] border border-white/10 p-3 rounded-2xl flex flex-col gap-1 items-center">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Inicio</span>
                  <input 
                    type="number" step="0.1" value={start.toFixed(2)}
                    onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0 && v < end) setStart(v); }}
                    className="bg-transparent border-0 text-lg font-mono text-white text-center w-full outline-none"
                  />
                </div>
                <div className="bg-white/[0.03] border border-white/10 p-3 rounded-2xl flex flex-col gap-1 items-center">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Fin</span>
                  <input 
                    type="number" step="0.1" value={end.toFixed(2)}
                    onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > start && v <= durationSafe) setEnd(v); }}
                    className="bg-transparent border-0 text-lg font-mono text-white text-center w-full outline-none"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <EyeOff className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-black text-white uppercase">Escena Excluida</h5>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">No se incluirá en el montaje final</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setExcluded(false)}
              className="border-white/10 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest px-6"
            >
              Re-Incluir Escena
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-white/[0.02] flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1 h-12 text-[10px] font-black uppercase text-white/30 hover:text-white hover:bg-white/5 rounded-2xl">Cancelar</Button>
        <Button 
          onClick={() => onSave({ start, end, excluded })} 
          className="flex-[2] h-12 bg-violet-600 hover:bg-violet-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl shadow-violet-600/20 transition-all active:scale-95"
        >
          Confirmar <Check className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
