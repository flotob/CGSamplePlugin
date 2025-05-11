// Import declarations for the hooks that TypeScript can't find
declare module '@/hooks/useMarkWizardCompleted' {
  import { UseMutationResult } from '@tanstack/react-query';
  
  interface MutateOptions {
    onSuccess?: (data: WizardCompletionResponse) => void;
    onError?: (error: Error) => void;
  }
  
  interface WizardCompletionResponse {
    success: boolean;
    roles: string[];
  }
  
  interface MarkWizardCompletedResult extends UseMutationResult<WizardCompletionResponse, Error, string> {
    earnedRoles: string[];
    isPending: boolean;
    isSuccess: boolean;
    mutate: (wizardId: string, options?: MutateOptions) => void;
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
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }
  
  export function useCommunityInfoQuery(): UseQueryResult<CommunityInfo, Error>;
} 