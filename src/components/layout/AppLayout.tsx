'use client';

import React from 'react';

interface AppLayoutProps {
  sidebar: React.ReactNode; // Slot for the sidebar component
  children: React.ReactNode; // Slot for the main content
}

export const AppLayout: React.FC<AppLayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="flex h-full min-h-screen w-full">
      {/* Sidebar Area */}
      {/* Fixed width, background, border, hidden on small screens */}
      <div className="fixed top-0 left-0 h-full w-60 border-r bg-muted/40 hidden md:block">
        {sidebar} 
      </div>
      {/* Main Content Area */}
      {/* Needs left margin on medium+ screens to offset fixed sidebar */}
      <main className="flex-grow p-4 md:ml-60">
        {children}
      </main>
      {/* TODO: Add mobile navigation solution later */}
    </div>
  );
}; 