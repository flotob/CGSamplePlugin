import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Re-define the expected structure for clarity, or import if shared
export interface UserWizard {
  id: string;
  name: string;
  description: string | null;
  required_role_id: string | null;
  progressStatus: 'not-started' | 'in-progress' | 'completed'; 
}

// Update the response type to include heroWizardId
interface UserWizardsResponse {
  wizards: UserWizard[];
  heroWizardId: string | null;
}

export const useUserWizardsQuery = (options?: Omit<UseQueryOptions<UserWizardsResponse, Error>, 'queryKey' | 'queryFn'>): UseQueryResult<UserWizardsResponse, Error> => {
  const { authFetch } = useAuthFetch();

  // Update the expected generic type here
  return useQuery<UserWizardsResponse, Error>({
    queryKey: ['userWizards'],

    // Function to fetch data
    queryFn: async () => {
      // authFetch handles the authentication header
      // Update the expected generic type here too
      const response = await authFetch<UserWizardsResponse>('/api/user/wizards');
      return response; // Return the full response object
    },

    // Options (optional, but good practice)
    staleTime: 5 * 60 * 1000, // Refetch data considered stale after 5 minutes
    // enabled: !!authFetch // Query only runs when authFetch is available (implicitly handled by useAuthFetch)
  });
}; 