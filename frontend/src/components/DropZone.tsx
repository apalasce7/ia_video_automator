"use client";
import { useState, useRef, useCallback } from "react";
import { Camera, Package, Box } from "lucide-react";

function useFileDrop(onDrop: (files: FileList) => void) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      onDrop(e.dataTransfer.files);
    }
  }, [onDrop]);

  return { isDragging, handleDrag, handleDragIn, handleDragOut, handleDrop };
}

export function DropZone({
  label, description, icon, file, onFile, accept = "image/*", multiple = false, files,
}: {
  label: string; description: string; icon?: React.ReactNode;
  file?: File | null; onFile: (files: FileList) => void;
  accept?: string; multiple?: boolean; files?: File[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDragging, handleDrag, handleDragIn, handleDragOut, handleDrop } = useFileDrop(onFile);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDrag}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDrop={handleDrop}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed p-6 
        transition-all duration-300 ease-in-out
        flex flex-col items-center justify-center gap-3 min-h-[160px]
        ${isDragging
          ? "border-violet-500 bg-violet-500/10 scale-[1.02] shadow-lg shadow-violet-500/20"
          : "border-white/10 bg-white/[0.03] hover:border-violet-400/50 hover:bg-violet-500/5"
        }
        ${(file || (files && files.length > 0)) ? "border-emerald-500/50 bg-emerald-500/5" : ""}
      `}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={(e) => e.target.files && onFile(e.target.files)}
      />
      {preview ? (
        <div className="relative w-full flex flex-col items-center gap-2">
          <img src={preview} alt={label} className="w-20 h-20 rounded-lg object-cover border border-white/10 shadow-lg" />
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">✓ Seleccionado</span>
        </div>
      ) : files && files.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex -space-x-2">
            {files.slice(0, 3).map((f, i) => (
              <div key={i} className="w-12 h-12 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shadow-lg backdrop-blur-sm">
                <Box className="w-6 h-6 text-violet-400" />
              </div>
            ))}
          </div>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">✓ {files.length} Archivo(s)</span>
        </div>
      ) : (
        <>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-violet-500/30 transition-colors">
            {icon ? (
              typeof icon === "string" ? <span className="text-2xl">{icon}</span> : icon
            ) : (
              label.includes("Influencer") ? <Camera className="w-8 h-8 text-violet-400 opacity-60" /> : <Package className="w-8 h-8 text-violet-400 opacity-60" />
            )}
          </div>
          <div className="text-center">
            <span className="text-sm font-bold text-white/90 block">{label}</span>
            <span className="text-[10px] text-white/30 mt-1 block uppercase tracking-tighter">{description}</span>
          </div>
        </>
      )}
    </div>
  );
}
