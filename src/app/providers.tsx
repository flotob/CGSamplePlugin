'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CgLibProvider } from '../context/CgLibContext';

// Create a client
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CgLibProvider>
        {/* CgLibProvider will eventually wrap children here */}
        {children}
      </CgLibProvider>
    </QueryClientProvider>
  );
} 