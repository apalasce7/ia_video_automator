"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/DropZone";
import { API_URL } from "@/lib/utils";
import { Camera, Search, Video, RefreshCw, Zap, Check } from "lucide-react";

interface AnalysisResult {
  job_id: string;
  video_url: string;
  frames: string[];
  recommended_frame: string;
}

interface VideoAnalyzerProps {
  mode: "url" | "image";
  tiktokUrl: string;
  onUrlChange: (url: string) => void;
  directImage: File | null;
  onDirectImageChange: (file: File | null) => void;
  analysisResult: AnalysisResult | null;
  onAnalysisResult: (result: AnalysisResult | null) => void;
  selectedFrameUrl: string | null;
  onFrameSelect: (url: string) => void;
}

export function VideoAnalyzer({
  mode,
  tiktokUrl,
  onUrlChange,
  directImage,
  onDirectImageChange,
  analysisResult,
  onAnalysisResult,
  selectedFrameUrl,
  onFrameSelect,
}: VideoAnalyzerProps) {
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [capturingFrame, setCapturingFrame] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toVideoUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_URL}/${url.replace(/^\//, "")}`;
  };

  const handleAnalyze = async () => {
    if (!tiktokUrl) return;
    setAnalyzeLoading(true);
    onAnalysisResult(null);
    onFrameSelect("");

    try {
      const formData = new FormData();
      formData.append("tiktok_url", tiktokUrl);
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      if (data.error) {
        alert("Error analizando: " + data.error);
      } else {
        onAnalysisResult(data);
        onFrameSelect(data.recommended_frame);
      }
    } catch (e: any) {
      alert("❌ Error de Conexión: " + e.message);
    }
    setAnalyzeLoading(false);
  };

  const handleCaptureFrame = async () => {
    if (!videoRef.current || !analysisResult) return;
    setCapturingFrame(true);
    try {
      const timestamp = videoRef.current.currentTime;
      const formData = new FormData();
      formData.append("job_id", analysisResult.job_id);
      formData.append("timestamp", timestamp.toString());
      const res = await fetch(`${API_URL}/api/capture_frame`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.frame_url) {
        onAnalysisResult({ ...analysisResult, frames: [...analysisResult.frames, data.frame_url] });
        onFrameSelect(data.frame_url);
      }
    } catch (e) {
      console.error(e);
    }
    setCapturingFrame(false);
  };

  return (
    <div className="space-y-6">
      {/* Input según modo */}
      {mode === "url" ? (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">
            <Video className="w-3.5 h-3.5" /> URL del Vídeo Viral (TikTok)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://www.tiktok.com/@user/video/..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 transition-all text-sm"
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={analyzeLoading || !tiktokUrl}
              className="bg-violet-600 hover:bg-violet-500 h-[46px] px-6 rounded-xl border-0 shadow-lg shadow-violet-500/20"
            >
              {analyzeLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2 font-black uppercase tracking-wider text-xs">
                  <Zap className="w-4 h-4 fill-current" /> Analizar
                </span>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">
            <Camera className="w-3.5 h-3.5" /> Imagen de Referencia (Pose y Sujeto)
          </label>
          <DropZone
            label="Subir Imagen de Referencia"
            description="9:16 recomendado (autocrop activado)"
            icon="🖼️"
            file={directImage}
            onFile={(files) => onDirectImageChange(files[0])}
          />
        </div>
      )}

      {/* Preview + Selector de Frames */}
      {analysisResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
          {/* Video Preview */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">
              Timeline de Precisión
            </label>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-[9/16] max-h-[55vh] mx-auto shadow-2xl group flex items-center justify-center">
              <video
                ref={videoRef}
                src={toVideoUrl(analysisResult.video_url)}
                controls
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute inset-x-0 bottom-16 p-4 flex justify-center opacity-0 group-hover:opacity-100 transition-all">
                <Button
                  onClick={handleCaptureFrame}
                  disabled={capturingFrame}
                  className="bg-emerald-600 hover:bg-emerald-500 shadow-xl h-10 px-5 gap-2 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                >
                  {capturingFrame ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {capturingFrame ? "Capturando..." : "Capturar momento"}
                </Button>
              </div>
            </div>
          </div>

          {/* Frame Selector */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">
              Selector de Frame IA
            </label>
            <div className="grid grid-cols-3 gap-3 h-[55vh] overflow-y-auto pr-2 custom-scrollbar bg-black/20 p-3 rounded-2xl border border-white/5">
              {analysisResult.frames.map((url, i) => (
                <div
                  key={i}
                  onClick={() => onFrameSelect(url)}
                  className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-300 bg-black shrink-0 ${
                    selectedFrameUrl === url
                      ? "border-emerald-500 ring-4 ring-emerald-500/20 scale-[0.97]"
                      : "border-white/5 opacity-60 hover:opacity-100 hover:scale-[1.02]"
                  }`}
                >
                  <img src={`${toVideoUrl(url)}?t=${Date.now()}`} className="absolute inset-0 w-full h-full object-cover" alt={`Frame ${i}`} />
                  {selectedFrameUrl === url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
                      <div className="bg-emerald-500 text-black rounded-full w-6 h-6 flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[4px]" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
