'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCommunityBillingInfo } from '@/hooks/useCommunityBillingInfo';
import { useStripeWaitContext } from '@/context/StripeWaitContext';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // DialogTrigger, // Not needed for controlled dialog
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';

interface StripeWaitingModalProps {
  communityId: string | undefined;
}

export const StripeWaitingModal: React.FC<StripeWaitingModalProps> = ({ communityId }) => {
  const { hideWaitingModal } = useStripeWaitContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Internal state to track if we are actively refreshing after "Done" was clicked
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // We need to monitor the billing query's fetching status
  // Note: This assumes useCommunityBillingInfo uses React Query internally
  // We only need `isFetching` here, not the data itself.
  const { isFetching: isBillingInfoFetching } = useCommunityBillingInfo(communityId);

  const handleDoneClick = () => {
    if (!communityId) {
      console.error('Cannot refresh billing: communityId is missing.');
      toast({ title: "Error", description: "Cannot refresh billing data.", variant: "destructive" });
      hideWaitingModal(); // Close modal on error
      return;
    }
    console.log('StripeWaitingModal: Done clicked, initiating refresh.');
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['communityBillingInfo', communityId] });
    toast({
        title: "Checking for billing updates...",
        duration: 3000,
    });
  };

  // Effect to close the modal once the refresh triggered by "Done" is complete
  useEffect(() => {
    // Check if we *were* refreshing and the query is *no longer* fetching
    if (isRefreshing && !isBillingInfoFetching) {
      console.log('StripeWaitingModal: Billing info refresh complete, closing modal.');
      toast({
          title: "Billing info updated!",
          duration: 2000,
      });
      setIsRefreshing(false); // Reset refreshing state
      hideWaitingModal(); // Close the modal via context
    }
    // Depend on isRefreshing flag and the fetching status
  }, [isRefreshing, isBillingInfoFetching, hideWaitingModal]);

  return (
    <Dialog open={true} modal={true}> 
      {/* `open={true}` because visibility is controlled by the context */}
      {/* `modal={true}` prevents closing by clicking outside */}
      <DialogContent 
         className="sm:max-w-[425px]" 
         onInteractOutside={(e) => e.preventDefault()} // Explicitly prevent closing on outside click
      >
        <DialogHeader>
          <DialogTitle>Waiting for Stripe</DialogTitle>
          <DialogDescription>
            Please complete your actions on the Stripe page/tab. Click "Done" when you have returned.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 flex flex-col items-center justify-center space-y-4">
          {!isRefreshing && (
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          )}
           <p className="text-sm text-muted-foreground">
             {isRefreshing ? "Refreshing billing status..." : "Waiting for you to return and click Done."}
           </p>
        </div>
        <div className="flex justify-center">
           <Button 
             onClick={handleDoneClick}
             disabled={isRefreshing} // Disable button while refreshing
           >
             {isRefreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
             {isRefreshing ? "Refreshing..." : "Done"}
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 