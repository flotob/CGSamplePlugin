import React from 'react';
import { CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WizardDeletedCardProps {
  wizardId: string;
  wizardName: string;
}

export const WizardDeletedCard: React.FC<WizardDeletedCardProps> = ({
  wizardId,
  wizardName,
}) => {
  return (
    <Card className="w-full overflow-hidden my-2 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-red-100 dark:bg-red-900/30 px-4 py-2 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <span className="font-medium text-red-800 dark:text-red-300">Wizard Deleted Successfully</span>
      </div>
      
      <CardContent className="p-4 bg-gradient-to-br from-red-50/80 to-red-50/50 dark:from-red-950/10 dark:to-red-950/5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-4 w-4 text-red-500" />
          </div>
          
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{wizardName}</h3>
              <Badge variant="outline" className="ml-2 bg-red-100/50 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                Deleted
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">ID:</span> {wizardId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground mt-2">
              This wizard and all its steps have been permanently deleted.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 