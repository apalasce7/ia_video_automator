"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropZone } from "@/components/DropZone";
import { API_URL } from "@/lib/utils";
import { RefreshCw, Sparkles, Package } from "lucide-react";

interface ProductFormProps {
  productFiles: File[];
  onProductFilesChange: (files: File[]) => void;
  productName: string;
  onProductNameChange: (name: string) => void;
  productDetails: string;
  onProductDetailsChange: (details: string) => void;
}

export function ProductForm({
  productFiles,
  onProductFilesChange,
  productName,
  onProductNameChange,
  productDetails,
  onProductDetailsChange,
}: ProductFormProps) {
  const [autoSearch, setAutoSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchProduct = async () => {
    if (!productName) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/search_product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: productName }),
      });
      const data = await res.json();
      if (data.details) onProductDetailsChange(data.details);
    } catch (e) {
      console.error("Error searching product:", e);
    }
    setIsSearching(false);
  };

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
        <Package className="w-3.5 h-3.5" /> Producto
      </label>

      {/* Fotos del producto */}
      <DropZone
        label="Fotos del Producto"
        description="Máx 3 imágenes"
        icon="📦"
        multiple
        files={productFiles}
        onFile={(files) => onProductFilesChange(Array.from(files).slice(0, 3))}
      />

      {/* Nombre + búsqueda IA */}
      <div className="space-y-2">
        <label className="text-[10px] text-white/30 uppercase">Nombre del Producto</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={productName}
              onChange={(e) => onProductNameChange(e.target.value)}
              placeholder="Ej: Victoria's Secret Bombshell"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm pr-10 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <button
            onClick={() => setAutoSearch(!autoSearch)}
            title="Activar investigación IA"
            className={`px-3 rounded-xl border text-xs font-bold transition-all ${
              autoSearch
                ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400"
                : "bg-white/5 border-white/10 text-white/30 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
          {autoSearch && (
            <Button
              onClick={handleSearchProduct}
              disabled={isSearching || !productName}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 h-10 px-4 text-xs"
            >
              {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Buscar"}
            </Button>
          )}
        </div>
      </div>

      {/* Detalles */}
      <div className="space-y-2">
        <label className="text-[10px] text-white/30 uppercase">Detalles Hook / Beneficios</label>
        <Textarea
          value={productDetails}
          onChange={(e) => onProductDetailsChange(e.target.value)}
          placeholder={autoSearch ? "La IA investigará automáticamente..." : "¿Por qué comprarlo? Beneficios clave, USPs..."}
          className="bg-white/[0.03] border-white/10 text-white text-xs min-h-[120px] leading-relaxed focus:border-emerald-500"
        />
      </div>
    </div>
  );
}
