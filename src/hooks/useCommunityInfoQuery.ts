'use client';

import { useQuery } from '@tanstack/react-query';
import { useCgLib } from '@/context/CgLibContext';

/**
 * Hook to fetch community information, including roles
 */
export function useCommunityInfoQuery() {
  const { cgInstance, iframeUid } = useCgLib();

  return useQuery({
    queryKey: ['communityInfo', iframeUid],
    queryFn: async () => {
      if (!cgInstance) {
        throw new Error('CG instance not available');
      }
      
      // Extract data directly from the response based on other usage patterns
      return (await cgInstance.getCommunityInfo()).data;
    },
    enabled: !!cgInstance && !!iframeUid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 