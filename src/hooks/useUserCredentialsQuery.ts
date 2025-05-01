'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

export interface UserCredential {
  id: string;
  platform: string;
  external_id: string;
  username: string | null;
  created_at: string;
  updated_at: string;
}

interface UserCredentialsResponse {
  credentials: UserCredential[];
}

/**
 * Hook to fetch all credentials linked to the current user
 */
export function useUserCredentialsQuery() {
  const { authFetch } = useAuthFetch();
  
  return useQuery<UserCredentialsResponse, Error>({
    queryKey: ['userCredentials'],
    queryFn: async () => {
      // authFetch handles parsing, error responses, and authentication
      return authFetch<UserCredentialsResponse>('/api/user/credentials');
    },
    staleTime: 60 * 1000, // 1 minute
  });
} 