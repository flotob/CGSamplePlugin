'use client';

import React from 'react';
import { useCommunityBillingInfo } from '@/hooks/useCommunityBillingInfo';
import { useCreateCheckoutSession } from '@/hooks/useCreateCheckoutSession';
import { useCreatePortalSession } from '@/hooks/useCreatePortalSession';
// Removed useAuth import as communityId comes from props

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ExternalLink } from 'lucide-react';

interface BillingManagementSectionProps {
  communityId: string | undefined;
}

export const BillingManagementSection: React.FC<BillingManagementSectionProps> = ({ communityId }) => {

  // Fetch billing information using the provided communityId
  const { data: billingInfo, isLoading: isLoadingBillingInfo, error: billingInfoError } = useCommunityBillingInfo(communityId);

  // Get mutation functions and states
  const { mutate: createCheckoutSession, isPending: isCreatingCheckout } = useCreateCheckoutSession();
  const { mutate: createPortalSession, isPending: isCreatingPortal } = useCreatePortalSession();

  const renderContent = () => {
    if (!communityId) {
      // Handle case where communityId is not provided
      return (
        <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
                Community information not available.
            </AlertDescription>
        </Alert>
      );
    }
    
    if (isLoadingBillingInfo) {
      // Revert back to using Skeleton components
      return (
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-10 w-2/5" />
        </div>
      );
    }

    if (billingInfoError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load billing information: {billingInfoError.message}
          </AlertDescription>
        </Alert>
      );
    }

    if (!billingInfo?.currentPlan) {
        return (
            <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                    Could not determine current plan information.
                </AlertDescription>
            </Alert>
        );
    }

    const isProPlan = billingInfo.currentPlan.code === 'pro';

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
          <p className="text-lg font-semibold">{billingInfo.currentPlan.name}</p>
        </div>

        {isProPlan ? (
          billingInfo.stripeCustomerId ? (
            <Button 
              onClick={() => createPortalSession()}
              disabled={isCreatingPortal}
            >
              {isCreatingPortal ? (
                <>
                  {/* Revert back to using simple loading indicator */}                  
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></span>
                  Redirecting...
                </>
              ) : (
                <>
                  Manage Subscription <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                    You are on the Pro plan, but portal access is not yet available. Please contact support if needed.
                </AlertDescription>
            </Alert>
          )
        ) : (
          <Button 
            onClick={() => createCheckoutSession()}
            disabled={isCreatingCheckout}
          >
            {isCreatingCheckout ? (
               <>
                 {/* Revert back to using simple loading indicator */} 
                 <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></span>
                 Redirecting...
               </>
            ) : (
              'Upgrade to Pro'
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan & Billing</CardTitle>
        <CardDescription>
          Manage your subscription plan and billing details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}; 