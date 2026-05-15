"use client";

import { useState } from "react";
import { useInfluencers } from "@/lib/hooks/useInfluencers";
import { InfluencerCard } from "@/components/influencers/InfluencerCard";
import { InfluencerForm } from "@/components/influencers/InfluencerForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, PlusCircle, AlertTriangle } from "lucide-react";
import type { Influencer } from "@/lib/types";

export default function InfluencersPage() {
  const { influencers, isLoading, error, refresh } = useInfluencers();
  const [formOpen, setFormOpen] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null);

  const handleEdit = (influencer: Influencer) => {
    setEditingInfluencer(influencer);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingInfluencer(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingInfluencer(null);
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
              <Users className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Influencers IA</h1>
              <p className="text-sm text-zinc-500">
                {isLoading ? "Cargando..." : `${influencers.length} perfil${influencers.length !== 1 ? "es" : ""} configurado${influencers.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-lg shadow-violet-500/20 shrink-0"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Influencer
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium text-sm">Backend desconectado</p>
            <p className="text-xs text-orange-400 mt-0.5">
              {error} — Asegúrate de que el servidor FastAPI está activo en el puerto 8000.
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 overflow-hidden">
              <Skeleton className="h-48 w-full bg-white/5" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-2/3 bg-white/5" />
                <Skeleton className="h-3 w-full bg-white/5" />
                <Skeleton className="h-3 w-4/5 bg-white/5" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 flex-1 bg-white/5" />
                  <Skeleton className="h-8 w-10 bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : influencers.length === 0 && !error ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 py-24 text-center">
          <Users className="mb-4 h-16 w-16 text-zinc-700" />
          <h3 className="text-lg font-semibold text-white mb-2">Sin influencers</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-xs">
            Aún no has creado ningún perfil. Crea tu primer influencer IA para comenzar a producir vídeos.
          </p>
          <Button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-500 text-white">
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear primer Influencer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {influencers.map(inf => (
            <InfluencerCard
              key={inf.id}
              influencer={inf}
              onEdit={handleEdit}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      {/* Form Sheet */}
      <InfluencerForm
        open={formOpen}
        onOpenChange={handleFormClose}
        influencer={editingInfluencer}
        onSuccess={refresh}
      />
    </>
  );
}
