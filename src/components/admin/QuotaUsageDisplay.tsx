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

/**
 * A component to display community plan comparison and current usage.
 */
export const QuotaUsageDisplay: React.FC<QuotaUsageDisplayProps> = ({ className }) => {
  const { data, isLoading, error, isError } = useQuotaUsageQuery();

  // Determine the current plan details for progress bar and description
  const currentPlan = data?.plans.find(p => p.id === data.currentPlanId);
  const currentPlanName = currentPlan?.name ?? 'Free';
  const currentLimit = currentPlan?.wizardLimit ?? 0; // Default to 0 if no plan or limit found
  const currentUsage = data?.currentWizardUsage ?? 0;

  // Calculate progress percentage for the current plan
  const progressPercentage = (currentLimit > 0) 
    ? Math.round((currentUsage / currentLimit) * 100) 
    : 0;

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
                    <TableHead className="w-[100px]"></TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Active Wizard Limit</TableHead>
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
                      <TableCell className="text-right">{plan.wizardLimit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Current Usage Progress Bar Section */}
            <div>
              <h4 className="text-lg font-semibold mb-3 pt-4">Usage</h4>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Active Wizards Used</span>
                <span className="text-sm text-muted-foreground">
                  {currentUsage} / {currentLimit}
                </span>
              </div>
              <Progress value={progressPercentage} aria-label={`${currentUsage} out of ${currentLimit} active wizards used`} />
            </div>
          </>
        )}

      </CardContent>
    </Card>
  );
}; 