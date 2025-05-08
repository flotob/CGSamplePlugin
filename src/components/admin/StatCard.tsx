'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ElementType; // Expect a Lucide icon component, for example
  className?: string; // Allow custom styling
}

/**
 * A reusable card component for displaying a single statistic (KPI).
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon, // Rename prop for use as component
  className,
}) => {
  return (
    <Card className={cn("", className)} interactive>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}; 