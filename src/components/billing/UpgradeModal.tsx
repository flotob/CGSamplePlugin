'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateCheckoutSession } from '@/hooks/useCreateCheckoutSession';
import { useCreatePortalSession } from '@/hooks/useCreatePortalSession';
import { useCommunityBillingInfo } from '@/hooks/useCommunityBillingInfo';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAtom } from 'jotai';
import {
  isUpgradeModalOpenAtom,
  upgradeModalErrorBodyAtom,
  closeUpgradeModalAtom,
} from '@/stores/upgradeModalStore';

// Data structures (can be refined or moved, similar to QuotaUsageDisplay)
const staticPlanDetails = {
  free: { name: 'Free Tier', priceDisplay: '$0/month', code: 'free' as const },
  pro: { name: 'Pro Tier', priceDisplay: '$10/month', code: 'pro' as const },
  premium: { name: 'Premium Tier', priceDisplay: '$25/month', code: 'premium' as const },
};

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
  // Add other features relevant for upgrades
];

export const UpgradeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isUpgradeModalOpenAtom);
  const [errorBody] = useAtom(upgradeModalErrorBodyAtom);
  const [, closeModal] = useAtom(closeUpgradeModalAtom);

  const { decodedPayload } = useAuth();
  const communityId = decodedPayload?.cid;

  const {
    data: billingInfo,
    isLoading: isLoadingBillingInfo,
    refetch: refetchBillingInfo
  } = useCommunityBillingInfo(communityId);
  
  const { mutate: createCheckoutSession, isPending: isCreatingCheckout } = useCreateCheckoutSession();
  const { mutate: createPortalSession, isPending: isCreatingPortal } = useCreatePortalSession();

  useEffect(() => {
    if (isOpen && communityId) {
      refetchBillingInfo();
    }
  }, [isOpen, communityId, refetchBillingInfo]);

  const currentPlanCode = billingInfo?.currentPlan?.code as 'free' | 'pro' | 'premium' | undefined;

  const handleUpgradeClick = (planCode: 'pro' | 'premium') => {
    if (!communityId) {
      console.error("UpgradeModal: Community ID is missing for checkout session.");
      return;
    }
    createCheckoutSession({ targetPlanCode: planCode });
  };

  const handleManageBillingClick = () => {
    if (!communityId) {
      console.error("UpgradeModal: Community ID is missing for portal session.");
      return;
    }
    createPortalSession();
  };

  const getFeatureDisplayName = (featureCode?: string): string => {
    if (!featureCode) return 'a feature';
    const details = errorBody as { details?: { feature?: string } };
    const actualFeatureCode = featureCode || details?.details?.feature;
    if (!actualFeatureCode) return 'a feature';

    switch (actualFeatureCode) {
      case 'active_wizard': return 'Active Wizards';
      case 'image_generation': return 'Image Generations';
      case 'ai_chat_message': return 'AI Chat Messages';
      default: return actualFeatureCode.replace(/_/g, ' ');
    }
  };
  
  const errorDetailsTyped = errorBody as { 
    message?: string; 
    details?: { 
      feature?: string; 
      limit?: number; 
      currentCount?: number | string | bigint;
      window?: string;
    }
  }; 

  const featureName = getFeatureDisplayName(errorDetailsTyped?.details?.feature);
  let message = "You've reached the usage limit for your current plan.";

  if (errorDetailsTyped?.details?.feature) {
    message = `You've reached the usage limit for ${featureName}.`;
  }
  if (errorDetailsTyped?.details?.limit !== undefined && errorDetailsTyped?.details?.currentCount !== undefined) {
     message += ` (Limit: ${errorDetailsTyped.details.limit}, Used: ${String(errorDetailsTyped.details.currentCount)})`;
  }
  if (errorDetailsTyped?.message && typeof errorDetailsTyped.message === 'string' && errorDetailsTyped.message.length > 0) {
    message = errorDetailsTyped.message;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            {message} To continue using features and unlock more, please upgrade your plan.
          </DialogDescription>
        </DialogHeader>

        {(isLoadingBillingInfo || !communityId) && (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading plan information...</p>
            {!communityId && <p className="ml-2 text-destructive-foreground">Waiting for community info...</p>}
          </div>
        )}

        {!isLoadingBillingInfo && communityId && (
          <div className="py-4 space-y-6">
            <div>
              <h4 className="text-lg font-semibold mb-3">Available Plans</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 w-[200px]">Feature</th>
                    <th className={cn("text-center py-2 px-2", currentPlanCode === staticPlanDetails.free.code && "font-bold text-primary")}>{staticPlanDetails.free.name}</th>
                    <th className={cn("text-center py-2 px-2", currentPlanCode === staticPlanDetails.pro.code && "font-bold text-primary")}>{staticPlanDetails.pro.name}</th>
                    <th className={cn("text-center py-2 px-2", currentPlanCode === staticPlanDetails.premium.code && "font-bold text-primary")}>{staticPlanDetails.premium.name}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="font-medium py-2 px-2">Price</td>
                    <td className={cn("text-center py-2 px-2", currentPlanCode === staticPlanDetails.free.code && "font-semibold")}>{staticPlanDetails.free.priceDisplay}</td>
                    <td className={cn("text-center py-2 px-2", currentPlanCode === staticPlanDetails.pro.code && "font-semibold")}>{staticPlanDetails.pro.priceDisplay}</td>
                    <td className={cn("text-center py-2 px-2", currentPlanCode === staticPlanDetails.premium.code && "font-semibold")}>{staticPlanDetails.premium.priceDisplay}</td>
                  </tr>
                  {detailedPlanFeatures.map((feature) => (
                    <tr key={feature.name} className="border-b">
                      <td className="font-medium py-2 px-2">{feature.name}</td>
                      <td className={cn("text-center py-2 px-2", currentPlanCode === staticPlanDetails.free.code && "font-semibold")}>{feature.free}</td>
                      <td className={cn("text-center py-2 px-2", currentPlanCode === staticPlanDetails.pro.code && "font-semibold")}>{feature.pro}</td>
                      <td className={cn("text-center py-2 px-2", currentPlanCode === staticPlanDetails.premium.code && "font-semibold")}>{feature.premium}</td>
                    </tr>
                  ))}
                  <tr className="border-b">
                    <td className="py-3 px-2"></td>
                    <td className="text-center py-3 px-2">
                      {currentPlanCode === 'free' && (
                        <Button variant="outline" size="sm" className="w-full" disabled>Current Plan</Button>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {currentPlanCode === 'pro' ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>Current Plan</Button>
                      ) : currentPlanCode === 'free' ? (
                        <Button onClick={() => handleUpgradeClick('pro')} disabled={isCreatingCheckout || !communityId} size="sm" className="w-full">
                          {(isCreatingCheckout || !communityId) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Upgrade to Pro
                        </Button>
                      ) : null}
                    </td>
                    <td className="text-center py-3 px-2">
                      {currentPlanCode === 'premium' ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>Current Plan</Button>
                      ) : (currentPlanCode === 'free' || currentPlanCode === 'pro') ? (
                        <Button onClick={() => handleUpgradeClick('premium')} disabled={isCreatingCheckout || !communityId} size="sm" className="w-full">
                          {(isCreatingCheckout || !communityId) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Upgrade to Premium
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {billingInfo?.stripeCustomerId && communityId && (currentPlanCode === 'pro' || currentPlanCode === 'premium') && (
              <div className="pt-4 border-t">
                <Button 
                    variant="outline" 
                    onClick={handleManageBillingClick} 
                    disabled={isCreatingPortal || isCreatingCheckout || !communityId}
                    className="w-full sm:w-auto"
                >
                  {(isCreatingPortal || !communityId) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                  Manage Billing & Subscription
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
            <div className="text-xs text-muted-foreground">
                Need help? <a href="/docs/contact" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Contact Support</a>
            </div>
            <Button type="button" variant="outline" onClick={() => closeModal()}>
                Maybe Later
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 