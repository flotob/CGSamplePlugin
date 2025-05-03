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

  // Note: We will map over `orderedSteps` state for rendering, not `steps` prop directly
  // const combinedSteps = steps ? [...steps] : []; // Keep this maybe for length check?

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
    // Wrap the list rendering with dnd-kit context providers
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        // Provide IDs of the sortable items
        items={orderedSteps.map(s => s.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3 p-2 w-full border-r bg-muted/30 h-full overflow-y-auto">
          {/* Render the creating item placeholder if applicable (needs styling) */}
          {isCreating && stepTypeToCreate && (
             <div className="border rounded-md p-3 bg-blue-50 border-blue-200 opacity-70">
               <p className="text-sm font-medium capitalize text-blue-700">New {stepTypeToCreate.name.replace(/_/g, ' ')}</p>
               <p className="text-xs text-blue-600">Editing settings...</p>
             </div>
          )}

          {/* Map over the local orderedSteps state */}
          {orderedSteps.map((step) => {
            const stepType = getStepType(step);
            // Active state based on activeStepId, ensure isCreating doesn't override
            const isActive = step.id === activeStepId && !isCreating;
            return (
              <StepSidebarItem
                key={step.id} // Key must be stable
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
  );
}; 