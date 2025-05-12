import React from 'react';
import { CheckCircle, MoveVertical, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StepsReorderedCardProps {
  wizardId: string;
  wizardName: string;
  stepCount: number;
  onOpenEditor: (wizardId: string) => void;
}

export const StepsReorderedCard: React.FC<StepsReorderedCardProps> = ({
  wizardId,
  wizardName,
  stepCount,
  onOpenEditor,
}) => {
  return (
    <Card className="w-full overflow-hidden my-2 bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-cyan-100 dark:bg-cyan-900/30 px-4 py-2 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
        <span className="font-medium text-cyan-800 dark:text-cyan-300">Steps Reordered Successfully</span>
      </div>
      
      <CardContent className="p-4 bg-gradient-to-br from-cyan-50/80 to-cyan-50/50 dark:from-cyan-950/10 dark:to-cyan-950/5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <MoveVertical className="h-4 w-4 text-cyan-500" />
          </div>
          
          <div className="space-y-1 flex-1">
            <h3 className="font-medium text-foreground">{wizardName}</h3>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Wizard ID:</span> {wizardId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground mt-2">
              {stepCount} step{stepCount !== 1 ? 's' : ''} successfully reordered in this wizard.
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex justify-end gap-2 border-t border-cyan-100 dark:border-cyan-800/40">
        <Button 
          variant="default" 
          size="sm" 
          className="h-8 text-xs bg-cyan-600 hover:bg-cyan-700 text-white" 
          onClick={() => onOpenEditor(wizardId)}
        >
          <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
          View Steps
        </Button>
      </CardFooter>
    </Card>
  );
}; 