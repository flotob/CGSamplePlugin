'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { useCgLib } from './CgLibContext';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { useCgQuery } from '../hooks/useCgQuery';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

// Removing local PluginContextData interface to avoid type conflicts
// We will access properties directly after runtime checks.

interface AuthContextType {
    jwt: string | null;
    isAuthenticating: boolean;
    authError: Error | null;
    login: () => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local type definition based on CG dev team feedback
interface PluginContextDataStaging {
    id: string;    // This is the plugin's definition ID
    // userId: string; // User's ID - This property is private and not exposed
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [jwt, setJwt] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
    const [authError, setAuthError] = useState<Error | null>(null);

    const { cgInstance, iframeUid } = useCgLib();
    const { isAdmin } = useAdminStatus();

    const { data: userInfo } = useCgQuery<UserInfoResponsePayload, Error>(
        ['userInfo', iframeUid],
        async (instance) => (await instance.getUserInfo()).data,
        { enabled: !!iframeUid }
    );
    const { data: communityInfo } = useCgQuery<CommunityInfoResponsePayload, Error>(
        ['communityInfo', iframeUid],
        async (instance) => (await instance.getCommunityInfo()).data,
        { enabled: !!iframeUid }
    );

    // Get the raw context data and memoize it.
    // We will perform runtime checks on its properties before use.
    const rawPluginContext: any = useMemo(() => {
        if (cgInstance) {
            return cgInstance.getContextData(); 
        }
        return null;
    }, [cgInstance]);

    const login = useCallback(async () => {
        // Check for all necessary data, including rawPluginContext
        if (jwt || isAuthenticating || !iframeUid || !userInfo || !communityInfo || !rawPluginContext) {
            if (!iframeUid || !userInfo || !communityInfo || !rawPluginContext) {
                setAuthError(new Error('Cannot log in: Missing user, community, plugin context, or iframe info.'));
            }
            return;
        }

        setIsAuthenticating(true);
        setAuthError(null);

        try {
            // Runtime checks for required properties before sending
            if (!communityInfo.url || typeof communityInfo.url !== 'string') {
                console.error('Login aborted: Community URL (communityShortId) is missing or invalid from communityInfo.', communityInfo);
                throw new Error('Community URL (shortId) is missing or invalid.');
            }
            // Check the structure of rawPluginContext before accessing .pluginId
            // As per dev feedback, it should have a 'pluginId' (string)
            if (
                !rawPluginContext || 
                typeof rawPluginContext !== 'object' || 
                typeof rawPluginContext.pluginId !== 'string'
            ) {
                console.error('Login aborted: Plugin context data is missing, not an object, or missing pluginId property.', rawPluginContext);
                throw new Error('Plugin context data is invalid or missing pluginId property.');
            }
            const pluginDefId = rawPluginContext.pluginId;

            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    iframeUid,
                    userId: userInfo.id,
                    communityId: communityInfo.id,         // Long Community ID
                    isAdmin,
                    username: userInfo.name ?? null,
                    pictureUrl: userInfo.imageUrl ?? null,
                    roles: userInfo.roles ?? [],
                    communityShortId: communityInfo.url,   // Value from communityInfo.url
                    pluginId: pluginDefId,                 // Value from rawPluginContext.pluginId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.token) {
                setJwt(data.token);
                console.log('JWT session established.');
            } else {
                throw new Error('No token received from server');
            }
        } catch (error) {
            console.error('Failed to establish JWT session:', error);
            setAuthError(error instanceof Error ? error : new Error('Unknown authentication error'));
            setJwt(null);
        } finally {
            setIsAuthenticating(false);
        }
    }, [jwt, isAuthenticating, iframeUid, userInfo, communityInfo, rawPluginContext, isAdmin, cgInstance]); // Added rawPluginContext and cgInstance

    const logout = useCallback(() => {
        setJwt(null);
        setAuthError(null);
        setIsAuthenticating(false);
        console.log('JWT session cleared.');
    }, []);

    const value = useMemo(() => ({
        jwt,
        isAuthenticating,
        authError,
        login,
        logout,
    }), [jwt, isAuthenticating, authError, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
} 