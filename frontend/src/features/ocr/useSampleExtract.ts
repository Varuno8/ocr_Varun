import { useCallback, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { toast } from '../../lib/toast';

type SampleResponse = {
  id: string;
  filename: string;
  moduleId?: string;
  method: string;
  elapsed: number;
  text: string;
  createdAt: string;
};

export function useSampleExtract(onSuccess?: (data: SampleResponse) => void) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(async () => {
    setIsPending(true);
    setError(null);
    try {
      const response = await apiClient.get<SampleResponse>('/documents/sample');
      onSuccess?.(response);
      toast.success('Loaded sample OCR output');
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load sample text';
      setError(err as Error);
      toast.error(message);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, [onSuccess]);

  return { run, isPending, error };
}
