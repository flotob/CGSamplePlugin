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
        "w-52 h-auto flex flex-col items-center justify-center cursor-pointer p-2",
        "border-2 border-dashed border-muted-foreground/30 bg-muted/10",
        "hover:border-primary/70 hover:bg-primary/5",
        "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none",
        "transition-all duration-200 ease-in-out group shrink-0 shadow-sm",
        disabled && "opacity-50 cursor-not-allowed hover:border-muted-foreground/30 hover:bg-transparent",
        className
      )}
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault(); // Prevent page scroll on space
          onClick();
        }
      }}
      aria-label="Add sidequest from library"
    >
      <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
        <div className="flex items-center justify-center w-16 h-16 mb-3 rounded-full bg-background shadow-sm group-hover:shadow group-hover:bg-primary/10 transition-all duration-200">
          <PlusCircleIcon className="h-10 w-10 text-muted-foreground/70 group-hover:text-primary transition-colors duration-200 ease-in-out" />
        </div>
        
        <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors duration-200 ease-in-out">
          Add Sidequest
        </p>
        <p className="text-xs text-muted-foreground/80 group-hover:text-primary/70 transition-colors duration-200 ease-in-out mt-0.5">
          from Library
        </p>
      </CardContent>
    </Card>
  );
}; 