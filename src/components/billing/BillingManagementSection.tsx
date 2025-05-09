'use client';

import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCommunityBillingInfo } from '@/hooks/useCommunityBillingInfo';
import { useCreateCheckoutSession, type CreateCheckoutSessionVariables } from '@/hooks/useCreateCheckoutSession';
import { useCreatePortalSession } from '@/hooks/useCreatePortalSession';
import { useToast } from "@/hooks/use-toast";
// Removed useAuth import as communityId comes from props

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, ExternalLink, Loader2, CreditCard, CalendarClock, CheckCircle, RefreshCw, Zap, ShieldCheck, Star } from 'lucide-react';

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

// Define a structure for displaying plan features
interface PlanFeature {
  name: string;
  free: string;
  pro: string;
  premium: string;
}

const planFeatures: PlanFeature[] = [
  { name: 'Active Wizards', free: '3', pro: '10', premium: '25' },
  { name: 'Image Generations', free: '5 / 30 days', pro: '100 / 30 days', premium: '500 / 30 days' },
  { name: 'AI Chat Messages', free: '20 / day', pro: '200 / day', premium: '1000 / day' },
  // Add more features as needed
];

const planDetails = {
  free: { name: 'Free Tier', priceDisplay: '$0/month', code: 'free' },
  pro: { name: 'Pro Tier', priceDisplay: '$10/month', code: 'pro' }, // Assuming $10 for pro
  premium: { name: 'Premium Tier', priceDisplay: '$25/month', code: 'premium' },
};

export const BillingManagementSection: React.FC<BillingManagementSectionProps> = ({ communityId }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Remove unused refetch destructuring
  const { data: billingInfo, isLoading: isLoadingBillingInfo, error: billingInfoError } = useCommunityBillingInfo(communityId);

  // Get mutation functions and states
  const { mutate: createCheckoutSession, isPending: isCreatingCheckout } = useCreateCheckoutSession();
  const { mutate: createPortalSession, isPending: isCreatingPortal } = useCreatePortalSession();

  const handleRefresh = () => {
      if (!communityId) return;
      console.log('Manual refresh triggered for communityBillingInfo');
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['communityBillingInfo', communityId] });
      // Use the refetch function returned by useQuery for immediate action if preferred,
      // but invalidateQueries is often sufficient and simpler.
      // refetch(); 
      toast({
          title: "Refreshing billing info...",
          duration: 2000, // Show toast briefly
      });
  };

  const handleUpgradeClick = (planCode: 'pro' | 'premium') => {
    createCheckoutSession({ targetPlanCode: planCode });
  };

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
      // Show skeletons while loading
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
           <AlertTitle>Error Loading Billing Info</AlertTitle>
           <AlertDescription>
             {billingInfoError.message}
             <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-2 h-auto px-2 py-1">
                 <RefreshCw className="h-3 w-3 mr-1"/> Retry
             </Button>
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
                     <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-2 h-auto px-2 py-1">
                         <RefreshCw className="h-3 w-3 mr-1"/> Refresh
                     </Button>
                </AlertDescription>
            </Alert>
        );
    }

    const currentPlanCode = billingInfo.currentPlan.code as 'free' | 'pro' | 'premium';
    const showManageButton = (currentPlanCode === 'pro' || currentPlanCode === 'premium') && billingInfo.stripeCustomerId;

    // Helper to render detail rows
    const DetailRow: React.FC<{ icon: React.ElementType, label: string, value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium">{label}:</span>
        <span className="text-foreground truncate">{value}</span>
      </div>
    );

    return (
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-1">
             <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
             <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh Billing Info" className="h-7 w-7">
                <RefreshCw className="h-4 w-4" />
             </Button>
          </div>
          <p className="text-2xl font-semibold flex items-center">
            {billingInfo.currentPlan.name}
            {currentPlanCode === 'pro' && <Star className="ml-2 h-5 w-5 text-yellow-500" />}
            {currentPlanCode === 'premium' && <Zap className="ml-2 h-5 w-5 text-purple-500" />}
          </p>
        </div>

        {/* Plan Comparison & Upgrade Options Table */}
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>Choose the plan that best suits your community's needs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Feature</TableHead>
                  <TableHead className="text-center">{planDetails.free.name}</TableHead>
                  <TableHead className="text-center">{planDetails.pro.name}</TableHead>
                  <TableHead className="text-center">{planDetails.premium.name}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableHead className="font-medium">Price</TableHead>
                  <TableCell className="text-center">{planDetails.free.priceDisplay}</TableCell>
                  <TableCell className="text-center">{planDetails.pro.priceDisplay}</TableCell>
                  <TableCell className="text-center">{planDetails.premium.priceDisplay}</TableCell>
                </TableRow>
                {planFeatures.map((feature) => (
                  <TableRow key={feature.name}>
                    <TableCell className="font-medium">{feature.name}</TableCell>
                    <TableCell className="text-center">{feature.free}</TableCell>
                    <TableCell className="text-center">{feature.pro}</TableCell>
                    <TableCell className="text-center">{feature.premium}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableHead></TableHead>
                  <TableCell className="text-center">
                    {currentPlanCode === 'free' && <ShieldCheck className="h-5 w-5 mx-auto text-green-500" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {currentPlanCode === 'pro' ? (
                      <ShieldCheck className="h-5 w-5 mx-auto text-green-500" />
                    ) : currentPlanCode === 'free' ? (
                      <Button onClick={() => handleUpgradeClick('pro')} disabled={isCreatingCheckout} size="sm">
                        {isCreatingCheckout && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Upgrade to Pro
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center">
                    {currentPlanCode === 'premium' ? (
                      <ShieldCheck className="h-5 w-5 mx-auto text-green-500" />
                    ) : (currentPlanCode === 'free' || currentPlanCode === 'pro') ? (
                      <Button onClick={() => handleUpgradeClick('premium')} disabled={isCreatingCheckout} size="sm">
                        {isCreatingCheckout && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Upgrade to Premium
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Additional Pro Plan Details */} 
        {(currentPlanCode === 'pro' || currentPlanCode === 'premium') && (
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
        {(currentPlanCode === 'pro' || currentPlanCode === 'premium') && billingInfo.invoiceHistory && billingInfo.invoiceHistory.length > 0 && (
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
        {(currentPlanCode === 'pro' || currentPlanCode === 'premium') && (!billingInfo.invoiceHistory || billingInfo.invoiceHistory.length === 0) && !isLoadingBillingInfo && (
             <div className="border-t pt-4 mt-4 text-sm text-muted-foreground italic">
                 No payment history found.
            </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-6 border-t">
            {showManageButton && (
                <Button 
                    variant="outline"
                    onClick={() => createPortalSession()} 
                    disabled={isCreatingPortal || isCreatingCheckout}
                    className="w-full sm:w-auto"
                >
                    {isCreatingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                    Manage Billing & Subscription
                </Button>
            )}
        </div>
      </div>
    );
  };

  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle>Plan & Billing</CardTitle>
        <CardDescription>View your current plan and manage billing details.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}; 