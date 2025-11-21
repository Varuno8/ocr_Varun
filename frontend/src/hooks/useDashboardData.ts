import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => apiClient.get('/stats') });
}

export function useModules() {
  return useQuery({ queryKey: ['modules'], queryFn: () => apiClient.get('/modules') });
}

export function useLogs(limit = 50) {
  return useQuery({ queryKey: ['logs', limit], queryFn: () => apiClient.get(`/logs?limit=${limit}`) });
}
