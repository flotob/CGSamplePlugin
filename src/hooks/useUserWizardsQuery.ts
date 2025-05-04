import { useQuery } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Re-define the expected structure for clarity, or import if shared
export interface UserWizard {
  id: string;
  name: string;
  description: string | null;
  required_role_id: string | null;
  progressStatus: 'not-started' | 'in-progress' | 'completed'; 
}

// Define the expected API response structure
interface UserWizardsResponse {
  wizards: UserWizard[];
}

export const useUserWizardsQuery = () => {
  const { authFetch } = useAuthFetch();

  return useQuery<UserWizardsResponse, Error>({
    // Query key for caching
    queryKey: ['userWizards'],

    // Function to fetch data
    queryFn: async () => {
      // authFetch handles the authentication header
      const response = await authFetch('/api/user/wizards');
      // Cast the response to the expected type
      return response as UserWizardsResponse;
    },

    // Options (optional, but good practice)
    staleTime: 5 * 60 * 1000, // Refetch data considered stale after 5 minutes
    // enabled: !!authFetch // Query only runs when authFetch is available (implicitly handled by useAuthFetch)
  });
}; 