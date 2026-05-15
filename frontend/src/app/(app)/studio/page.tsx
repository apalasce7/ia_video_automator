"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useInfluencers } from "@/lib/hooks/useInfluencers";

import { InputModeSelector } from "@/components/studio/InputModeSelector";
import { VideoAnalyzer } from "@/components/studio/VideoAnalyzer";
import { InfluencerSelector, type VoiceProductionParams } from "@/components/studio/InfluencerSelector";
import { ProductForm } from "@/components/studio/ProductForm";
import { NarrativeConfig } from "@/components/studio/NarrativeConfig";
import { ProductionConfig } from "@/components/studio/ProductionConfig";
import { LaunchButton } from "@/components/studio/LaunchButton";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Camera, Film, Zap, Mic, Package } from "lucide-react";

// ── Icono + sección de accordion con estilo consistente ──
function StudioSection({
  value,
  icon: Icon,
  title,
  accentColor,
  children,
}: {
  value: string;
  icon: any;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    violet: "data-[state=open]:ring-violet-500/30 data-[state=open]:bg-violet-500/[0.03] text-violet-400 bg-violet-500/10 group-data-[state=open]:bg-violet-500",
    emerald: "data-[state=open]:ring-emerald-500/30 data-[state=open]:bg-emerald-500/[0.03] text-emerald-400 bg-emerald-500/10 group-data-[state=open]:bg-emerald-500",
    amber: "data-[state=open]:ring-amber-500/30 data-[state=open]:bg-amber-500/[0.03] text-amber-400 bg-amber-500/10 group-data-[state=open]:bg-amber-500",
    pink: "data-[state=open]:ring-pink-500/30 data-[state=open]:bg-pink-500/[0.03] text-pink-400 bg-pink-500/10 group-data-[state=open]:bg-pink-500",
    blue: "data-[state=open]:ring-blue-500/30 data-[state=open]:bg-blue-500/[0.03] text-blue-400 bg-blue-500/10 group-data-[state=open]:bg-blue-500",
  };
  const colors = colorMap[accentColor] || colorMap.violet;
  const [ringClass, bgClass, textClass, iconBgClass, iconOpenClass] = colors.split(" ");

  return (
    <AccordionItem
      value={value}
      className={`border border-white/10 bg-white/[0.02] rounded-2xl px-8 overflow-hidden transition-all duration-300 ${ringClass} ${bgClass} data-[state=open]:ring-2`}
    >
      <AccordionTrigger className={`hover:no-underline py-6 text-sm font-black uppercase tracking-widest ${textClass} group`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${iconBgClass} ${iconOpenClass} group-data-[state=open]:text-black`}>
            <Icon className="w-4 h-4" />
          </div>
          {title}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-8 px-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

export default function StudioPage() {
  const router = useRouter();
  const { influencers } = useInfluencers();

  // ── Estado del formulario ──
  const [inputMode, setInputMode] = useState<"url" | "image">("url");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [directImage, setDirectImage] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedFrameUrl, setSelectedFrameUrl] = useState<string | null>(null);

  const [selectedInfluencerId, setSelectedInfluencerId] = useState("");
  const [voiceParams, setVoiceParams] = useState<VoiceProductionParams>({
    micDistance: "medium-distance mic",
    speechPace: "moderate pacing",
    pitch: "consistent mid-range pitch",
  });

  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [productName, setProductName] = useState("");
  const [productDetails, setProductDetails] = useState("");

  const [audioMode, setAudioMode] = useState("lip-sync");
  const [language, setLanguage] = useState("es");
  const [autoExecution, setAutoExecution] = useState(false);
  const [storyGuide, setStoryGuide] = useState("");

  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("480p");
  const [editStyle, setEditStyle] = useState("fast-cuts");
  const [directorModel, setDirectorModel] = useState("gemini-flash");

  // ── Influencer seleccionado ──
  const selectedInfluencer = useMemo(
    () => influencers.find((i) => i.id === selectedInfluencerId) ?? null,
    [influencers, selectedInfluencerId]
  );

  // ── Mapeo de acentos por idioma ──
  const accentMap: Record<string, string> = {
    "es": "native Castilian Spanish from Spain",
    "es-latam": "native Latin American Spanish (Mexico)",
    "en": "native American English",
    "fr": "native French from France",
    "de": "native German",
    "it": "native Italian",
    "pt": "native Portuguese from Portugal",
  };

  // ── Voice Print dinámico (Acento + Atributos base + Params de producción) ──
  const dynamicVoicePrint = useMemo(() => {
    if (!selectedInfluencer) return "";
    
    const accent = accentMap[language] || "native Spanish";
    const age = selectedInfluencer.age || "25";
    const gender = selectedInfluencer.gender || "female";
    const tone = selectedInfluencer.tone || "energetic UGC tone";
    const timbre = selectedInfluencer.timbre || "slightly raspy timbre";
    
    // Construcción estructurada para evitar duplicaciones
    return `${age}-year-old ${gender}, ${accent}, ${tone}, ${timbre}, ${voiceParams.micDistance} volume, ${voiceParams.pitch}, ${voiceParams.speechPace}.`;
  }, [selectedInfluencer, voiceParams, language]);

  const handleLaunchSuccess = (jobId: string) => {
    // Redirigir al monitor (Mesa de Montaje) con el job seleccionado
    router.push(`/?tab=monitor&job=${jobId}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header de página */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Estudio de Creación</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configura tu producción UGC a partir de un viral de TikTok o imagen directa.
        </p>
      </div>

      {/* Selector de modo de entrada */}
      <InputModeSelector mode={inputMode} onChange={setInputMode} />

      {/* Analizador de vídeo / Imagen */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <VideoAnalyzer
          mode={inputMode}
          tiktokUrl={tiktokUrl}
          onUrlChange={setTiktokUrl}
          directImage={directImage}
          onDirectImageChange={setDirectImage}
          analysisResult={analysisResult}
          onAnalysisResult={setAnalysisResult}
          selectedFrameUrl={selectedFrameUrl}
          onFrameSelect={setSelectedFrameUrl}
        />
      </div>

      {/* Acordeones de configuración */}
      <Accordion defaultValue={["identidad"]} className="space-y-4">

        <StudioSection value="identidad" icon={Camera} title="1. Influencer e Identidad" accentColor="violet">
          <InfluencerSelector
            influencers={influencers}
            selectedId={selectedInfluencerId}
            onSelect={setSelectedInfluencerId}
            voiceParams={voiceParams}
            onVoiceParamsChange={setVoiceParams}
            dynamicVoicePrint={dynamicVoicePrint}
          />
        </StudioSection>

        <StudioSection value="producto" icon={Package} title="2. Producto" accentColor="emerald">
          <ProductForm
            productFiles={productFiles}
            onProductFilesChange={setProductFiles}
            productName={productName}
            onProductNameChange={setProductName}
            productDetails={productDetails}
            onProductDetailsChange={setProductDetails}
          />
        </StudioSection>

        <StudioSection value="narrativa" icon={Film} title="3. Narrativa y Guión" accentColor="amber">
          <NarrativeConfig
            audioMode={audioMode}
            onAudioModeChange={setAudioMode}
            language={language}
            onLanguageChange={setLanguage}
            autoExecution={autoExecution}
            onAutoExecutionChange={setAutoExecution}
            storyGuide={storyGuide}
            onStoryGuideChange={setStoryGuide}
          />
        </StudioSection>

        <StudioSection value="produccion" icon={Zap} title="4. Motor IA y Producción" accentColor="pink">
          <ProductionConfig
            directorModel={directorModel}
            onDirectorModelChange={setDirectorModel}
            editStyle={editStyle}
            onEditStyleChange={setEditStyle}
            resolution={resolution}
            onResolutionChange={setResolution}
            duration={duration}
            onDurationChange={setDuration}
          />
        </StudioSection>

      </Accordion>

      {/* Botón de lanzamiento */}
      <LaunchButton
        selectedInfluencer={selectedInfluencer}
        voicePrint={dynamicVoicePrint}
        inputMode={inputMode}
        tiktokUrl={tiktokUrl}
        selectedFrameUrl={selectedFrameUrl}
        directImage={directImage}
        analysisJobId={analysisResult?.job_id ?? null}
        productFiles={productFiles}
        productName={productName}
        productDetails={productDetails}
        audioMode={audioMode}
        language={language}
        autoExecution={autoExecution}
        storyGuide={storyGuide}
        duration={duration}
        resolution={resolution}
        editStyle={editStyle}
        directorModel={directorModel}
        onSuccess={handleLaunchSuccess}
      />
    </div>
  );
}
