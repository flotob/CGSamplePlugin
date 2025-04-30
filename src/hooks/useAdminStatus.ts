'use client';

import { useMemo } from 'react';
import { useCgQuery } from './useCgQuery';
import { useCgLib } from '../context/CgLibContext';
import type { UserInfoResponsePayload, CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

const DEFAULT_ADMIN_ROLE_TITLE = 'admin'; // Case-insensitive check

/**
 * Determines if the current user has admin privileges within the plugin.
 * Admin privileges are granted if the user has any role whose title matches
 * (case-insensitive) any title listed in the NEXT_PUBLIC_ADMIN_ROLE_IDS
 * environment variable (comma-separated), or, if the variable is not set,
 * if the user has the default 'Admin' role title.
 *
 * @returns An object containing `isAdmin` boolean, `isLoading`, and `error`.
 */
export function useAdminStatus(): {
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const { iframeUid } = useCgLib();

  // Fetch user and community info simultaneously
  const { data: userInfo, isLoading: isLoadingUser, error: userError } = useCgQuery<
    UserInfoResponsePayload,
    Error
  >(
    ['userInfo', iframeUid],
    async (instance) => (await instance.getUserInfo()).data,
    { enabled: !!iframeUid }
  );

  const { data: communityInfo, isLoading: isLoadingCommunity, error: communityError } = useCgQuery<
    CommunityInfoResponsePayload,
    Error
  >(
    ['communityInfo', iframeUid],
    async (instance) => (await instance.getCommunityInfo()).data,
    { enabled: !!iframeUid }
  );

  // Determine the list of required admin role TITLES (lowercase)
  const requiredAdminTitlesLower = useMemo(() => {
    const envVar = process.env.NEXT_PUBLIC_ADMIN_ROLE_IDS; // Still using the same env var name for now
    if (envVar) {
      // Parse titles from env var
      return envVar.split(',')
        .map(title => title.trim().toLowerCase())
        .filter(title => !!title);
    }
    // Fallback to default admin title
    return [DEFAULT_ADMIN_ROLE_TITLE];
  }, []); // Only depends on env var, which doesn't change client-side

  // Determine if the user IS an admin
  const isAdmin = useMemo(() => {
    // Need both user info (with their role IDs) and community info (to map IDs to titles)
    if (!userInfo?.roles || !communityInfo?.roles || requiredAdminTitlesLower.length === 0) {
      return false;
    }

    // Create a map of role ID -> role title (lowercase) for efficient lookup
    const roleIdToTitleLowerMap = new Map<string, string>();
    communityInfo.roles.forEach(role => {
      roleIdToTitleLowerMap.set(role.id, role.title.toLowerCase());
    });

    // Check if any of the user's assigned roles have a title matching the required admin titles
    return userInfo.roles.some(userRoleId => {
      const userRoleTitleLower = roleIdToTitleLowerMap.get(userRoleId);
      return userRoleTitleLower ? requiredAdminTitlesLower.includes(userRoleTitleLower) : false;
    });

  }, [userInfo, communityInfo, requiredAdminTitlesLower]);

  const isLoading = isLoadingUser || isLoadingCommunity;
  const error = userError || communityError;

  return { isAdmin, isLoading, error };
} 