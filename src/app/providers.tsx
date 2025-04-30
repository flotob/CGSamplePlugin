'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CgLibProvider } from '../context/CgLibContext';
import { ThemeProvider } from '../components/ThemeProvider';
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
      <QueryClientProvider client={queryClient}>
        <CgLibProvider>
          {/* CgLibProvider will eventually wrap children here */}
          {children}
        </CgLibProvider>
      </QueryClientProvider>
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