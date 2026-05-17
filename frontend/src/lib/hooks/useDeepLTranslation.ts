"use client";
import { useState, useRef, useCallback } from "react";
import { API_URL } from "@/lib/utils";

/**
 * Hook de traducción DeepL — extracción exacta 1:1 del monolito (page.tsx L.195-385)
 * Encapsula TODO el estado de traducción para poder compartirlo entre
 * SceneGrid y ResultModal desde el componente padre (MontajePage).
 */
export function useDeepLTranslation() {
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const [esCache, setEsCache] = useState<Record<string, string>>({});
  const [enOverride, setEnOverride] = useState<Record<string, string>>({});
  const [contentVersion, setContentVersion] = useState<Record<string, number>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const liveValuesRef = useRef<Record<string, string>>({});
  const dirtyTagsRef = useRef<Record<string, Set<string>>>({});

  const translateWithDeepL = useCallback(async (texts: string[], targetLang: string): Promise<string[]> => {
    try {
      const res = await fetch(`${API_URL}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, target_lang: targetLang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return (data.translations as any[]).map((t: any) => t.text);
    } catch (e) {
      console.error("[DeepL]", e);
      return texts;
    }
  }, []);

  const handlePromptTranslation = useCallback(async (
    sceneKey: string,
    sections: { tag: string; originalContent: string }[]
  ) => {
    const isCurrentlyES = showTranslation[sceneKey];
    setTranslating(prev => ({ ...prev, [sceneKey]: true }));
    try {
      if (!isCurrentlyES) {
        const newEsCache: Record<string, string> = {};
        const toTranslate: { compositeKey: string; text: string }[] = [];
        for (const { tag, originalContent } of sections) {
          const compositeKey = `${sceneKey}___${tag}`;
          const currentVal = liveValuesRef.current[compositeKey] ?? originalContent;
          const cached = esCache[compositeKey];
          const isDirty = dirtyTagsRef.current[sceneKey]?.has(tag);
          if (cached && !isDirty) newEsCache[compositeKey] = cached;
          else toTranslate.push({ compositeKey, text: currentVal });
        }
        if (toTranslate.length > 0) {
          const protectedMap: Record<number, string> = {};
          const textsToTranslate = toTranslate.map((t, idx) => {
            if (t.compositeKey.toUpperCase().includes("DIALOGUE")) {
              const match = t.text.match(/(['"])([^'"]*)(['"])/);
              if (match) { protectedMap[idx] = match[2]; return t.text.replace(match[2], "PROTECTED_SPOKEN_TEXT"); }
            }
            return t.text;
          });
          const translated = await translateWithDeepL(textsToTranslate, "ES");
          toTranslate.forEach(({ compositeKey }, i) => {
            let val = translated[i];
            if (protectedMap[i] !== undefined) val = val.replace("PROTECTED_SPOKEN_TEXT", protectedMap[i]);
            newEsCache[compositeKey] = val;
          });
        }
        setEsCache(prev => ({ ...prev, ...newEsCache }));
        setShowTranslation(prev => ({ ...prev, [sceneKey]: true }));
        setContentVersion(prev => ({ ...prev, [sceneKey]: (prev[sceneKey] || 0) + 1 }));
        if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
        dirtyTagsRef.current[sceneKey].clear();
      } else {
        const dirtySet = dirtyTagsRef.current[sceneKey] || new Set<string>();
        const dirtyList = [...dirtySet];
        if (dirtyList.length > 0) {
          const protectedMap: Record<number, string> = {};
          const textsToTranslate = dirtyList.map((tag, idx) => {
            const compositeKey = `${sceneKey}___${tag}`;
            const text = liveValuesRef.current[compositeKey] || esCache[compositeKey] || "";
            if (tag.toUpperCase().includes("DIALOGUE")) {
              const match = text.match(/(['"])([^'"]*)(['"])/);
              if (match) { protectedMap[idx] = match[2]; return text.replace(match[2], "PROTECTED_SPOKEN_TEXT"); }
            }
            return text;
          });
          const translated = await translateWithDeepL(textsToTranslate, "EN-US");
          const newEnOverride: Record<string, string> = {};
          dirtyList.forEach((tag, i) => {
            let val = translated[i];
            if (protectedMap[i] !== undefined) val = val.replace("PROTECTED_SPOKEN_TEXT", protectedMap[i]);
            newEnOverride[`${sceneKey}___${tag}`] = val;
          });
          setEnOverride(prev => ({ ...prev, ...newEnOverride }));
        }
        setShowTranslation(prev => ({ ...prev, [sceneKey]: false }));
        setContentVersion(prev => ({ ...prev, [sceneKey]: (prev[sceneKey] || 0) + 1 }));
        if (!dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey] = new Set();
        dirtyTagsRef.current[sceneKey].clear();
        setTimeout(() => {
          const sceneIdx = sceneKey.split("-").pop();
          const parts = Array.from(document.querySelectorAll(`[data-edit-prompt="${sceneIdx}"], [data-scene-prompt="${sceneIdx}"]`)) as HTMLTextAreaElement[];
          if (parts.length > 0) {
            const merged = parts.map(p => `${p.getAttribute("data-tag")} ${p.value}`).join("\n");
            const jobId = sceneKey.substring(0, sceneKey.lastIndexOf("-"));
            [`edit-prompt-${jobId}-${sceneIdx}`, `plan-prompt-${sceneIdx}`].forEach(id => {
              const master = document.getElementById(id) as HTMLTextAreaElement;
              if (master) master.value = merged.trim();
            });
          }
        }, 150);
      }
    } finally {
      setTranslating(prev => ({ ...prev, [sceneKey]: false }));
    }
  }, [showTranslation, esCache, translateWithDeepL]);

  const handleScriptTranslation = useCallback(async (sceneKey: string, originalContent: string) => {
    const scriptKey = `${sceneKey}___SCRIPT`;
    const isCurrentlyES = showTranslation[scriptKey];
    setTranslating(prev => ({ ...prev, [scriptKey]: true }));
    try {
      if (!isCurrentlyES) {
        const currentVal = liveValuesRef.current[scriptKey] ?? originalContent;
        const cached = esCache[scriptKey];
        const isDirty = dirtyTagsRef.current[sceneKey]?.has("SCRIPT");
        if (cached && !isDirty) {
          setShowTranslation(prev => ({ ...prev, [scriptKey]: true }));
        } else {
          const translated = await translateWithDeepL([currentVal], "ES");
          setEsCache(prev => ({ ...prev, [scriptKey]: translated[0] }));
          setShowTranslation(prev => ({ ...prev, [scriptKey]: true }));
        }
      } else {
        const isDirty = dirtyTagsRef.current[sceneKey]?.has("SCRIPT");
        if (isDirty) {
          const currentES = liveValuesRef.current[scriptKey] || esCache[scriptKey] || "";
          const translated = await translateWithDeepL([currentES], "EN-US");
          setEnOverride(prev => {
            const tagKey = "[DIALOGUE]:";
            const compKey = `${sceneKey}___${tagKey}`;
            const newValues = { ...prev, [scriptKey]: translated[0] };
            const oldDialogue = prev[compKey] || "";
            if (oldDialogue) newValues[compKey] = oldDialogue.replace(/(['"])([^'"]*?)(['"])/, `$1${translated[0]}$3`);
            return newValues;
          });
        }
        setShowTranslation(prev => ({ ...prev, [scriptKey]: false }));
      }
      setContentVersion(prev => ({
        ...prev,
        [scriptKey]: (prev[scriptKey] || 0) + 1,
        [sceneKey]: (prev[sceneKey] || 0) + 1,
      }));
      if (dirtyTagsRef.current[sceneKey]) dirtyTagsRef.current[sceneKey].delete("SCRIPT");
    } finally {
      setTranslating(prev => ({ ...prev, [scriptKey]: false }));
    }
  }, [showTranslation, esCache, translateWithDeepL]);

  return {
    showTranslation, esCache, enOverride, contentVersion, translating,
    liveValuesRef, dirtyTagsRef,
    setEsCache, setEnOverride,
    handlePromptTranslation, handleScriptTranslation,
  };
}
