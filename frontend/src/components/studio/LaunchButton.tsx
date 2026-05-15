"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/utils";
import { Rocket, Loader2 } from "lucide-react";
import type { Influencer } from "@/lib/types";

interface LaunchButtonProps {
  // Influencer
  selectedInfluencer: Influencer | null;
  voicePrint: string; // ya construido dinámicamente
  // Input
  inputMode: "url" | "image";
  tiktokUrl: string;
  selectedFrameUrl: string | null;
  directImage: File | null;
  analysisJobId: string | null;
  // Producto
  productFiles: File[];
  productName: string;
  productDetails: string;
  // Narrativa
  audioMode: string;
  language: string;
  autoExecution: boolean;
  storyGuide: string;
  // Producción
  duration: number;
  resolution: string;
  editStyle: string;
  directorModel: string;
  // Callbacks
  onSuccess: (jobId: string) => void;
}

export function LaunchButton({
  selectedInfluencer,
  voicePrint,
  inputMode,
  tiktokUrl,
  selectedFrameUrl,
  directImage,
  analysisJobId,
  productFiles,
  productName,
  productDetails,
  audioMode,
  language,
  autoExecution,
  storyGuide,
  duration,
  resolution,
  editStyle,
  directorModel,
  onSuccess,
}: LaunchButtonProps) {
  const [loading, setLoading] = useState(false);

  // Validación
  const hasInput = inputMode === "url" ? !!tiktokUrl : !!directImage;
  const hasInfluencer = !!selectedInfluencer;
  const hasProduct = productFiles.length > 0 && !!productDetails;
  const frameOk = inputMode === "url" ? true : true; // frame check opcional

  const isValid = hasInput && hasInfluencer && hasProduct;

  const missingItems = [
    !hasInput && (inputMode === "url" ? "URL de TikTok" : "Imagen directa"),
    !hasInfluencer && "Influencer seleccionado",
    productFiles.length === 0 && "Fotos del producto",
    !productDetails && "Detalles del producto",
  ].filter(Boolean);

  const handleLaunch = async () => {
    if (!isValid || !selectedInfluencer) return;
    setLoading(true);

    try {
      const fd = new FormData();

      // ── Entrada ──
      if (inputMode === "url") {
        fd.append("tiktok_url", tiktokUrl);
        if (selectedFrameUrl) fd.append("selected_frame_url", selectedFrameUrl);
      } else {
        if (directImage) fd.append("direct_image", directImage);
      }
      if (analysisJobId) fd.append("job_id", analysisJobId);

      // ── Influencer (siempre por ID, no por nueva subida) ──
      fd.append("influencer_id", selectedInfluencer.id);
      // Voice print dinámico (atributos base + mic + ritmo de este vídeo)
      fd.append("voice_print", voicePrint);

      // ── Producto ──
      productFiles.forEach((f) => fd.append("product_images", f));
      fd.append("product_name", productName || "Producto");
      fd.append("product_details", productDetails);

      // ── Producción ──
      fd.append("duration", duration.toString());
      fd.append("resolution", resolution);
      fd.append("audio_mode", audioMode);
      fd.append("language", language);
      fd.append("auto_execution", autoExecution.toString());
      fd.append("edit_style", editStyle);
      fd.append("director_model", directorModel);
      if (storyGuide) fd.append("story_guide", storyGuide);

      // Valores legacy para compatibilidad con el backend actual
      fd.append("model", "seedance");
      fd.append("cfg_scale", "0.5");
      fd.append("shot_type", "customize");
      fd.append("negative_prompt", "");
      fd.append("debug_mode", "false");

      const res = await fetch(`${API_URL}/api/produce`, {
        method: "POST",
        body: fd,
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(`🚀 Producción iniciada — Job: ${data.job_id.slice(0, 8)}...`);
      onSuccess(data.job_id);
    } catch (e: any) {
      toast.error("Error al iniciar: " + e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Indicadores de validación */}
      {!isValid && missingItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missingItems.map((item, i) => (
            <span
              key={i}
              className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg"
            >
              ⚠ Falta: {item}
            </span>
          ))}
        </div>
      )}

      <Button
        id="btn-launch-studio"
        onClick={handleLaunch}
        disabled={loading || !isValid}
        className="w-full h-20 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 text-white font-black text-lg uppercase tracking-[0.3em] rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:grayscale group relative overflow-hidden border-0"
      >
        {/* Shimmer */}
        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
        <div className="flex items-center justify-center gap-4 relative z-10">
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Iniciando Producción...</span>
            </>
          ) : (
            <>
              <Rocket className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <span>Generar Vídeo UGC</span>
            </>
          )}
        </div>
      </Button>

      <p className="text-center text-[10px] text-white/20 uppercase font-black tracking-widest">
        Potenciado por Seedance 2.0 & AI Director
      </p>
    </div>
  );
}
