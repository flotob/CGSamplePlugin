'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Create a client
const queryClient = new QueryClient();

// Extracted component that uses useSearchParams
function ThemeAndCgLibLoader({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const cgThemeParam = searchParams.get('cg_theme');
  const forcedTheme = (cgThemeParam === 'light' || cgThemeParam === 'dark') ? cgThemeParam : undefined;

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