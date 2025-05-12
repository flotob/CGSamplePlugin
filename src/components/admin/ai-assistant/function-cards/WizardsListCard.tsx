import React, { useRef, useEffect, useState } from 'react';
import { ListFilter, Wand2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Wizard {
  id: string;
  name: string;
  is_active: boolean;
  community_id: string;
  description?: string;
}

interface WizardsListCardProps {
  wizards: Wizard[];
  status: string;
  onOpenEditor: (wizardId: string) => void;
}

export const WizardsListCard: React.FC<WizardsListCardProps> = ({
  wizards,
  status,
  onOpenEditor,
}) => {
  const [showShadow, setShowShadow] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Detect if content is scrollable
  useEffect(() => {
    const checkIfScrollable = () => {
      if (scrollAreaRef.current) {
        const element = scrollAreaRef.current;
        setShowShadow(element.scrollHeight > element.clientHeight);
      }
    };

    checkIfScrollable();
    // Re-check when wizards change
    window.addEventListener('resize', checkIfScrollable);
    return () => window.removeEventListener('resize', checkIfScrollable);
  }, [wizards]);

  return (
    <Card className="w-full overflow-hidden my-2 bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-teal-100 dark:bg-teal-900/30 px-4 py-2 flex items-center gap-2">
        <ListFilter className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <span className="font-medium text-teal-800 dark:text-teal-300">
          Wizards List {status && status !== 'all' ? `(${status})` : ''}
        </span>
      </div>
      
      <CardContent className="p-4 bg-gradient-to-br from-teal-50/80 to-teal-50/50 dark:from-teal-950/10 dark:to-teal-950/5">
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground">
              Found {wizards.length} wizard{wizards.length !== 1 ? 's' : ''}
            </h3>
          </div>
          
          {wizards.length > 0 ? (
            <div className="relative">
              <div
                ref={scrollAreaRef}
                className="max-h-[300px] overflow-y-auto relative rounded border border-teal-100/50 dark:border-teal-800/30 p-2 pr-3"
              >
                <div className="space-y-3">
                  {wizards.map((wizard) => (
                    <div 
                      key={wizard.id} 
                      className="rounded-md border border-teal-100 dark:border-teal-800/40 p-3 hover:bg-teal-100/30 dark:hover:bg-teal-900/20 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Wand2 className="h-3 w-3 text-teal-500" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">{wizard.name}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                wizard.is_active 
                                  ? 'bg-green-100/50 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                  : 'bg-amber-100/50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              }`}
                            >
                              {wizard.is_active ? 'Active' : 'Draft'}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">ID:</span> {wizard.id.substring(0, 8)}...
                          </div>
                          
                          {wizard.description && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {wizard.description}
                            </div>
                          )}
                          
                          <div className="flex justify-end mt-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs"
                              onClick={() => onOpenEditor(wizard.id)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {showShadow && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-teal-50 to-transparent dark:from-teal-950/20 dark:to-transparent pointer-events-none rounded-b"></div>
              )}
            </div>
          ) : (
            <div className="text-center p-3 text-muted-foreground text-sm border border-dashed rounded-md">
              No wizards found for the selected filter.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 