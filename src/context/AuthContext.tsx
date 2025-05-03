'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { useCgLib } from './CgLibContext';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { useCgQuery } from '../hooks/useCgQuery';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

interface AuthContextType {
    jwt: string | null;
    isAuthenticating: boolean;
    authError: Error | null;
    login: () => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [jwt, setJwt] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
    const [authError, setAuthError] = useState<Error | null>(null);

    const { iframeUid } = useCgLib();
    const { isAdmin } = useAdminStatus(); // We need isAdmin status for the token payload

    // Fetch user and community info needed for the JWT claims
    const { data: userInfo } = useCgQuery<UserInfoResponsePayload, Error>(
        ['userInfo', iframeUid], // Use existing query key
        async (instance) => (await instance.getUserInfo()).data,
        { enabled: !!iframeUid }
    );
    const { data: communityInfo } = useCgQuery<CommunityInfoResponsePayload, Error>(
        ['communityInfo', iframeUid], // Use existing query key
        async (instance) => (await instance.getCommunityInfo()).data,
        { enabled: !!iframeUid }
    );

    const login = useCallback(async () => {
        // Prevent login if already authenticated or missing necessary info
        if (jwt || isAuthenticating || !iframeUid || !userInfo || !communityInfo) {
            // console.log('Skipping login:', { jwt: !!jwt, isAuthenticating, iframeUid: !!iframeUid, userInfo: !!userInfo, communityInfo: !!communityInfo });
            if (!iframeUid || !userInfo || !communityInfo) {
                setAuthError(new Error('Cannot log in: Missing user, community, or iframe info.'));
            }
            return;
        }

        setIsAuthenticating(true);
        setAuthError(null);

        try {
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    iframeUid,
                    userId: userInfo.id,
                    communityId: communityInfo.id,
                    isAdmin,
                    username: userInfo.name ?? null,
                    pictureUrl: userInfo.imageUrl ?? null,
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
            setJwt(null); // Ensure token is cleared on error
        } finally {
            setIsAuthenticating(false);
        }
    }, [jwt, isAuthenticating, iframeUid, userInfo, communityInfo, isAdmin]);

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