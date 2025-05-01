// Import declarations for the hooks that TypeScript can't find
declare module '@/hooks/useMarkWizardCompleted' {
  import { UseMutationResult } from '@tanstack/react-query';
  
  interface MarkWizardCompletedResult extends UseMutationResult<any, Error, string> {
    earnedRoles: string[];
    isPending: boolean;
    mutate: (wizardId: string) => void;
  }
  
  export function useMarkWizardCompleted(): MarkWizardCompletedResult;
}

declare module '@/hooks/useCommunityInfoQuery' {
  import { UseQueryResult } from '@tanstack/react-query';
  
  interface CommunityInfo {
    id: string;
    title: string;
    roles?: Array<{
      id: string;
      title: string;
      assignmentRules?: {
        type: string;
      } | null;
      [key: string]: any;
    }>;
    [key: string]: any;
  }
  
  export function useCommunityInfoQuery(): UseQueryResult<CommunityInfo, Error>;
} 