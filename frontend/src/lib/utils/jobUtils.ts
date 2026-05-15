// lib/utils/jobUtils.ts
// Utilidades compartidas de jobs — migración exacta del monolito

export const phaseLabels: Record<string, string> = {
  download:         "Analizar Viral",
  extract_frames:   "Extraer Fotograma",
  select_frame:     "Seleccionar Frame",
  base_image_start: "Clonar Influencer",
  base_image:       "Generar Imagen Base",
  elements:         "Registrar Elementos",
  director:         "IA Director",
  video:            "Producción Escenas",
  ffmpeg:           "Ensamblaje Final",
};

/** Calcula el progreso en % sobre 9 fases totales */
export function getProgressValue(job: any): number {
  if (!job || !job.phases) return 0;
  const total = 9;
  const completed = Object.values(job.phases).filter(
    (s: any) => typeof s === "string" && s.includes("✅")
  ).length;
  const progress = Math.round((completed / total) * 100);
  return isNaN(progress) ? 0 : Math.min(100, progress);
}

/** Clases Tailwind para el badge de estado del job */
export function getStatusBadgeClass(status: string): string {
  if (!status) return "bg-white/5 text-white/40 border-white/10";
  if (status.includes("interrumpido"))
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  if (status.includes("completado"))
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (status.includes("error"))
    return "bg-red-500/20 text-red-400 border-red-500/30";
  if (status.includes("esperando"))
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-violet-500/20 text-violet-400 border-violet-500/30"; // activo
}

/** Color del texto para la tarjeta de job */
export function getStatusColor(status: string): string {
  if (!status) return "bg-white/5 text-white/40 border-white/10";
  if (status.includes("completado"))
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (status.includes("error"))
    return "bg-red-500/20 text-red-400 border-red-500/30";
  if (status.includes("interrumpido"))
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-violet-500/20 text-violet-400 border-violet-500/30";
}

/** Devuelve la etiqueta corta del estado para los badges */
export function getStatusLabel(status: string): string {
  if (!status) return "—";
  return status.replace(/_/g, " ").slice(0, 22);
}
