import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useAuth } from '@/context/AuthContext';

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
  const { jwt } = useAuth();

  return useQuery<UserWizardsResponse, Error>({
    queryKey: ['userWizards'],
    queryFn: async () => {
      if (!jwt) {
         console.warn('useUserWizardsQuery: Query function running but JWT is missing. Throwing error.');
         throw new Error('Attempted fetch without JWT'); 
      }
      const response = await authFetch<UserWizardsResponse>('/api/user/wizards');
      return response;
    },
    ...options,
  });
}; 