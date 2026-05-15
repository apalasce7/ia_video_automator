"use client";
import { useState, useCallback, useEffect } from 'react';
import { Job } from '../types';
import { fetchJobs as apiFetchJobs } from '../api';

export function useJobs(intervalMs = 2000) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await apiFetchJobs();
      // Convierte objeto a array de jobs
      const jobsArray = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
      }));
      // Orden descendente por default
      jobsArray.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setJobs(jobsArray);

      // Auto-seleccionar job más reciente activo si no hay selección
      setSelectedJobId(prev => {
        if (prev) return prev; // mantener selección actual
        const active = jobsArray.find((j: any) =>
          !['completado', 'error', 'interrumpido'].some(s => j.status?.includes(s))
        );
        return active?.id ?? jobsArray[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, intervalMs);
    return () => clearInterval(interval);
  }, [fetchJobs, intervalMs]);

  const activeJob = jobs.find(j => j.id === selectedJobId) ?? null;

  return { jobs, loading, refetch: fetchJobs, selectedJobId, setSelectedJobId, activeJob };
}

