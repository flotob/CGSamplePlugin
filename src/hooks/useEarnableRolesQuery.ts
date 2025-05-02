'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Re-define types here for hook usage, mirroring the API response structure
interface GrantingWizard {
  wizard_id: string;
  wizard_name: string;
}

interface EarnableRole {
  role_id: string;
  role_title: string;
  role_description: string | null;
  granting_wizards: GrantingWizard[];
}

interface EarnableRolesResponse {
  earnable_roles: EarnableRole[];
}

/**
 * Hook to fetch the roles the current user can earn via active, uncompleted wizards.
 *
 * @returns React Query result object containing the earnable roles and associated wizards.
 */
export function useEarnableRolesQuery(): UseQueryResult<EarnableRolesResponse, Error> {
  const { authFetch } = useAuthFetch();

  return useQuery<EarnableRolesResponse, Error>({
    // Query key is simple as the user context is handled by authFetch
    queryKey: ['earnableRoles'], 
    queryFn: async () => {
      // Use authFetch to make the authenticated GET request
      return authFetch<EarnableRolesResponse>('/api/user/earnable-roles');
    },
    // Keep data fresh for a short period, but refetch on window focus etc. is default
    staleTime: 60 * 1000, // 1 minute
    // Enable query by default when hook is used
    enabled: true, 
  });
} 