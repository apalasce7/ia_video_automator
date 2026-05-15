"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchInfluencers } from "@/lib/api";
import type { Influencer } from "@/lib/types";

export function useInfluencers() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchInfluencers();
      setInfluencers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError("No se pudo conectar con el backend.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { influencers, isLoading, error, refresh };
}
