import { useQuery, UseQueryOptions } from '@tanstack/react-query';
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
  assign_roles_per_step: boolean;
  is_hero: boolean;
}

export function useWizardsQuery(options?: Omit<UseQueryOptions<{ wizards: Wizard[] }, Error>, 'queryKey' | 'queryFn'>) {
  const { authFetch } = useAuthFetch();
  return useQuery<{ wizards: Wizard[] }, Error>({
    queryKey: ['wizards'],
    queryFn: async () => await authFetch<{ wizards: Wizard[] }>('/api/wizards'),
    ...options,
  });
} 