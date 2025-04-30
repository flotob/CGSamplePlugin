'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CgLibProvider } from '../context/CgLibContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { useSearchParams } from 'next/navigation';

// Create a client
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  // Read theme param here
  const searchParams = useSearchParams();
  const cgThemeParam = searchParams.get('cg_theme');

  // Determine the theme to force
  const forcedTheme = (cgThemeParam === 'light' || cgThemeParam === 'dark') ? cgThemeParam : undefined;
  // If param is invalid or missing, forcedTheme will be undefined, letting ThemeProvider fallback

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