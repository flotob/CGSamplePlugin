'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from 'date-fns'; // For formatting dates on the X-axis

// Interface for the data points expected by the chart
interface ChartDataPoint {
  date: string; // YYYY-MM-DD
  completions: number;
}

interface CompletionsChartProps {
  data: ChartDataPoint[];
}

// Use specific types for tooltip props
const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length && label !== undefined) {
    try {
       // Ensure label is treated safely, add fallback if needed
       const dateString = String(label);
       // The 'label' is already the formatted 'displayDate' (e.g., "May 7")
       // No need to re-parse and re-format it.
       const formattedDate = dateString; 
       return (
         <div className="p-2 text-sm bg-background border border-border rounded-md shadow-sm">
           <p className="font-medium">{formattedDate}</p>
           <p className="text-muted-foreground">Completions: {payload[0].value}</p>
         </div>
       );
    } catch (e) {
        console.error("Error formatting tooltip date:", label, e);
        return (
            <div className="p-2 text-sm bg-background border border-border rounded-md shadow-sm text-destructive">
                Error
            </div>
        );
    }
  }
  return null;
};

/**
 * A component to display wizard completions over time using a bar chart.
 */
export const CompletionsChart: React.FC<CompletionsChartProps> = ({ data }) => {
  // Format data for the chart (e.g., format date labels)
  const chartData = data.map(item => ({
    ...item,
    // Format date for XAxis tick display
    displayDate: format(new Date(item.date + 'T00:00:00'), 'MMM d'), 
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wizard Completions (Last 30 Days)</CardTitle>
        <CardDescription>Number of wizards completed per day.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                    data={chartData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }} // Adjust margins
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5}/>
                    <XAxis 
                        dataKey="displayDate" 
                        tickLine={false} 
                        axisLine={false}
                        tickMargin={8}
                        fontSize={12}
                        // Optionally interval to prevent label overlap
                        // interval={'preserveStartEnd'} // Or calculate dynamically
                    />
                    <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={8}
                        fontSize={12}
                        allowDecimals={false} // Whole number completions
                    />
                    <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted))' }} 
                        content={<CustomTooltip />} 
                    />
                    <Bar 
                        dataKey="completions" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]} // Rounded top corners
                        maxBarSize={60} // Max width for bars
                    />
                </BarChart>
            </ResponsiveContainer>
        ) : (
             <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                 No completion data available for the last 30 days.
            </div>
        )}
      </CardContent>
    </Card>
  );
}; 