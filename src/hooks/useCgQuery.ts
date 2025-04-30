'use client';

import { useQuery, type QueryKey, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import { useCgLib } from '../context/CgLibContext';
import { CgPluginLib } from '@common-ground-dao/cg-plugin-lib';
import { useMemo } from 'react';

// Define a generic type for the async fetcher function
// It receives the CgPluginLib instance and should return the desired data
type CgQueryFn<TData> = (instance: CgPluginLib) => Promise<TData>;

/**
 * A generic hook to fetch data from the Common Ground plugin library using React Query.
 * Automatically handles CgPluginLib initialization state.
 *
 * @param queryKey React Query query key. Should typically include iframeUid if available.
 * @param queryFn An async function that takes the CgPluginLib instance and returns the data.
 * @param options Optional React Query options (including 'enabled').
 * @returns React Query result object.
 */
export function useCgQuery<TData, TError = Error>(
  queryKey: QueryKey,
  queryFn: CgQueryFn<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, TError> {
  const { cgInstance, isInitializing, iframeUid } = useCgLib();

  // Ensure the query key is unique per iframe instance if iframeUid is available
  const instanceQueryKey = useMemo(() => [...queryKey, iframeUid], [queryKey, iframeUid]);

  const result = useQuery<TData, TError, TData, QueryKey>({
    ...options,
    queryKey: instanceQueryKey,
    queryFn: async () => {
      if (!cgInstance) {
        // This should ideally not happen if 'enabled' is working correctly,
        // but provides an extra safeguard.
        throw new Error('CgPluginLib instance is not available for query.');
      }
      // The actual fetching logic is delegated to the provided queryFn
      return queryFn(cgInstance);
    },
    // Default 'enabled' based on instance, but allow override via options
    enabled: options?.enabled !== undefined ? options.enabled : (!!cgInstance && !isInitializing),
  });

  return result;
} 