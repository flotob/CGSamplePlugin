import { useQuery } from '@tanstack/react-query';

export interface StepType {
  id: string;
  name: string;
  description: string | null;
  requires_credentials: boolean;
}

export function useStepTypesQuery() {
  return useQuery<{ step_types: StepType[] }, Error>({
    queryKey: ['step_types'],
    queryFn: async () => {
      const res = await fetch('/api/step_types');
      if (!res.ok) throw new Error('Failed to fetch step types');
      return res.json();
    },
  });
} 