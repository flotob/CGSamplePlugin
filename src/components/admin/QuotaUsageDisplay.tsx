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

// Define props for the component, including className
interface QuotaUsageDisplayProps {
  className?: string;
}

// Helper function to format the time window string for display
const formatTimeWindow = (timeWindow: any): string => {
  if (!timeWindow) { // Handles null, undefined
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

  // Determine the current plan details for progress bar and description
  const currentPlan = data?.plans.find(p => p.id === data.currentPlanId);
  const currentPlanName = currentPlan?.name ?? (data?.currentPlanId ? `Plan ID ${data.currentPlanId}` : 'Free');
  const currentLimit = currentPlan?.wizardLimit ?? 0; // Default to 0 if no plan or limit found
  const currentUsage = data?.currentWizardUsage ?? 0;

  // Calculate progress percentage for the current plan
  const progressPercentage = (currentLimit > 0) 
    ? Math.round((currentUsage / currentLimit) * 100) 
    : 0;

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

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Plan & Usage</CardTitle>
        <CardDescription>
          Your current plan is <strong>{isLoading ? 'Loading...' : currentPlanName}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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