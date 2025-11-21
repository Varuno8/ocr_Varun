import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

type QueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

function useApiQuery<T>(fetcher: () => Promise<T>): QueryResult<T> {
  const [data, setData] = useState<T>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetcher();
      setData(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}

export function useStats() {
  return useApiQuery(() => apiClient.get('/stats'));
}

export function useModules() {
  return useApiQuery(() => apiClient.get('/modules'));
}

export function useLogs(limit = 50) {
  return useApiQuery(() => apiClient.get(`/logs?limit=${limit}`));
}
