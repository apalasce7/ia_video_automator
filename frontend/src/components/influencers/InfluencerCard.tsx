"use client";

import { useState } from "react";
import { toast } from "sonner";
import { API_URL } from "@/lib/utils";
import { newVoice } from "@/lib/api";
import type { Influencer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Pencil, RefreshCw, User, Sparkles, AudioLines } from "lucide-react";

interface InfluencerCardProps {
  influencer: Influencer;
  onEdit: (influencer: Influencer) => void;
  onRefresh: () => void;
}

export function InfluencerCard({ influencer, onEdit, onRefresh }: InfluencerCardProps) {
  const [regenerating, setRegenerating] = useState(false);

  const handleNewVoice = async () => {
    setRegenerating(true);
    try {
      const res = await newVoice(influencer.id);
      if (!res.ok) throw new Error();
      toast.success("Nuevo seed de voz generado");
      onRefresh();
    } catch {
      toast.error("Error al regenerar el seed de voz.");
    } finally {
      setRegenerating(false);
    }
  };

  const faceUrl = influencer.local_path
    ? `${API_URL}/${influencer.local_path}`
    : null;

  // Extraer atributos para mostrar en lugar del string crudo
  // Intentamos usar los campos específicos si existen, si no parseamos el voice_print
  const vp = influencer.voice_print || "";
  const ageMatch = vp.match(/(\d+)-year-old/);
  const genderMatch = vp.match(/female|male|non-binary/);
  
  // Extraer Tono y Timbre (asumimos que están al final separados por comas)
  const parts = vp.split(',').map(p => p.trim());
  const tonePart = parts.length > 2 ? parts[parts.length - 2] : "UGC";
  const timbrePart = parts.length > 1 ? parts[parts.length - 1] : "Natural";

  const age = influencer.age || (ageMatch ? ageMatch[1] : "25");
  const gender = influencer.gender 
    ? (influencer.gender === 'female' ? 'Fem' : influencer.gender === 'male' ? 'Masc' : 'NB')
    : (genderMatch ? (genderMatch[0] === 'female' ? 'Fem' : genderMatch[0] === 'male' ? 'Masc' : 'NB') : "Fem");

  // Limpiar el texto del tono/timbre para mostrarlo bonito (quitar "tone", "timbre")
  const displayTone = (influencer.tone || tonePart).replace(/ tone/g, '').replace(/energetic/g, 'Energético');
  const displayTimbre = (influencer.timbre || timbrePart).replace(/ timbre/g, '').replace(/raspy/g, 'Rasposo').replace(/smooth/g, 'Suave').replace(/clear bright/g, 'Brillante');

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-violet-500/30 hover:bg-white/[0.07] transition-all duration-300">
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header con foto */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-violet-900/30 to-zinc-900/50">
        {faceUrl ? (
          <img
            src={faceUrl}
            alt={influencer.name}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-20 w-20 text-zinc-700" />
          </div>
        )}
        {/* Overlay degradado */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />

        {/* Seed badge */}
        <Badge className="absolute top-3 right-3 bg-black/60 text-zinc-300 border-white/10 text-[10px] font-mono backdrop-blur-sm">
          seed: {influencer.seed}
        </Badge>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-white truncate">{influencer.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
             <Badge variant="secondary" className="bg-white/5 text-[9px] uppercase tracking-wider text-zinc-400 h-5 border-none px-2">
               {age} años
             </Badge>
             <Badge variant="secondary" className="bg-white/5 text-[9px] uppercase tracking-wider text-zinc-400 h-5 border-none px-2">
               {gender}
             </Badge>
          </div>
        </div>

        {/* Atributos de voz estructurados */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 p-2" title={`Tono: ${displayTone}`}>
            <Sparkles className="h-3 w-3 text-violet-400 shrink-0" />
            <span className="text-[10px] text-zinc-400 truncate capitalize">{displayTone}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 p-2" title={`Timbre: ${displayTimbre}`}>
            <AudioLines className="h-3 w-3 text-violet-400 shrink-0" />
            <span className="text-[10px] text-zinc-400 truncate capitalize">{displayTimbre}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-auto flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white text-xs h-8"
            onClick={() => onEdit(influencer)}
          >
            <Pencil className="mr-1.5 h-3 w-3" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-violet-300 text-xs h-8 px-3"
            onClick={handleNewVoice}
            disabled={regenerating}
            title="Regenerar seed de voz"
          >
            <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
