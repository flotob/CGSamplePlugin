import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddSidequestCardProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const AddSidequestCard: React.FC<AddSidequestCardProps> = ({
  onClick,
  disabled = false,
  className,
}) => {
  return (
    <Card 
      className={cn(
        "w-48 h-full flex flex-col items-center justify-center cursor-pointer ",
        "border-2 border-dashed border-muted-foreground/50 hover:border-primary/70 hover:bg-muted/50",
        "transition-all duration-200 ease-in-out group shrink-0 shadow-md hover:shadow-lg",
        disabled && "opacity-50 cursor-not-allowed hover:border-muted-foreground/50 hover:bg-transparent",
        className
      )}
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          onClick();
        }
      }}
    >
      <CardContent className="p-3 flex flex-col items-center justify-center text-center">
        <PlusCircleIcon className="h-10 w-10 text-muted-foreground/70 group-hover:text-primary/80 transition-colors duration-200 ease-in-out mb-2" />
        <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors duration-200 ease-in-out">
          Add Sidequest
        </p>
        <p className="text-xs text-muted-foreground/80 group-hover:text-primary/70 transition-colors duration-200 ease-in-out">
          (from Library)
        </p>
      </CardContent>
    </Card>
  );
}; 