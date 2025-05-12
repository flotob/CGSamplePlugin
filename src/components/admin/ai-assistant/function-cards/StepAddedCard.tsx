import React from 'react';
import { CheckCircle, Edit, FileSymlink, LayersIcon } from 'lucide-react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StepAddedCardProps {
  stepId: string;
  wizardId: string;
  stepOrder: number;
  stepTypeId: string;
  onOpenStepEditor: (stepId: string, wizardId: string) => void;
}

export const StepAddedCard: React.FC<StepAddedCardProps> = ({
  stepId,
  wizardId,
  stepOrder,
  stepTypeId,
  onOpenStepEditor,
}) => {
  return (
    <Card className="w-full overflow-hidden my-2 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-blue-800 dark:text-blue-300">Step Added Successfully</span>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <LayersIcon className="h-4 w-4 text-blue-500" />
          </div>
          
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Step #{stepOrder}</h3>
              <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-100">
                New
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Step ID:</span> {stepId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Type ID:</span> {stepTypeId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Wizard:</span> {wizardId.substring(0, 8)}...
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex justify-end gap-2 border-t border-blue-100 dark:border-blue-800/40">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-xs" 
          onClick={() => onOpenStepEditor(stepId, wizardId)}
        >
          <Edit className="h-3.5 w-3.5 mr-1.5" />
          Edit Step
        </Button>
        
        <Button 
          variant="default" 
          size="sm" 
          className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" 
          onClick={() => onOpenStepEditor(stepId, wizardId)}
        >
          <FileSymlink className="h-3.5 w-3.5 mr-1.5" />
          Open Step Editor
        </Button>
      </CardFooter>
    </Card>
  );
}; 