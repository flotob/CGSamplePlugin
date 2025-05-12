import React from 'react';
import { CheckCircle, RefreshCw, Edit } from 'lucide-react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StepUpdatedCardProps {
  stepId: string;
  wizardId: string;
  stepOrder: number;
  stepTypeName?: string;
  isMandatory?: boolean;
  isActive?: boolean;
  onOpenStepEditor: (stepId: string, wizardId: string) => void;
}

export const StepUpdatedCard: React.FC<StepUpdatedCardProps> = ({
  stepId,
  wizardId,
  stepOrder,
  stepTypeName,
  isMandatory = true,
  isActive = true,
  onOpenStepEditor,
}) => {
  return (
    <Card className="w-full overflow-hidden my-2 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-indigo-100 dark:bg-indigo-900/30 px-4 py-2 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <span className="font-medium text-indigo-800 dark:text-indigo-300">Step Updated Successfully</span>
      </div>
      
      <CardContent className="p-4 bg-gradient-to-br from-indigo-50/80 to-indigo-50/50 dark:from-indigo-950/10 dark:to-indigo-950/5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="h-4 w-4 text-indigo-500" />
          </div>
          
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Step #{stepOrder}</h3>
              <div className="flex gap-1">
                {!isMandatory && (
                  <Badge variant="outline" className="bg-blue-100/50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    Optional
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={`${
                    isActive 
                      ? 'bg-green-100/50 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                      : 'bg-amber-100/50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            
            {stepTypeName && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Type:</span> {stepTypeName}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Step ID:</span> {stepId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Wizard ID:</span> {wizardId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground mt-2">
              Step configuration has been successfully updated.
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex justify-end gap-2 border-t border-indigo-100 dark:border-indigo-800/40">
        <Button 
          variant="default" 
          size="sm" 
          className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" 
          onClick={() => onOpenStepEditor(stepId, wizardId)}
        >
          <Edit className="h-3.5 w-3.5 mr-1.5" />
          Edit Step
        </Button>
      </CardFooter>
    </Card>
  );
}; 