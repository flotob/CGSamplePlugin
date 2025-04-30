'use client';

import React, { useState } from 'react';

interface AppLayoutProps {
  sidebar: React.ReactNode; // Slot for the sidebar component
  children: React.ReactNode; // Slot for the main content
}

export const AppLayout: React.FC<AppLayoutProps> = ({ sidebar, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-full min-h-screen w-full">
      {/* Sidebar Area - flush with the edge of the screen with inset shadow */}
      <div 
        className="fixed top-0 left-0 z-30 h-full w-60 border-r border-border bg-card shadow-sm hidden md:block"
        style={{ boxShadow: 'inset -2px 0 4px rgba(0, 0, 0, 0.1), 2px 0 5px -2px rgba(0, 0, 0, 0.05)' }}
      >
        {sidebar} 
      </div>
      
      {/* Mobile sidebar - shown only when menu is open */}
      <div 
        className={`fixed inset-0 z-40 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}
      >
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Sidebar - with inset shadow for mobile too */}
        <div 
          className={`absolute left-0 top-0 h-full w-64 bg-card border-r border-border transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out shadow-lg`}
          style={{ boxShadow: 'inset -2px 0 4px rgba(0, 0, 0, 0.1), 2px 0 5px -2px rgba(0, 0, 0, 0.05)' }}
        >
          {sidebar}
        </div>
      </div>
      
      {/* Main Content Area - with improved spacing and layout */}
      <main className="flex-grow p-4 pt-6 md:p-6 md:ml-60 transition-all duration-200">
        <div className="max-w-6xl mx-auto space-y-8">
          {children}
        </div>
      </main>
      
      {/* Mobile menu button - positioned in bottom right for mobile */}
      <div className="fixed bottom-4 right-4 md:hidden z-30">
        <button 
          className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
          aria-label="Toggle mobile menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}; 