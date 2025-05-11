import React from 'react';
import { EnhancedSidequestForm } from './EnhancedSidequestForm';
import type { Sidequest } from '@/types/sidequests';

interface SidequestFormWrapperProps {
  stepId: string;
  wizardId: string;
  existingSidequest?: Sidequest | null;
  onCloseForm: () => void;
  onSaveSuccess?: (savedSidequest: Sidequest) => void;
}

/**
 * A wrapper component for the sidequest form
 */
export const SidequestFormWrapper: React.FC<SidequestFormWrapperProps> = (props) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2 border-b">
        <h3 className="text-lg font-semibold">Sidequest Form</h3>
      </div>
      
      <EnhancedSidequestForm {...props} />
    </div>
  );
}; 