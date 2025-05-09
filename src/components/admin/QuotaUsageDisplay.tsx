'use client';

import React from 'react';
import { useQuotaUsageQuery, type PlanQuotaInfo } from '@/hooks/useQuotaUsageQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table as ShadcnTable,
  TableBody as ShadcnTableBody,
  TableCell as ShadcnTableCell,
  TableHead as ShadcnTableHead,
  TableHeader as ShadcnTableHeader,
  TableRow as ShadcnTableRow,
} from "@/components/ui/table";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AlertCircle, CheckCircle, Loader2, ExternalLink, CreditCard, CalendarClock, RefreshCw, Zap, ShieldCheck, Star } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useCgLib } from '@/context/CgLibContext';
import { useCgQuery } from '@/hooks/useCgQuery';
import type { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from '@tanstack/react-query';
import { useCommunityBillingInfo } from '@/hooks/useCommunityBillingInfo';
import { useCreateCheckoutSession } from '@/hooks/useCreateCheckoutSession';
import { useCreatePortalSession } from '@/hooks/useCreatePortalSession';
import { useToast } from "@/hooks/use-toast";

// Define props for the component, including className
interface QuotaUsageDisplayProps {
  className?: string;
}

// Define a structure for displaying plan features for the new table
interface DetailedPlanFeature {
  name: string;
  free: string;
  pro: string;
  premium: string;
}

const detailedPlanFeatures: DetailedPlanFeature[] = [
  { name: 'Active Wizards', free: '3', pro: '10', premium: '25' },
  { name: 'Image Generations', free: '5 / 30 days', pro: '100 / 30 days', premium: '500 / 30 days' },
  { name: 'AI Chat Messages', free: '20 / day', pro: '200 / day', premium: '1000 / day' },
];

const staticPlanDetails = {
  free: { name: 'Free Tier', priceDisplay: '$0/month', code: 'free' as const },
  pro: { name: 'Pro Tier', priceDisplay: '$10/month', code: 'pro' as const },
  premium: { name: 'Premium Tier', priceDisplay: '$25/month', code: 'premium' as const },
};

// Helper function to format Unix timestamp to readable date
const formatDate = (timestamp: number | null | undefined): string => {
    if (!timestamp) return 'N/A';
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
        }).format(amount / 100);
    } catch (e) {
        console.error("Error formatting currency:", e);
        return `${(amount / 100).toFixed(2)} ${currency?.toUpperCase() || ''}`.trim();
    }
};

export const QuotaUsageDisplay: React.FC<QuotaUsageDisplayProps> = ({ className }) => {
  const { data: quotaUsageData, isLoading: isLoadingQuotaUsage, error: quotaUsageError, isError: isQuotaUsageError } = useQuotaUsageQuery();
  const { iframeUid } = useCgLib();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: communityInfo, isLoading: isLoadingCommunityInfo } = useCgQuery<CommunityInfoResponsePayload, Error>(
    ['communityInfo', iframeUid],
    async (instance) => (await instance.getCommunityInfo()).data,
    { enabled: !!iframeUid }
  );
  const communityId = communityInfo?.id;

  const { data: billingInfo, isLoading: isLoadingBillingInfo, error: billingInfoError } = useCommunityBillingInfo(communityId);

  const { mutate: createCheckoutSession, isPending: isCreatingCheckout } = useCreateCheckoutSession();
  const { mutate: createPortalSession, isPending: isCreatingPortal } = useCreatePortalSession();

  const handleRefreshBilling = () => {
      if (!communityId) return;
      queryClient.invalidateQueries({ queryKey: ['communityBillingInfo', communityId] });
      queryClient.invalidateQueries({ queryKey: ['quotaUsage', communityId] });
      toast({ title: "Refreshing billing & usage...", duration: 2000 });
  };

  const handleUpgradeClick = (planCode: 'pro' | 'premium') => {
    createCheckoutSession({ targetPlanCode: planCode });
  };

  const isLoading = isLoadingQuotaUsage || isLoadingCommunityInfo || (!!communityId && isLoadingBillingInfo);
  const combinedError = quotaUsageError || billingInfoError;

  const currentPlanDetailsFromBilling = billingInfo?.currentPlan;
  const currentPlanCode = currentPlanDetailsFromBilling?.code as 'free' | 'pro' | 'premium' | undefined;
  const currentPlanNameForHeader = currentPlanDetailsFromBilling?.name ?? (quotaUsageData?.currentPlanId ? `Plan ID ${quotaUsageData.currentPlanId}` : 'Free');
  const showManageButton = (currentPlanCode === 'pro' || currentPlanCode === 'premium') && billingInfo?.stripeCustomerId;

  const hasHeaderImage = communityInfo?.headerImageUrl && communityInfo.headerImageUrl.trim() !== '';

  const DetailRow: React.FC<{ icon: React.ElementType, label: string, value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">{label}:</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
  
  const renderPlanAndBillingContent = () => {
    if (!communityId && !isLoading) {
        return (
            <Alert variant="default" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>Community information not available for billing details.</AlertDescription>
            </Alert>
        );
    }
    if (isLoadingBillingInfo && !!communityId) {
        return (
            <div className="space-y-3 mt-4">
                <Skeleton className="h-8 w-3/5" />
                <Skeleton className="h-6 w-2/5" />
                <Separator className="my-4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }
    if (billingInfoError) {
       return (
         <Alert variant="destructive" className="mt-4">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Error Loading Billing Info</AlertTitle>
           <AlertDescription>
             {billingInfoError.message}
             <Button variant="ghost" size="sm" onClick={handleRefreshBilling} className="ml-2 h-auto px-2 py-1">
                 <RefreshCw className="h-3 w-3 mr-1"/> Retry
             </Button>
           </AlertDescription>
         </Alert>
       );
    }
    if (!billingInfo || !currentPlanDetailsFromBilling) {
        return (
            <Alert variant="default" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Billing Information</AlertTitle>
                <AlertDescription>
                    Could not determine current plan information or billing details are unavailable.
                     <Button variant="ghost" size="sm" onClick={handleRefreshBilling} className="ml-2 h-auto px-2 py-1">
                         <RefreshCw className="h-3 w-3 mr-1"/> Refresh
                     </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
    <>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>Choose the plan that best suits your community's needs.</CardDescription>
          </CardHeader>
          <CardContent>
            <ShadcnTable>
              <ShadcnTableHeader>
                <ShadcnTableRow>
                  <ShadcnTableHead className="w-[200px]">Feature</ShadcnTableHead>
                  <ShadcnTableHead className={cn("text-center px-2 py-3", currentPlanCode === staticPlanDetails.free.code && "font-bold text-primary bg-primary/10")}>{staticPlanDetails.free.name}</ShadcnTableHead>
                  <ShadcnTableHead className={cn("text-center px-2 py-3", currentPlanCode === staticPlanDetails.pro.code && "font-bold text-primary bg-primary/10")}>{staticPlanDetails.pro.name}</ShadcnTableHead>
                  <ShadcnTableHead className={cn("text-center px-2 py-3", currentPlanCode === staticPlanDetails.premium.code && "font-bold text-primary bg-primary/10")}>{staticPlanDetails.premium.name}</ShadcnTableHead>
                </ShadcnTableRow>
              </ShadcnTableHeader>
              <ShadcnTableBody>
                <ShadcnTableRow>
                  <ShadcnTableHead className="font-medium">Price</ShadcnTableHead>
                  <ShadcnTableCell className={cn("text-center", currentPlanCode === staticPlanDetails.free.code && "font-semibold bg-primary/10")}>{staticPlanDetails.free.priceDisplay}</ShadcnTableCell>
                  <ShadcnTableCell className={cn("text-center", currentPlanCode === staticPlanDetails.pro.code && "font-semibold bg-primary/10")}>{staticPlanDetails.pro.priceDisplay}</ShadcnTableCell>
                  <ShadcnTableCell className={cn("text-center", currentPlanCode === staticPlanDetails.premium.code && "font-semibold bg-primary/10")}>{staticPlanDetails.premium.priceDisplay}</ShadcnTableCell>
                </ShadcnTableRow>
                {detailedPlanFeatures.map((feature) => (
                  <ShadcnTableRow key={feature.name}>
                    <ShadcnTableCell className="font-medium">{feature.name}</ShadcnTableCell>
                    <ShadcnTableCell className={cn("text-center", currentPlanCode === staticPlanDetails.free.code && "font-semibold bg-primary/10")}>{feature.free}</ShadcnTableCell>
                    <ShadcnTableCell className={cn("text-center", currentPlanCode === staticPlanDetails.pro.code && "font-semibold bg-primary/10")}>{feature.pro}</ShadcnTableCell>
                    <ShadcnTableCell className={cn("text-center", currentPlanCode === staticPlanDetails.premium.code && "font-semibold bg-primary/10")}>{feature.premium}</ShadcnTableCell>
                  </ShadcnTableRow>
                ))}
                <ShadcnTableRow>
                  <ShadcnTableHead></ShadcnTableHead>
                  <ShadcnTableCell className={cn("text-center", currentPlanCode === staticPlanDetails.free.code && "bg-primary/10")}>
                    {currentPlanCode === 'free' && 
                      <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10 w-full cursor-default opacity-100" disabled>
                        Current Plan <ShieldCheck className="ml-2 h-4 w-4" />
                      </Button>
                    }
                  </ShadcnTableCell>
                  <ShadcnTableCell className={cn("text-center", currentPlanCode === staticPlanDetails.pro.code && "bg-primary/10")}>
                    {currentPlanCode === 'pro' ? (
                      <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10 w-full cursor-default opacity-100" disabled>
                        Current Plan <ShieldCheck className="ml-2 h-4 w-4" />
                      </Button>
                    ) : currentPlanCode === 'free' ? (
                      <Button onClick={() => handleUpgradeClick('pro')} disabled={isCreatingCheckout} size="sm" className="w-full">
                        {isCreatingCheckout && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Upgrade to Pro
                      </Button>
                    ) : null}
                  </ShadcnTableCell>
                  <ShadcnTableCell className={cn("text-center", currentPlanCode === staticPlanDetails.premium.code && "bg-primary/10")}>
                    {currentPlanCode === 'premium' ? (
                      <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10 w-full cursor-default opacity-100" disabled>
                        Current Plan <ShieldCheck className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (currentPlanCode === 'free' || currentPlanCode === 'pro') ? (
                      <Button onClick={() => handleUpgradeClick('premium')} disabled={isCreatingCheckout} size="sm" className="w-full">
                        {isCreatingCheckout && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Upgrade to Premium
                      </Button>
                    ) : null}
                  </ShadcnTableCell>
                </ShadcnTableRow>
              </ShadcnTableBody>
            </ShadcnTable>
          </CardContent>
        </Card>

        {(currentPlanCode === 'pro' || currentPlanCode === 'premium') && (
          <div className="space-y-3 border-t pt-6 mt-6">
            <h4 className="text-md font-semibold mb-2">Subscription Details</h4>
            {billingInfo.subscriptionStatus && (
                <DetailRow 
                    icon={CheckCircle} 
                    label="Status"
                    value={
                        <>
                          <span className="capitalize">{billingInfo.subscriptionStatus}</span>
                          {billingInfo.subscriptionStatus === 'trialing' && billingInfo.trialEndDate && (
                            <span className="text-xs ml-1">(Trial ends {formatDate(billingInfo.trialEndDate)})</span>
                          )}
                          {billingInfo.subscriptionStatus === 'active' && billingInfo.cancelAtPeriodEnd && billingInfo.periodEndDate && (
                             <span className="text-xs ml-1 text-orange-600">(Cancels on {formatDate(billingInfo.periodEndDate)})</span>
                          )}
                        </>
                    }
                />
            )}
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

        {(currentPlanCode === 'pro' || currentPlanCode === 'premium') && billingInfo.invoiceHistory && billingInfo.invoiceHistory.length > 0 && (
            <div className="space-y-3 border-t pt-6 mt-6">
                <h4 className="text-md font-semibold mb-2">Recent Billing History</h4>
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
             <div className="border-t pt-6 mt-6 text-sm text-muted-foreground italic">
                 No payment history found.
            </div>
        )}

        {showManageButton && (
             <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-6 border-t">
                <Button 
                    variant="outline"
                    onClick={() => createPortalSession()} 
                    disabled={isCreatingPortal || isCreatingCheckout}
                    className="w-full sm:w-auto"
                >
                    {isCreatingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                    Manage Billing & Subscription
                </Button>
            </div>
        )}
      </>
    );
  };

  const renderQuotaUsageContent = () => {
    if (isLoadingQuotaUsage && !quotaUsageData) {
        return (
             <div className="flex items-center justify-center text-muted-foreground py-4">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading usage data...</span>
            </div>
        );
    }
    if (isQuotaUsageError && !quotaUsageData) {
        return (
            <div className="text-destructive p-3 bg-destructive/10 rounded-md border border-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <div>
                    <p className="font-medium">Error loading usage data</p>
                    <p className="text-sm">{quotaUsageError?.message ?? 'An unknown error occurred.'}</p>
                </div>
            </div>
        );
    }
    if (!quotaUsageData) return null;

    const currentPlanFromQuota = quotaUsageData.plans.find(p => p.id === quotaUsageData.currentPlanId);
    const wizardLimit = currentPlanFromQuota?.wizardLimit ?? 0;
    const wizardUsage = quotaUsageData.currentWizardUsage ?? 0;
    const wizardProgress = wizardLimit > 0 ? Math.round((wizardUsage / wizardLimit) * 100) : 0;

    const imageGenLimit = currentPlanFromQuota?.imageGenerationLimit ?? 0;
    const imageGenUsage = quotaUsageData.currentImageGenerationUsage ?? 0;
    const imageGenProgress = imageGenLimit > 0 ? Math.round((imageGenUsage / imageGenLimit) * 100) : 0;

    const chatLimit = currentPlanFromQuota?.aiChatMessageLimit ?? 0;
    const chatUsage = quotaUsageData.currentAiChatMessageUsage ?? 0;
    const chatProgress = chatLimit > 0 ? Math.round((chatUsage / chatLimit) * 100) : 0;
    
    const getUsageTimeWindowText = (planFeature: PlanQuotaInfo | undefined, featureKey: 'wizardLimit' | 'imageGenerationLimit' | 'aiChatMessageLimit') => {
        if (!planFeature) return '';
        if (featureKey === 'wizardLimit') return '';
        const timeWindow = featureKey === 'imageGenerationLimit' ? planFeature.imageGenerationTimeWindow : planFeature.aiChatMessageTimeWindow;
        if (timeWindow && typeof timeWindow === 'string' && timeWindow !== '00:00:00') return `/ ${timeWindow.replace(/s$/, '')}`;
        return '';
    };

    const sectionHeaderImageUrl = communityInfo?.headerImageUrl;

    const sectionWrapperClasses = cn(
      "p-4 rounded-lg shadow-md border relative overflow-hidden mt-6", // Added mt-6 for consistent spacing with the plan card
      sectionHeaderImageUrl 
        ? "border-white/20 backdrop-blur-lg" // Stronger backdrop blur if image is present
        : "bg-slate-100/60 dark:bg-slate-900/40 backdrop-blur-sm border-white/10" // Fallback frosted glass
    );

    return (
        <div className={sectionWrapperClasses}>
            {sectionHeaderImageUrl && (
                <Image
                    src={sectionHeaderImageUrl}
                    alt="Usage Stats Background"
                    layout="fill"
                    objectFit="cover"
                    className="absolute inset-0 z-0 blur-xl opacity-30 dark:opacity-20 scale-110"
                />
            )}
            {/* Content wrapper to ensure it's above the background image */}
            <div className="relative z-10">
                <h4 className="text-lg font-semibold mb-3">Current Period Usage</h4>
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Active Wizards</span>
                    <span className="text-sm text-muted-foreground">
                        {wizardUsage} / {wizardLimit}
                    </span>
                    </div>
                    <Progress value={wizardProgress} aria-label={`${wizardUsage} out of ${wizardLimit} active wizards used`} className="mt-1" />
                </div>
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Image Generations Used</span>
                    <span className="text-sm text-muted-foreground">
                        {imageGenUsage} / {imageGenLimit} {getUsageTimeWindowText(currentPlanFromQuota, 'imageGenerationLimit')}
                    </span>
                    </div>
                    <Progress value={imageGenProgress} aria-label={`${imageGenUsage} out of ${imageGenLimit} image generations used`} className="mt-1" />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">AI Chat Messages Used</span>
                    <span className="text-sm text-muted-foreground">
                        {chatUsage} / {chatLimit} {getUsageTimeWindowText(currentPlanFromQuota, 'aiChatMessageLimit')}
                    </span>
                    </div>
                    <Progress value={chatProgress} aria-label={`${chatUsage} out of ${chatLimit} AI chat messages used`} className="mt-1" />
                </div>
            </div>
        </div>
    );
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {hasHeaderImage && (
        <div className="relative w-full h-48 overflow-hidden">
          <Image 
            src={communityInfo!.headerImageUrl!}
            alt={communityInfo?.title || 'Community header'}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex justify-between items-end">
            <div>
                <h3 className="text-2xl font-bold text-foreground drop-shadow-sm">Plan & Billing</h3>
                <p className="text-muted-foreground">
                Your current plan: <strong>{isLoading ? 'Loading...' : currentPlanNameForHeader}</strong>
                </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRefreshBilling} title="Refresh Billing & Usage Info" className="h-8 w-8 shrink-0">
                <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!hasHeaderImage && (
        <CardHeader className="flex flex-row justify-between items-start">
            <div>
                <CardTitle>Plan & Billing</CardTitle>
                <CardDescription>
                    Your current plan is <strong>{isLoading ? 'Loading...' : currentPlanNameForHeader}</strong>.
                </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRefreshBilling} title="Refresh Billing & Usage Info" className="h-8 w-8 shrink-0">
                <RefreshCw className="h-4 w-4" />
            </Button>
        </CardHeader>
      )}

      <CardContent className={cn("space-y-6", hasHeaderImage ? "pt-4" : "pt-2")}>
        {isLoading && (!quotaUsageData && !billingInfo) && (
          <div className="flex items-center justify-center text-muted-foreground py-8">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Loading plan & usage data...</span>
          </div>
        )}
        {combinedError && (!quotaUsageData && !billingInfo) && (
          <div className="text-destructive p-4 bg-destructive/10 rounded-md border border-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Error loading data</p>
              <p className="text-sm">{combinedError.message ?? 'An unknown error occurred.'}</p>
            </div>
          </div>
        )}

        {quotaUsageData && renderQuotaUsageContent()}
        
        {(!isLoadingCommunityInfo && communityId) && renderPlanAndBillingContent()} 

        {!isLoading && !combinedError && !quotaUsageData && !billingInfo && (
             <Alert variant="default" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Data</AlertTitle>
                <AlertDescription>Could not load plan or usage information. Please try refreshing.</AlertDescription>
            </Alert>
        )}

      </CardContent>
    </Card>
  );
}; 