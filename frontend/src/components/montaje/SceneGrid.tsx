"use client";
import React from "react";
import { SceneCard } from "./SceneCard";
import type { InspectedResult } from "@/lib/types";

interface DeepLProps {
  showTranslation: Record<string, boolean>;
  esCache: Record<string, string>;
  enOverride: Record<string, string>;
  contentVersion: Record<string, number>;
  translating: Record<string, boolean>;
  liveValuesRef: React.MutableRefObject<Record<string, string>>;
  dirtyTagsRef: React.MutableRefObject<Record<string, Set<string>>>;
  setEsCache: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setEnOverride: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handlePromptTranslation: (sceneKey: string, sections: { tag: string; originalContent: string }[]) => void;
  handleScriptTranslation: (sceneKey: string, originalContent: string) => void;
}

interface Props extends DeepLProps {
  job: any;
  onSelectVersion: (jobId: string, sceneIdx: number, versionIdx: number) => void;
  onRegenerateScene: (jobId: string, prompt?: string, script?: string, sceneIdx?: number) => void;
  onApproveScene: (jobId: string) => void;
  onGenerateNext: (jobId: string) => void;
  onUnlock: (jobId: string, sceneIdx?: number) => void;
  onSaveClipEdits: (jobId: string, sceneIdx: number, edits: any) => void;
  onInspect: (result: InspectedResult) => void;
}

export function SceneGrid({
  job,
  onSelectVersion, onRegenerateScene, onApproveScene,
  onGenerateNext, onUnlock, onSaveClipEdits, onInspect,
  showTranslation, esCache, enOverride, contentVersion, translating,
  liveValuesRef, dirtyTagsRef, setEsCache, setEnOverride,
  handlePromptTranslation, handleScriptTranslation,
}: Props) {
  const escenas: any[] = job.data?.story_plan?.escenas || [];
  if (escenas.length === 0) return null;

  return (
    <div className="space-y-4">
      <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em]">
        Escenas — {escenas.length} planificadas
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {escenas.map((scene: any, idx: number) => (
          <SceneCard
            key={idx}
            job={job} scene={scene} idx={idx}
            showTranslation={showTranslation}
            esCache={esCache} enOverride={enOverride}
            contentVersion={contentVersion} translating={translating}
            liveValuesRef={liveValuesRef} dirtyTagsRef={dirtyTagsRef}
            setEsCache={setEsCache} setEnOverride={setEnOverride}
            onSelectVersion={onSelectVersion}
            onRegenerateScene={onRegenerateScene}
            onApproveScene={onApproveScene}
            onGenerateNext={onGenerateNext}
            onUnlock={onUnlock}
            onSaveClipEdits={onSaveClipEdits}
            onPromptTranslation={handlePromptTranslation}
            onScriptTranslation={handleScriptTranslation}
          />
        ))}
      </div>
    </div>
  );
}
