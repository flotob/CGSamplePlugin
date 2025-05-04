import { useQuery } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

export interface Wizard {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  required_role_id: string | null;
}

export function useWizardsQuery() {
  const { authFetch } = useAuthFetch();
  return useQuery<{ wizards: Wizard[] }, Error>({
    queryKey: ['wizards'],
    queryFn: async () => await authFetch<{ wizards: Wizard[] }>('/api/wizards'),
  });
} 