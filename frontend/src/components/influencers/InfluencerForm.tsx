"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { API_URL } from "@/lib/utils";
import type { Influencer } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, User, Image as ImageIcon, Loader2, ChevronDown } from "lucide-react";

interface InfluencerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  influencer?: Influencer | null;
  onSuccess: () => void;
}

// Opciones en español con su traducción interna para el modelo
const TONE_OPTIONS = [
  { label: "Energético UGC", value: "energetic UGC tone" },
  { label: "Conversacional", value: "conversational tone" },
  { label: "Narrativo", value: "narrative tone" },
  { label: "Entusiasta", value: "enthusiastic tone" },
  { label: "Profesional", value: "professional tone" },
  { label: "Susurrante", value: "whispering tone" },
];

const TIMBRE_OPTIONS = [
  { label: "Rasposo", value: "raspy timbre" },
  { label: "Suave / Sedoso", value: "smooth timbre" },
  { label: "Nasal", value: "nasal timbre" },
  { label: "Profundo", value: "deep timbre" },
  { label: "Metálico", value: "metallic timbre" },
  { label: "Claro / Brillante", value: "clear bright timbre" },
];

export function InfluencerForm({ open, onOpenChange, influencer, onSuccess }: InfluencerFormProps) {
  const isEditing = Boolean(influencer);
  const [name, setName] = useState(influencer?.name ?? "");
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const faceRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLInputElement>(null);

  // Atributos base de la voz
  const [voiceParams, setVoiceParams] = useState({
    age: "25",
    gender: "female",
    tone: TONE_OPTIONS[0].value,
    timbre: TIMBRE_OPTIONS[1].value,
  });

  useEffect(() => {
    if (influencer) {
      setName(influencer.name);
      // Intentar extraer valores si existen (esto asume que los guardamos como propiedades en el futuro)
      // Por ahora, si es edición, mantenemos los defaults o intentamos parsear
      if (influencer.voice_print) {
        const vp = influencer.voice_print;
        const ageMatch = vp.match(/(\d+)-year-old/);
        const genderMatch = vp.match(/female|male|non-binary/);
        if (ageMatch) setVoiceParams(v => ({ ...v, age: ageMatch[1] }));
        if (genderMatch) setVoiceParams(v => ({ ...v, gender: genderMatch[0] as any }));
      }
    } else {
      setName("");
      setVoiceParams({
        age: "25",
        gender: "female",
        tone: TONE_OPTIONS[0].value,
        timbre: TIMBRE_OPTIONS[1].value,
      });
    }
  }, [influencer, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("El nombre es obligatorio."); return; }
    if (!isEditing && !faceFile) { toast.error("La foto de cara es obligatoria."); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      
      // Guardamos los atributos individuales en el voice_print para compatibilidad
      // Pero el "Mic" y "Pacing" se añadirán dinámicamente en el estudio
      const baseVoicePrint = `${voiceParams.age}-year-old ${voiceParams.gender}, native Spanish, ${voiceParams.tone}, ${voiceParams.timbre}`;
      fd.append("voice_print", baseVoicePrint);
      
      // También enviamos los campos individuales para que el backend los guarde si el schema lo permite
      fd.append("age", voiceParams.age);
      fd.append("gender", voiceParams.gender);
      fd.append("tone", voiceParams.tone);
      fd.append("timbre", voiceParams.timbre);

      if (faceFile) fd.append("face_image", faceFile);
      if (sheetFile) fd.append("sheet_image", sheetFile);

      const url = isEditing
        ? `${API_URL}/api/influencers/${influencer!.id}/update`
        : `${API_URL}/api/influencers/create`;
      
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      
      toast.success(isEditing ? "Influencer actualizado ✓" : "Influencer creado ✓");
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const DropZone = ({
    label, icon: Icon, file, fileRef, accept, onChange,
    previewUrl,
  }: {
    label: string; icon: any; file: File | null; fileRef: React.RefObject<HTMLInputElement | null>;
    accept: string; onChange: (f: File) => void; previewUrl?: string;
  }) => (
    <div
      className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 bg-white/5 p-5 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
      onClick={() => fileRef.current?.click()}
    >
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
      {(file || previewUrl) ? (
        <img
          src={file ? URL.createObjectURL(file) : `${API_URL}/${previewUrl}`}
          alt={label}
          className="h-24 w-24 rounded-lg object-cover"
        />
      ) : (
        <Icon className="h-10 w-10 text-zinc-600 group-hover:text-violet-400 transition-colors" />
      )}
      <p className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">{file ? file.name : label}</p>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] border-l border-white/10 bg-[#08080c] text-white overflow-y-auto px-8" side="right">
        <SheetHeader className="mb-8 pt-4">
          <SheetTitle className="text-white text-2xl font-bold tracking-tight">
            {isEditing ? `Editar — ${influencer?.name}` : "Nuevo Influencer"}
          </SheetTitle>
          <SheetDescription className="text-zinc-500 text-sm">
            {isEditing
              ? "Actualiza los datos y fotos del influencer."
              : "Configura el perfil visual y los atributos de voz del nuevo influencer IA."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 pb-10">
          {/* Nombre */}
          <div className="space-y-2.5">
            <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Nombre del Influencer</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Lena Lace V3"
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-700 h-11 focus-visible:ring-violet-500"
            />
          </div>

          {/* Fotos */}
          <div className="space-y-2.5">
            <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Identidad Visual</Label>
            <div className="grid grid-cols-2 gap-4">
              <DropZone
                label="Foto de Cara"
                icon={User}
                file={faceFile}
                fileRef={faceRef}
                accept="image/*"
                onChange={setFaceFile}
                previewUrl={influencer?.local_path}
              />
              <DropZone
                label="Body Sheet"
                icon={ImageIcon}
                file={sheetFile}
                fileRef={sheetRef}
                accept="image/*"
                onChange={setSheetFile}
                previewUrl={influencer?.sheet_path ?? undefined}
              />
            </div>
          </div>

          {/* Perfil de Voz */}
          <div className="space-y-5">
            <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Perfil de Voz IA (Base)</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-500 text-xs">Edad</Label>
                <Input 
                  value={voiceParams.age} 
                  onChange={e => setVoiceParams({...voiceParams, age: e.target.value})}
                  className="bg-white/5 border-white/10 h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-500 text-xs">Género</Label>
                <div className="relative">
                  <select 
                    value={voiceParams.gender} 
                    onChange={e => setVoiceParams({...voiceParams, gender: e.target.value as any})}
                    className="w-full bg-white/5 border border-white/10 rounded-md h-10 px-3 text-sm text-white appearance-none focus:ring-1 focus:ring-violet-500 outline-none"
                  >
                    <option value="female" className="bg-[#0f0f15]">Femenino</option>
                    <option value="male" className="bg-[#0f0f15]">Masculino</option>
                    <option value="non-binary" className="bg-[#0f0f15]">No binario</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-500 text-xs">Tono / Estilo</Label>
              <div className="relative">
                <select 
                  value={voiceParams.tone} 
                  onChange={e => setVoiceParams({...voiceParams, tone: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-md h-10 px-3 text-sm text-white appearance-none focus:ring-1 focus:ring-violet-500 outline-none"
                >
                  {TONE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#0f0f15]">{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-500 text-xs">Timbre</Label>
              <div className="relative">
                <select 
                  value={voiceParams.timbre} 
                  onChange={e => setVoiceParams({...voiceParams, timbre: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-md h-10 px-3 text-sm text-white appearance-none focus:ring-1 focus:ring-violet-500 outline-none"
                >
                  {TIMBRE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#0f0f15]">{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <p className="text-[10px] text-zinc-600 italic mt-2">
              * La distancia del micro y el ritmo se configuran al crear cada vídeo, ya que dependen del proyecto.
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-6">
            <Button
              variant="outline"
              className="flex-1 border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white h-11"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold h-11 shadow-lg shadow-violet-500/20"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isEditing ? "Guardar cambios" : "Crear Influencer"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
