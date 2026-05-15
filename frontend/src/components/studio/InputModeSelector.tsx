"use client";

import { Globe, Camera } from "lucide-react";

interface InputModeSelectorProps {
  mode: "url" | "image";
  onChange: (mode: "url" | "image") => void;
}

export function InputModeSelector({ mode, onChange }: InputModeSelectorProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-2xl h-12">
        <button
          onClick={() => onChange("url")}
          className={`px-6 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
            mode === "url"
              ? "bg-violet-600 text-white shadow-lg"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Viral (URL)
        </button>
        <button
          onClick={() => onChange("image")}
          className={`px-6 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
            mode === "image"
              ? "bg-violet-600 text-white shadow-lg"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Imagen Directa
        </button>
      </div>
    </div>
  );
}
