'use client';

import React from 'react';
import { useQuotaUsageQuery } from '@/hooks/useQuotaUsageQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useCgLib } from '@/context/CgLibContext';
import { useCgQuery } from '@/hooks/useCgQuery';
import type { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import Image from 'next/image';

// Define props for the component, including className
interface QuotaUsageDisplayProps {
  className?: string;
}

// Define PgInterval type used in the formatter
type PgInterval = {
  days?: number;
  months?: number;
  hours?: number;
};

// Helper function to format the time window string for display
const formatTimeWindow = (timeWindow: string | PgInterval | null | undefined): string => {
  if (timeWindow === null || timeWindow === undefined) { // Handles null, undefined
    return ''; 
  }

  if (typeof timeWindow === 'string') {
    if (timeWindow === '00:00:00') { // This is how '0 seconds' interval is often stored/returned
      return ''; // Static limit, no window text needed
    }
    // Directly use the string from the DB, assuming it's like '1 day', '30 days'
    // This will output "/ 1 day", "/ 30 days", etc.
    return `/ ${timeWindow}`; 
  }

  // If it's an object (e.g., from pg interval type if not stringified)
  if (typeof timeWindow === 'object' && timeWindow !== null) {
    if (timeWindow.days && timeWindow.days === 1) return '/ day';
    if (timeWindow.days) return `/ ${timeWindow.days} days`;
    if (timeWindow.months && timeWindow.months === 1) return '/ month';
    if (timeWindow.months) return `/ ${timeWindow.months} months`;
    // Add other relevant parts if necessary (hours, etc.)
    console.warn('formatTimeWindow received unhandled interval object:', timeWindow);
    return '/ custom period'; // Fallback for object
  }

  // Fallback for any other unexpected type
  console.warn('formatTimeWindow received unexpected timeWindow type:', typeof timeWindow, timeWindow);
  return '/ unknown period';
};

/**
 * A component to display community plan comparison and current usage.
 */
export const QuotaUsageDisplay: React.FC<QuotaUsageDisplayProps> = ({ className }) => {
  const { data, isLoading, error, isError } = useQuotaUsageQuery();
  const { iframeUid } = useCgLib();

  // Fetch community info to get the header image
  const { data: communityInfo } = useCgQuery<CommunityInfoResponsePayload, Error>(
    ['communityInfo', iframeUid],
    async (instance) => (await instance.getCommunityInfo()).data,
    { enabled: !!iframeUid }
  );

  // Determine the current plan details for progress bar and description
  const currentPlan = data?.plans.find(p => p.id === data.currentPlanId);
  const currentPlanName = currentPlan?.name ?? (data?.currentPlanId ? `Plan ID ${data.currentPlanId}` : 'Free');

  // Wizard Usage
  const wizardLimit = currentPlan?.wizardLimit ?? 0;
  const wizardUsage = data?.currentWizardUsage ?? 0;
  const wizardProgress = wizardLimit > 0 ? Math.round((wizardUsage / wizardLimit) * 100) : 0;

  // Image Generation Usage
  const imageGenLimit = currentPlan?.imageGenerationLimit ?? 0;
  const imageGenTimeWindowDisplay = formatTimeWindow(currentPlan?.imageGenerationTimeWindow);
  const imageGenUsage = data?.currentImageGenerationUsage ?? 0;
  const imageGenProgress = imageGenLimit > 0 ? Math.round((imageGenUsage / imageGenLimit) * 100) : 0;

  // AI Chat Message Usage
  const chatLimit = currentPlan?.aiChatMessageLimit ?? 0;
  const chatTimeWindowDisplay = formatTimeWindow(currentPlan?.aiChatMessageTimeWindow);
  const chatUsage = data?.currentAiChatMessageUsage ?? 0;
  const chatProgress = chatLimit > 0 ? Math.round((chatUsage / chatLimit) * 100) : 0;

  // Check if we have a header image
  const hasHeaderImage = communityInfo?.headerImageUrl && communityInfo.headerImageUrl.trim() !== '';

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Hero Image with Gradient Overlay */}
      {hasHeaderImage && (
        <div className="relative w-full h-48 overflow-hidden">
          {/* Header Image */}
          <Image 
            src={communityInfo!.headerImageUrl!}
            alt={communityInfo?.title || 'Community header'}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
            priority
          />
          
          {/* Gradient Overlay - fades from transparent to card background color */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background"></div>
          
          {/* Plan Info Overlay - positioned at the bottom of the image */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <h3 className="text-2xl font-bold text-foreground drop-shadow-sm">Plan & Usage</h3>
            <p className="text-muted-foreground">
              Your current plan is <strong>{isLoading ? 'Loading...' : currentPlanName}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Regular Card Header (shown when no header image) */}
      {!hasHeaderImage && (
        <CardHeader>
          <CardTitle>Plan & Usage</CardTitle>
          <CardDescription>
            Your current plan is <strong>{isLoading ? 'Loading...' : currentPlanName}</strong>.
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className={cn("space-y-6", hasHeaderImage ? "pt-0" : "")}>
        {isLoading && (
          <div className="flex items-center justify-center text-muted-foreground py-4">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Loading usage data...</span>
          </div>
        )}
        
        {isError && (
          <div className="text-destructive p-3 bg-destructive/10 rounded-md border border-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Error loading usage data</p>
              <p className="text-sm">{error?.message ?? 'An unknown error occurred.'}</p>
            </div>
          </div>
        )}

        {data && !isLoading && !isError && (
          <>
            {/* Plan Comparison Table Section */}
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Active Wizards</TableHead>
                    <TableHead className="text-right">Image Generations</TableHead>
                    <TableHead className="text-right">AI Chat Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.plans.map((plan) => (
                    <TableRow key={plan.id} className={cn(plan.id === data.currentPlanId ? "bg-muted/60" : "")}>
                      <TableCell className="font-medium">
                        {plan.id === data.currentPlanId && (
                          <CheckCircle className="h-5 w-5 text-primary" aria-label="Current plan"/>
                        )}
                      </TableCell>
                      <TableCell>{plan.name}</TableCell>
                      <TableCell className="text-right">{`${plan.wizardLimit}${formatTimeWindow(plan.wizardLimit === 0 && !plan.name.toLowerCase().includes('free') ? null : '00:00:00')}`}</TableCell>
                      <TableCell className="text-right">{`${plan.imageGenerationLimit}${formatTimeWindow(plan.imageGenerationTimeWindow)}`}</TableCell>
                      <TableCell className="text-right">{`${plan.aiChatMessageLimit}${formatTimeWindow(plan.aiChatMessageTimeWindow)}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Current Usage Progress Bar Section */}
            <div>
              <h4 className="text-lg font-semibold mb-3 pt-4">Current Period Usage</h4>
              {/* Active Wizards */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Active Wizards</span>
                  <span className="text-sm text-muted-foreground">
                    {wizardUsage} / {wizardLimit}
                  </span>
                </div>
                <Progress value={wizardProgress} aria-label={`${wizardUsage} out of ${wizardLimit} active wizards used`} />
              </div>

              {/* Image Generations */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Image Generations Used</span>
                  <span className="text-sm text-muted-foreground">
                    {imageGenUsage} / {imageGenLimit} {imageGenTimeWindowDisplay}
                  </span>
                </div>
                <Progress value={imageGenProgress} aria-label={`${imageGenUsage} out of ${imageGenLimit} image generations used`} />
              </div>

              {/* AI Chat Messages */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">AI Chat Messages Used</span>
                  <span className="text-sm text-muted-foreground">
                    {chatUsage} / {chatLimit} {chatTimeWindowDisplay}
                  </span>
                </div>
                <Progress value={chatProgress} aria-label={`${chatUsage} out of ${chatLimit} AI chat messages used`} />
              </div>
            </div>
          </>
        )}

      </CardContent>
    </Card>
  );
}; 