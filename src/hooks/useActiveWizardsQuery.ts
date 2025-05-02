'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Mirror the WizardSummary type from the API route
// TODO: Consider sharing types between API and frontend
export interface WizardSummary {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ActiveWizardsResponse {
  wizards: WizardSummary[];
}

/**
 * Hook to fetch active wizards for the current user's community.
 *
 * @returns React Query result object containing the active wizards.
 */
export function useActiveWizardsQuery(): UseQueryResult<ActiveWizardsResponse, Error> {
  const { authFetch } = useAuthFetch();

  return useQuery<ActiveWizardsResponse, Error>({
    // Query key differentiates from admin/all wizards query
    queryKey: ['activeWizards'], 
    queryFn: async () => {
      // Fetch only active wizards
      return authFetch<ActiveWizardsResponse>('/api/wizards?isActive=true');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, 
  });
} 