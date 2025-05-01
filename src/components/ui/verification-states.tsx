'use client';

import React from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface VerificationStateProps {
  message: string;
  details?: string;
}

/**
 * Loading state for credential verification.
 */
export const LoadingState: React.FC<VerificationStateProps> = ({ 
  message, 
  details 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-50/20 blur-2xl rounded-full w-24 h-24 -z-10" />
        <Loader2 className="h-14 w-14 text-primary/70 animate-spin" />
      </div>
      <h2 className="text-xl font-medium mt-8 tracking-tight">{message}</h2>
      {details && <p className="text-muted-foreground/80 text-sm mt-2">{details}</p>}
    </div>
  );
};

/**
 * Success state for credential verification.
 */
export const SuccessState: React.FC<VerificationStateProps & { credential?: string }> = ({ 
  message, 
  details,
  credential 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm">
      <div className="relative">
        <div className="absolute inset-0 bg-green-100/30 blur-2xl rounded-full w-28 h-28 -z-10" />
        <CheckCircle className="h-16 w-16 text-green-500/90" />
      </div>
      <h2 className="text-2xl font-medium mt-8 tracking-tight">{message}</h2>
      {details && <p className="text-muted-foreground/80 text-sm mt-2">{details}</p>}
      
      {credential && (
        <div className="mt-6 bg-white/40 backdrop-blur-sm border border-green-100/80 px-8 py-3 rounded-full shadow-sm">
          <span className="text-lg font-medium text-green-800">{credential}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Error state for credential verification.
 */
export const ErrorState: React.FC<VerificationStateProps> = ({ 
  message, 
  details 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-red-100/20 blur-2xl rounded-full w-24 h-24 -z-10" />
        <AlertCircle className="h-14 w-14 text-red-500/90" />
      </div>
      <h2 className="text-xl font-medium tracking-tight">{message}</h2>
      {details && <p className="text-muted-foreground/80 text-sm mt-3 max-w-md">{details}</p>}
    </div>
  );
};

/**
 * Warning/Action Required state for credential verification.
 */
export const WarningState: React.FC<VerificationStateProps & { 
  action?: React.ReactNode 
}> = ({ 
  message, 
  details,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative mb-6 inline-block">
        <div className="absolute inset-0 bg-amber-100/20 blur-2xl rounded-full w-24 h-24 -z-10" />
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber-500/80">
          <path d="M12 16H12.01M12 8V12M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 className="text-2xl font-medium tracking-tight">{message}</h2>
      {details && <p className="text-muted-foreground/80 text-sm mt-3 mb-6 max-w-sm mx-auto">{details}</p>}
      
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}; 