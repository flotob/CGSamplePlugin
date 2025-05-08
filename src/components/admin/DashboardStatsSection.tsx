'use client';

import React from 'react';
import { useAdminDashboardStatsQuery } from '@/hooks/useAdminDashboardStatsQuery';
import { StatCard } from './StatCard';
import { CompletionsChart } from './CompletionsChart';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle, BarChart, CheckSquare, FileText, Image as ImageIcon, Link as LinkIcon, Loader2, Users } from 'lucide-react';
import { cn } from "@/lib/utils";

interface DashboardStatsSectionProps {
    className?: string;
}

/**
 * Displays the main admin dashboard statistics section, including KPIs and charts.
 */
export const DashboardStatsSection: React.FC<DashboardStatsSectionProps> = ({ className }) => {
    const { data, isLoading, isError, error } = useAdminDashboardStatsQuery();

    // Render loading state
    if (isLoading) {
        return (
            <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5", className)}>
                {/* Render 5 skeleton cards for KPIs */} 
                {Array.from({ length: 5 }).map((_, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-2/3" /> 
                            <Skeleton className="h-4 w-4 rounded-sm" /> 
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-8 w-1/3 mb-1" />
                             <Skeleton className="h-3 w-1/2" /> 
                         </CardContent>
                    </Card>
                ))}
                 {/* Render skeleton for chart */}
                <Card className="md:col-span-2 lg:col-span-3 xl:col-span-5">
                    <CardHeader>
                        <Skeleton className="h-5 w-1/3" /> 
                        <Skeleton className="h-4 w-1/2" /> 
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render error state
    if (isError) {
        return (
            <Alert variant="destructive" className={cn("", className)}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Dashboard Stats</AlertTitle>
              <AlertDescription>
                {error?.message ?? 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
        );
    }

    // Render empty/no data state (should be rare if query runs only for admins)
    if (!data) {
        return (
            <div className={cn("text-center text-muted-foreground py-8", className)}>
                No dashboard data available.
            </div>
        );
    }

    // Render dashboard content
    const { kpis, completionsLast30Days } = data;

    return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5", className)}>
            {/* KPI Stat Cards */}
            <StatCard 
                title="Total Wizards" 
                value={kpis.totalWizards}
                icon={FileText}
                description="All wizards created"
            />
            <StatCard 
                title="Active Wizards" 
                value={kpis.activeWizards}
                icon={CheckSquare}
                description="Currently published wizards"
            />
            <StatCard 
                title="Users Completed" 
                value={kpis.totalUsersCompleted}
                icon={Users}
                description="Unique users completing any wizard"
            />
            <StatCard 
                title="Credentials Linked" 
                value={kpis.totalCredentialsLinked}
                icon={LinkIcon}
                description="Across all users (who completed)"
            />
            <StatCard 
                title="Images Generated" 
                value={kpis.totalImagesGenerated}
                icon={ImageIcon}
                description="AI background images created"
            />

            {/* Chart Section */}
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-5">
                <CompletionsChart data={completionsLast30Days} />
            </div>
        </div>
    );
}; 