'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";

// Define expected link structure
interface SidebarLink {
  id: string;
  label: string;
  icon?: React.ElementType; // Optional icon component
}

// Define props for the Sidebar component
interface SidebarProps {
  links: SidebarLink[];
  activeSection: string;
  setActiveSection: (sectionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  links,
  activeSection,
  setActiveSection
}) => {

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          {/* Optional: Add logo/icon here later */}
          <span>Onboarding Wiz</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2"> {/* Add scroll for many links */}
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {links.map((link) => (
            <Button
              key={link.id}
              variant={activeSection === link.id ? "secondary" : "ghost"} // Highlight active link
              className="justify-start w-full my-1" // Justify text left
              onClick={() => setActiveSection(link.id)}
            >
              {/* Optional: Render icon if provided */}
              {link.icon && <link.icon className="h-4 w-4 mr-2" />}
              {link.label}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
}; 