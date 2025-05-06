import React from 'react';
import { Step, useUpdateStepOrder } from '@/hooks/useStepsQuery';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { StepSidebarItem } from './StepSidebarItem';
import { useQueryClient } from '@tanstack/react-query';
// Import dnd-kit components and hooks
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface StepSidebarProps {
  wizardId: string;
  activeStepId: string | null;
  setActiveStepId: (id: string | null) => void;
  steps: Step[] | undefined;
  isLoading: boolean;
  isCreating: boolean;
  stepTypeToCreate: StepType | null;
}

export const StepSidebar: React.FC<StepSidebarProps> = ({
  wizardId,
  activeStepId,
  setActiveStepId,
  steps,
  isLoading,
  isCreating,
  stepTypeToCreate
}) => {
  const { data: stepTypesData } = useStepTypesQuery();
  const queryClient = useQueryClient();
  const updateStepOrderMutation = useUpdateStepOrder(wizardId);
  
  // --- dnd-kit state and handlers ---
  // Local state to manage the visual order during drag operations
  const [orderedSteps, setOrderedSteps] = React.useState<Step[]>([]);

  // Update local order when the steps prop changes from the query
  React.useEffect(() => {
    setOrderedSteps(steps ? [...steps] : []);
  }, [steps]);

  // Configure sensors for pointer and keyboard interactions
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {
      let newOrder: Step[] = []; // Define newOrder in the outer scope
      setOrderedSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        newOrder = arrayMove(items, oldIndex, newIndex);
        return newOrder; // Update local state immediately
      });

      // Call the backend mutation with the new order AFTER updating local state
      if (newOrder.length > 0) { // Ensure newOrder was populated
         updateStepOrderMutation.mutate({ stepIds: newOrder.map(s => s.id) }, {
            // Optional: Add onError to potentially revert local state or show message
            onError: (error) => {
               console.error("Failed to update step order:", error);
               // Optionally revert state: setOrderedSteps(steps ? [...steps] : []);
               // Optionally show a toast message to the user
            }
         }); 
      }
    }
  };
  // --- end dnd-kit state and handlers ---

  if (isLoading) return <div className="p-4">Loading steps...</div>;

  // Determine if the special summary item is active
  const isSummaryActive = activeStepId === 'summary-preview';

  const getStepType = (step: Step) => stepTypesData?.step_types.find(t => t.id === step.step_type_id);

  if (!isLoading && orderedSteps.length === 0 && !isCreating) {
    return <div className="p-4 text-muted-foreground">No steps yet.</div>;
  }

  const handleStepDeleted = () => {
    // Invalidate query to refetch potentially reordered steps if backend updated order on delete (unlikely but good practice)
    queryClient.invalidateQueries({ queryKey: ['steps', wizardId] });
    // Optionally find the next/previous step to activate, or just set to null
    setActiveStepId(null); 
  };

  return (
    // Main container for the sidebar content, including Dnd context and static item
    <div className="flex flex-col p-2 w-full border-r bg-muted/30 h-full overflow-y-auto overflow-x-hidden">
      {/* Dnd Context for draggable items */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={orderedSteps.map(s => s.id)} 
          strategy={verticalListSortingStrategy}
        >
          {/* Container for the actual sortable items */}
          <div className="flex flex-col gap-3">
            {/* Render the creating item placeholder */}
            {isCreating && stepTypeToCreate && (
              <div className="border rounded-md p-3 bg-blue-50 border-blue-200 opacity-70">
                 <p className="text-sm font-medium capitalize text-blue-700">New {stepTypeToCreate.label || stepTypeToCreate.name.replace(/_/g, ' ')}</p>
                 <p className="text-xs text-blue-600">Editing settings...</p>
              </div>
            )}
            {/* Map over the sortable steps */}
            {orderedSteps.map((step) => {
              const stepType = getStepType(step);
              const isActive = step.id === activeStepId && !isCreating;
              return (
                <StepSidebarItem
                  key={step.id}
                  wizardId={wizardId}
                  step={step}
                  stepType={stepType}
                  isActive={isActive}
                  setActiveStepId={setActiveStepId}
                  onDeleted={handleStepDeleted}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Divider and Static Summary Item (rendered only if there are steps or creating) */}
      {(orderedSteps.length > 0 || isCreating) && (
        <>
          <div className="border-t my-3 mx-[-8px]"></div> {/* Divider */} 
          <div 
            className={`group relative border rounded-md p-3 transition-colors duration-150 ease-in-out ${
              // Add dark mode variants for active state
              isSummaryActive ? 'bg-purple-100 border-purple-300 dark:bg-purple-900/50 dark:border-purple-700' : 'bg-card hover:bg-muted/50' 
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 overflow-hidden pr-2">
                   <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                   <p className="text-sm font-medium truncate">Summary Preview</p>
                </div>
                {/* No drag handle or delete button */}
              </div>
              
              {/* Explicit Select Button - Always visible on mobile, visible on hover for desktop */}
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-between text-xs h-7 ${isSummaryActive ? 'bg-primary/20' : 'bg-secondary/50'} sm:opacity-0 sm:group-hover:opacity-100 transition-opacity`}
                onClick={() => setActiveStepId('summary-preview')}
              >
                {isSummaryActive ? 'Currently Selected' : 'View Summary'}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
      
      {/* Message if no steps exist and not currently creating */}
      {!isLoading && orderedSteps.length === 0 && !isCreating && (
        <div className="p-4 text-muted-foreground text-center">No steps yet. Add one to begin.</div>
      )}
    </div>
  );
}; 