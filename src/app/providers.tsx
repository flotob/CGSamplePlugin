'use client';

import React from 'react';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { TransactionProvider } from 'ethereum-identity-kit';
import { config } from '../lib/wagmi';
import 'ethereum-identity-kit/css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { CgLibProvider } from '../context/CgLibContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { WizardSlideshowProvider } from '../context/WizardSlideshowContext';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { HttpError } from '@/lib/authFetch';
import { openUpgradeModalAtom } from '@/stores/upgradeModalStore';
import { useSetAtom } from 'jotai';

// Extracted component that uses useSearchParams
function ThemeAndCgLibLoader({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const cgThemeParam = searchParams.get('cg_theme');
  const forcedTheme = (cgThemeParam === 'light' || cgThemeParam === 'dark') ? cgThemeParam : undefined;

  const openUpgradeModal = useSetAtom(openUpgradeModalAtom);

  const [queryClient] = React.useState(() => new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (error instanceof HttpError && error.status === 402) {
          const errorBody = error.body as { error?: string; details?: unknown };
          if (errorBody?.error === 'QuotaExceeded') {
            console.log('Global onError: QuotaExceeded error detected, opening modal.', errorBody);
            if (mutation.options.onError) {
            }
            openUpgradeModal(errorBody);
            return;
          }
        }
        console.warn('Global onError: Unhandled or non-quota error', error);
      },
    })
  }));

  return (
    <ThemeProvider
      attribute="class"
      storageKey="plugin-theme"
      disableTransitionOnChange
      forcedTheme={forcedTheme}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <TransactionProvider>
              <CgLibProvider>
                <AuthProvider>
                  <WizardSlideshowProvider>
                    {/* CgLibProvider will eventually wrap children here */}
                    {children}
                  </WizardSlideshowProvider>
                </AuthProvider>
              </CgLibProvider>
            </TransactionProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThemeAndCgLibLoader>{children}</ThemeAndCgLibLoader>
    </Suspense>
  );
} 