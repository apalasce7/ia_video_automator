import { useState, useEffect } from 'react';
import { BackendStatus } from '../types';
import { checkHealth } from '../api';

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await checkHealth();
        setStatus(data);
      } catch (err) {
        setStatus({
          status: 'error',
          wavespeed_api: 'error',
          minimax_api: 'error',
          active_jobs: 0
        });
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Poll cada 10s para health
    return () => clearInterval(interval);
  }, []);

  return status;
}
