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
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ExternalLink, Loader2, CreditCard, CalendarClock, CheckCircle, FileText } from 'lucide-react';

// Helper function to format Unix timestamp to readable date
const formatDate = (timestamp: number | null | undefined): string => {
    if (!timestamp) return 'N/A';
    // Multiply by 1000 because Date expects milliseconds
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
    });
};

// Helper function to format currency
const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined): string => {
    if (amount === null || amount === undefined || !currency) return 'N/A';
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100); // Divide by 100 as Stripe amounts are in cents
    } catch (e) {
        console.error("Error formatting currency:", e);
        // Fallback for invalid currency codes etc.
        return `${(amount / 100).toFixed(2)} ${currency?.toUpperCase() || ''}`.trim();
    }
};

interface BillingManagementSectionProps {
  communityId: string | undefined;
}

export const BillingManagementSection: React.FC<BillingManagementSectionProps> = ({ communityId }) => {

  // Fetch billing information using the provided communityId
  const { data: billingInfo, isLoading: isLoadingBillingInfo, error: billingInfoError, refetch } = useCommunityBillingInfo(communityId);

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
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Separator className="my-4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
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
    const showManageButton = isProPlan && billingInfo.stripeCustomerId;

    // Helper to render detail rows
    const DetailRow: React.FC<{ icon: React.ElementType, label: string, value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium">{label}:</span>
        <span className="text-foreground truncate">{value}</span>
      </div>
    );

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
          <p className="text-lg font-semibold">{billingInfo.currentPlan.name}</p>
        </div>

        {/* Additional Pro Plan Details */} 
        {isProPlan && (
          <div className="space-y-2 border-t pt-4 mt-4">
            {/* 
              KNOWN ISSUE / TODO:
              Currently, the UI does not always reflect when a subscription is set to 
              'cancel_at_period_end' in Stripe. Even though the Stripe Billing Portal 
              correctly shows the cancellation date, and the backend API 
              (/api/community/billing-info) is intended to fetch and return the 
              `cancelAtPeriodEnd: true` flag, this component sometimes fails to display 
              the "(Cancels on...)" message.
              
              Possible causes could be:
              - Caching issues with React Query (`useCommunityBillingInfo`).
              - Intermittent issues fetching/assigning the `cancelAtPeriodEnd` flag in the backend API.
              - Subtle type mismatches or runtime discrepancies with the Stripe SDK/API response.
              
              Since users can verify the correct cancellation status and date directly in the 
              Stripe Billing Portal via the "Manage Subscription" button, this is not currently
              blocking core functionality, but should be investigated further for a more 
              seamless UI experience.
            */}
            {billingInfo.subscriptionStatus && (
                <DetailRow 
                    icon={CheckCircle} 
                    label="Status"
                    value={
                        <>
                          <span className="capitalize">{billingInfo.subscriptionStatus}</span>
                          {/* Show trial end date if trialing */}                          
                          {billingInfo.subscriptionStatus === 'trialing' && billingInfo.trialEndDate && (
                            <span className="text-xs ml-1">(Trial ends {formatDate(billingInfo.trialEndDate)})</span>
                          )}
                          {/* Show cancellation date if active but set to cancel */}                          
                          {billingInfo.subscriptionStatus === 'active' && billingInfo.cancelAtPeriodEnd && billingInfo.periodEndDate && (
                             <span className="text-xs ml-1 text-orange-600">(Cancels on {formatDate(billingInfo.periodEndDate)})</span>
                          )}
                        </>
                    }
                />
            )}
            {/* Only show Renews on if NOT trialing AND NOT set to cancel */}            
            {billingInfo.periodEndDate && billingInfo.subscriptionStatus !== 'trialing' && !billingInfo.cancelAtPeriodEnd && (
                <DetailRow 
                    icon={CalendarClock} 
                    label="Renews on"
                    value={formatDate(billingInfo.periodEndDate)}
                />
            )}
            {billingInfo.cardBrand && billingInfo.cardLast4 && (
              <DetailRow 
                icon={CreditCard} 
                label="Payment Method"
                value={`${billingInfo.cardBrand} ending in ${billingInfo.cardLast4}`}
              />
            )}
          </div>
        )}

        {/* Billing History Section */}        
        {isProPlan && billingInfo.invoiceHistory && billingInfo.invoiceHistory.length > 0 && (
            <div className="space-y-3 border-t pt-4 mt-4">
                <h4 className="text-sm font-medium">Recent Billing History</h4>
                <ul className="space-y-2">
                    {billingInfo.invoiceHistory.map((invoice) => (
                        <li key={invoice.id} className="flex justify-between items-center text-sm">
                            <span>{formatDate(invoice.created)}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                    {formatCurrency(invoice.amountPaid, invoice.currency)}
                                </span>
                                {invoice.pdfUrl && (
                                    <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" title="View Invoice PDF">
                                        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                    </a>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {isProPlan && (!billingInfo.invoiceHistory || billingInfo.invoiceHistory.length === 0) && !isLoadingBillingInfo && (
             <div className="border-t pt-4 mt-4 text-sm text-muted-foreground italic">
                 No payment history found.
            </div>
        )}

        {/* Action Buttons */}
        {showManageButton ? (
          <Button 
            onClick={() => createPortalSession()}
            disabled={isCreatingPortal}
          >
            {isCreatingPortal ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                Manage Subscription <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : !isProPlan ? (
          <Button 
            onClick={() => createCheckoutSession()}
            disabled={isCreatingCheckout}
          >
            {isCreatingCheckout ? (
               <>
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 Redirecting...
               </>
            ) : (
              'Upgrade to Pro'
            )}
          </Button>
        ) : null /* Handle case where it's Pro but no customer ID (should be rare) */}
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