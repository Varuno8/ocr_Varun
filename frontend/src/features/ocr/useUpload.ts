import { useCallback, useState } from 'react';
import { apiClient } from '../../lib/apiClient';

type UploadResponse = {
  id: string;
  filename: string;
  method: string;
  elapsed: number;
  text: string;
  createdAt: string;
};

export function useUpload(onSuccess?: (data: UploadResponse) => void) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (formData: FormData) => {
      setIsPending(true);
      setError(null);
      try {
        const response = await apiClient.post<UploadResponse>('/documents', formData);
        onSuccess?.(response);
        return response;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [onSuccess],
  );

  return { mutate, isPending, error };
}
