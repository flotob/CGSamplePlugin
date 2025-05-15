'use client';

import React from 'react';
import {
  useSuperAdminStatsQuery,
  SuperAdminDashboardStatsResponse
} from '@/hooks/useSuperAdminStatsQuery';
import {
  useSuperAdminCommunityUtilizationQuery,
  CommunityFeatureUtilization,
  ALL_TRACKED_FEATURES_FRONTEND,
  FeatureEnumFrontend
} from '@/hooks/useSuperAdminCommunityUtilizationQuery';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, AlertCircle, ShieldAlert, BarChart3, Users, Layers, Activity, Percent, Columns } from 'lucide-react';

// A simple StatCard-like component for this view
interface SimpleStatCardProps {
  title: string;
  value: string | number;
  icon?: React.ElementType;
  description?: string;
}

const SimpleStatCard: React.FC<SimpleStatCardProps> = ({ title, value, icon: Icon, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

// Helper to format feature names for display
const formatFeatureName = (featureKey: FeatureEnumFrontend): string => {
  return featureKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

export const SuperAdminDashboardView: React.FC = () => {
  const statsQuery = useSuperAdminStatsQuery();
  const utilizationQuery = useSuperAdminCommunityUtilizationQuery();

  // Combined loading state
  if (statsQuery.isLoading || utilizationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Super Admin Dashboard...</p>
      </div>
    );
  }

  // Combined error state (show first error)
  if (statsQuery.isError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Dashboard Stats</AlertTitle>
        <AlertDescription>
          {statsQuery.error?.message || 'An unknown error occurred.'}
        </AlertDescription>
      </Alert>
    );
  }
  if (utilizationQuery.isError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Community Utilization Data</AlertTitle>
        <AlertDescription>
          {utilizationQuery.error?.message || 'An unknown error occurred.'}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Data checks
  if (!statsQuery.data) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No summary statistics available for the Super Admin Dashboard.
      </div>
    );
  }
  // utilizationQuery.data can be an empty array, which is a valid state

  const { totalCommunities, communitiesByPlan, totalUsageEvents, usageEventsByFeature, totalWizardsAllCommunities, totalActiveWizardsAllCommunities } = statsQuery.data;
  const communityUtilizationData = utilizationQuery.data || [];

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center gap-2">
              <ShieldAlert className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SimpleStatCard 
              title="Total Communities" 
              value={totalCommunities} 
              icon={Users}
              description="Total number of communities using the plugin."
          />
          <SimpleStatCard 
              title="Total Wizards (All)" 
              value={totalWizardsAllCommunities} 
              icon={Layers} 
              description="Total wizards created across all communities."
          />
          <SimpleStatCard 
              title="Active Wizards (All)" 
              value={totalActiveWizardsAllCommunities} 
              icon={Layers} 
              description="Total active wizards across all communities."
          />
          <SimpleStatCard 
              title="Total Usage Events" 
              value={totalUsageEvents} 
              icon={Activity}
              description="Overall feature usage events recorded."
          />
        </div>

        {/* Community Utilization Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Community Quota Utilization</CardTitle>
            </div>
            <CardDescription>
                Percentage of quota used by communities for various features. (Events: Last 30 Days, Resources: Total)
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Community</TableHead>
                  <TableHead className="min-w-[120px]">Plan</TableHead>
                  {ALL_TRACKED_FEATURES_FRONTEND.map(featureKey => (
                    <TableHead key={featureKey} className="text-right min-w-[180px]">
                      {formatFeatureName(featureKey)} (%)
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {communityUtilizationData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2 + ALL_TRACKED_FEATURES_FRONTEND.length} className="text-center text-muted-foreground h-24">
                      No community utilization data available.
                    </TableCell>
                  </TableRow>
                )}
                {communityUtilizationData.map((community) => (
                  <TableRow key={community.communityId}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10">{community.communityTitle}</TableCell>
                    <TableCell>{community.planName || 'N/A'}</TableCell>
                    {ALL_TRACKED_FEATURES_FRONTEND.map(featureKey => {
                      const featureDetails = community.features[featureKey];
                      let displayValue = "N/A";
                      if (featureDetails) {
                        if (featureDetails.utilizationPercentage !== null) {
                          displayValue = featureDetails.utilizationPercentage === Infinity ? ">∞%" : `${featureDetails.utilizationPercentage.toFixed(1)}%`;
                        }
                      }
                      return (
                        <TableCell key={featureKey} className="text-right">
                          {featureDetails ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{displayValue}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Usage: {featureDetails.usage} / {featureDetails.limit !== null ? featureDetails.limit : '∞'}</p>
                                <p>Window: {featureDetails.timeWindowDisplay}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            displayValue
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Existing Data Tables in Cards (Summary Stats) */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Communities by Plan (Summary)</CardTitle>
              </div>
              <CardDescription>Overall breakdown of communities per subscription plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Plan Code</TableHead>
                    <TableHead className="text-right">Communities</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communitiesByPlan.map((plan) => (
                    <TableRow key={plan.id || plan.code}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{plan.code}</TableCell>
                      <TableCell className="text-right">{plan.count}</TableCell>
                    </TableRow>
                  ))}
                  {communitiesByPlan.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No plan data available.</TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Usage Events by Feature (Summary)</CardTitle>
              </div>
              <CardDescription>Overall counts of specific features being used.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageEventsByFeature.map((event) => (
                    <TableRow key={event.feature}>
                      <TableCell className="font-medium">{formatFeatureName(event.feature as FeatureEnumFrontend)}</TableCell>
                      <TableCell className="text-right">{event.count}</TableCell>
                    </TableRow>
                  ))}
                  {usageEventsByFeature.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">No usage event data available.</TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}; 