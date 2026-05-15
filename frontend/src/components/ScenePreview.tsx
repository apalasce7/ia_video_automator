"use client";
import { useState, useEffect, useRef } from "react";
import { Pause, Play, Scissors } from "lucide-react";
import { toVideoUrl } from "@/lib/utils";

export function ScenePreview({ 
  videoUrl, 
  edits, 
  excluded, 
  onEdit 
}: { 
  videoUrl: string, 
  edits?: any, 
  excluded?: boolean, 
  onEdit?: () => void 
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const start = edits?.start || 0;
  const end = edits?.end || 0;

  useEffect(() => {
    let interval: any;
    if (isPlaying && videoRef.current && end > 0) {
      interval = setInterval(() => {
        if (videoRef.current && videoRef.current.currentTime >= end) {
          videoRef.current.currentTime = start;
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, start, end]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        // Solo resetear si está fuera de rango o muy cerca del final
        if (videoRef.current.currentTime < start || videoRef.current.currentTime >= end - 0.1) {
          videoRef.current.currentTime = start;
        }
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="relative w-full h-full group/preview cursor-pointer" onClick={togglePlay}>
      <video 
        ref={videoRef}
        src={`${toVideoUrl(videoUrl)}#t=${start},${end > 0 ? end : 999}`}
        className={`w-full h-full object-cover transition-all duration-700 ${excluded ? "opacity-20 grayscale scale-95 blur-sm" : "group-hover/preview:scale-105"}`}
        playsInline
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isPlaying ? "opacity-0 group-hover/preview:opacity-100" : "opacity-100 bg-black/20"}`}>
        <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl transform transition-transform group-hover/preview:scale-110">
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
        </div>
      </div>

      {(() => {
        const isTrimmed = start > 0.05 || (end > 0 && duration > 0 && Math.abs(end - duration) > 0.1);
        
        if (!isTrimmed || excluded) return null;

        return (
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-xl px-2.5 py-1 rounded-full text-[10px] font-black text-white border border-white/10 shadow-2xl flex items-center gap-1.5 ring-1 ring-white/5">
              <Scissors className="w-2.5 h-2.5 text-violet-400" />
              {(end - start).toFixed(2)}s
            </div>
            <div className="flex gap-1.5">
              <div className="bg-black/60 backdrop-blur-xl px-2.5 py-1 rounded-lg text-[9px] font-bold text-white/70 border border-white/10 shadow-2xl flex items-center gap-1">
                <span className="text-emerald-400/60">IN</span> {start.toFixed(2)}s
              </div>
              <div className="bg-black/60 backdrop-blur-xl px-2.5 py-1 rounded-lg text-[9px] font-bold text-white/70 border border-white/10 shadow-2xl flex items-center gap-1">
                <span className="text-red-400/60">OUT</span> {end.toFixed(2)}s
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
