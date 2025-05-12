import React from 'react';
import { CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StepDeletedCardProps {
  stepId: string;
  wizardId: string;
  stepOrder?: number;
}

export const StepDeletedCard: React.FC<StepDeletedCardProps> = ({
  stepId,
  wizardId,
  stepOrder,
}) => {
  return (
    <Card className="w-full overflow-hidden my-2 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-orange-100 dark:bg-orange-900/30 px-4 py-2 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <span className="font-medium text-orange-800 dark:text-orange-300">Step Deleted Successfully</span>
      </div>
      
      <CardContent className="p-4 bg-gradient-to-br from-orange-50/80 to-orange-50/50 dark:from-orange-950/10 dark:to-orange-950/5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-4 w-4 text-orange-500" />
          </div>
          
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">
                {stepOrder !== undefined ? `Step #${stepOrder}` : 'Step'}
              </h3>
              <Badge variant="outline" className="ml-2 bg-orange-100/50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                Deleted
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Step ID:</span> {stepId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Wizard ID:</span> {wizardId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground mt-2">
              This step has been permanently removed from the wizard.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 