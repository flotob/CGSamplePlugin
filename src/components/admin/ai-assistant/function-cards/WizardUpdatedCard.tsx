import React from 'react';
import { CheckCircle, RefreshCw, Edit } from 'lucide-react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WizardUpdatedCardProps {
  wizardId: string;
  wizardName: string;
  isActive: boolean;
  onOpenEditor: (wizardId: string) => void;
}

export const WizardUpdatedCard: React.FC<WizardUpdatedCardProps> = ({
  wizardId,
  wizardName,
  isActive,
  onOpenEditor,
}) => {
  return (
    <Card className="w-full overflow-hidden my-2 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="font-medium text-purple-800 dark:text-purple-300">Wizard Updated Successfully</span>
      </div>
      
      <CardContent className="p-4 bg-gradient-to-br from-purple-50/80 to-purple-50/50 dark:from-purple-950/10 dark:to-purple-950/5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="h-4 w-4 text-purple-500" />
          </div>
          
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{wizardName}</h3>
              <Badge 
                variant="outline" 
                className={`ml-2 ${
                  isActive 
                    ? 'bg-green-100/50 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                    : 'bg-amber-100/50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                }`}
              >
                {isActive ? 'Active' : 'Draft'}
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">ID:</span> {wizardId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground mt-2">
              Wizard details have been successfully updated.
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex justify-end gap-2 border-t border-purple-100 dark:border-purple-800/40">
        <Button 
          variant="default" 
          size="sm" 
          className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white" 
          onClick={() => onOpenEditor(wizardId)}
        >
          <Edit className="h-3.5 w-3.5 mr-1.5" />
          Open Editor
        </Button>
      </CardFooter>
    </Card>
  );
}; 