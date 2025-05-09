import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery';

/**
 * Determines if a step is considered successfully completed for progression purposes.
 *
 * @param step The user's progress on the current step.
 * @param allStepTypes An array of all available step types.
 * @returns True if the user can proceed from this step, false otherwise.
 */
export const getStepPassStatus = (
  step: UserStepProgress | undefined,
  allStepTypes: StepType[] | undefined
): boolean => {
  if (!step) {
    return false; // No step to evaluate
  }

  // If the step is not mandatory, progression is allowed if it has been completed (attempted)
  if (!step.is_mandatory) {
    return !!step.completed_at;
  }

  // For mandatory steps:
  // Must be completed (attempted) to even consider progression
  if (!step.completed_at) {
    return false;
  }

  // Try to find the step type details
  const stepType = allStepTypes?.find(st => st.id === step.step_type_id);

  if (!stepType) {
    // If step type details are missing for a mandatory step, block progression for safety
    console.warn(`Could not find step type details for mandatory step ID: ${step.step_type_id}. Blocking progression.`);
    return false;
  }

  // Specific logic for quiz-type steps
  if (stepType.name === 'quizmaster_basic' || stepType.name === 'quizmaster_ai') {
    // For mandatory quizzes, 'verified_data' must exist, be an object, and have a 'passed' property that is true
    return !!(
      step.verified_data &&
      typeof step.verified_data === 'object' &&
      (step.verified_data as { passed?: boolean }).passed === true
    );
  }

  // For other mandatory step types, if 'completed_at' is set, allow progression.
  // This maintains existing behavior for mandatory steps that aren't quizzes.
  // This could be expanded if other step types introduce their own 'passed' criteria in 'verified_data'.
  return true;
}; 