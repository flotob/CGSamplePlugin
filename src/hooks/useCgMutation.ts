'use client';

import { useMutation, useQueryClient, type QueryKey, type UseMutationResult } from '@tanstack/react-query';
import { useCgLib } from '../context/CgLibContext';
import { CgPluginLib } from '@common-ground-dao/cg-plugin-lib';

// Define a generic type for the async mutation function
// It receives the CgPluginLib instance and the mutation variables
type CgMutationFn<TData, TVariables> = (instance: CgPluginLib, variables: TVariables) => Promise<TData>;

interface UseCgMutationOptions {
  invalidateQueryKeys?: QueryKey[]; // Keys to invalidate on success
}

/**
 * A generic hook to perform actions (mutations) using the Common Ground plugin library.
 * Automatically handles CgPluginLib instance availability and query invalidation.
 *
 * @param mutationFn An async function that takes the CgPluginLib instance and variables, performs the action, and returns the result.
 * @param options Configuration options, like query keys to invalidate on success.
 * @returns React Query mutation result object.
 */
export function useCgMutation<TData = unknown, TError = Error, TVariables = void>(
  mutationFn: CgMutationFn<TData, TVariables>,
  options: UseCgMutationOptions = {}
): UseMutationResult<TData, TError, TVariables> {
  const { cgInstance } = useCgLib();
  const queryClient = useQueryClient();
  const { invalidateQueryKeys = [] } = options;

  const mutationResult = useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      if (!cgInstance) {
        throw new Error('CgPluginLib instance is not available for mutation.');
      }
      return mutationFn(cgInstance, variables);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate specified queries on success
      if (invalidateQueryKeys.length > 0) {
        console.log('Invalidating queries:', invalidateQueryKeys);
        queryClient.invalidateQueries({ queryKey: invalidateQueryKeys });
      }
      // Optionally, add more onSuccess logic here if needed
    },
    // Add onError, onSettled as needed
  });

  return {
    ...mutationResult,
    // Expose mutate and mutateAsync, ensuring they only run if instance is ready
    // Note: React Query's useMutation already handles the async logic, 
    // but we could add an extra check if paranoid, though likely unnecessary.
    // The primary guard is checking cgInstance within the mutationFn itself.
  };
} 