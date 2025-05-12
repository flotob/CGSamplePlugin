import React from 'react';
import { CheckCircle, Edit, Wand2, ExternalLink, ListChecks } from 'lucide-react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WizardCreatedCardProps {
  wizardId: string;
  wizardName: string;
  communityId: string;
  onOpenEditor: (wizardId: string) => void;
}

export const WizardCreatedCard: React.FC<WizardCreatedCardProps> = ({
  wizardId,
  wizardName,
  communityId,
  onOpenEditor,
}) => {
  return (
    <Card className="w-full overflow-hidden my-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-green-100 dark:bg-green-900/30 px-4 py-2 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="font-medium text-green-800 dark:text-green-300">Wizard Created Successfully</span>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{wizardName}</h3>
              <Badge variant="outline" className="ml-2">Draft</Badge>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">ID:</span> {wizardId.substring(0, 8)}...
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Community:</span> {communityId}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex justify-end gap-2 border-t border-green-100 dark:border-green-800/40">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-xs" 
          onClick={() => onOpenEditor(wizardId)}
        >
          <ListChecks className="h-3.5 w-3.5 mr-1.5" />
          Configure Steps
        </Button>
        
        <Button 
          variant="default" 
          size="sm" 
          className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white" 
          onClick={() => onOpenEditor(wizardId)}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Open Step Editor
        </Button>
      </CardFooter>
    </Card>
  );
}; 