import { useMutation } from '@tanstack/react-query';
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
  return useMutation({
    mutationFn: async (formData: FormData) => apiClient.post<UploadResponse>('/documents', formData),
    onSuccess,
  });
}
