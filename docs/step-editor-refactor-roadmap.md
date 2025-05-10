# Step Editor Refactor & Improvement Roadmap

This document outlines the plan to refactor the `StepEditor.tsx` component and related functionalities to improve stability, user experience, and maintainability.

## Phase 1: Implement Immediate Step Creation

**Goal:** Eliminate the intermediate, pre-creation state for new steps. Steps will be created in the database with default values as soon as the user selects a step type. This will simplify state management, improve UX, and reduce potential bugs.

**Assumptions/Backend Requirements:**
*   A backend endpoint exists (or will be created/modified) that can create a new step given a `wizard_id` and `step_type_id`.
*   This endpoint should create the step with sensible default values for its `config` (based on step type), `target_role_id: null`, `is_mandatory: true`, `is_active: true` (or `false` initially, to be decided).
*   The endpoint should return the newly created `Step` object.

**Steps:**

1.  **Modify Step Selection UI (Parent Component - `WizardStepEditorPage.tsx`):**
    *   **Identify:** The current logic for adding a new step is within the `DropdownMenu` in `WizardStepEditorPage.tsx`. The `onClick` handler of the items (buttons) within the categorized `Accordion` inside `DropdownMenuContent` calls `handleAddStepClick(type)`.
    *   **Change `onClick` Behavior:**
        *   The `onClick` handler for each step type in the dropdown will now directly call `createStep.mutate`.
        *   The payload for `createStep.mutate` will be simplified to an object like `{ step_type_id: type.id }`. (The `wizardId` is already scoped within the `useCreateStep` hook).
        *   **Backend Dependency:** This relies on the backend endpoint (called by `useCreateStep`) being updated to accept this minimal payload and create the step with sensible default values for `config`, `target_role_id`, `is_mandatory`, and `is_active`. The endpoint must return the full, newly created `Step` object.
    *   **`createStep.mutate` `onSuccess` Callback:**
        *   This callback (defined in `WizardStepEditorPage.tsx`) will receive the newly created `Step` object (e.g., `res.step`).
        *   It must then call `refetchSteps()` to update the local list of steps.
        *   It must set `setActiveStepId(res.step.id)` to make the new step active in `StepEditor`.
        *   It should also `setSidebarOpen(false)` for mobile UX.
    *   **Remove Obsolete Logic:**
        *   The `stepTypeToCreate` state variable and its setter `setStepTypeToCreate` will be removed.
        *   The `handleAddStepClick` function will be removed (its logic is now in the direct `onClick` mutation).
        *   The `handleSaveNewStep` function will be removed (as `StepEditor` will no longer call it).
        *   The `handleCancelCreate` function and its associated prop on `StepEditor` will be removed.

2.  **Simplify `StepEditor.tsx` for Creation Flow:**
    *   **Remove Props:** The following props will be removed from `StepEditor` (and their passthrough in `WizardStepEditorPage.tsx`):
        *   `isCreating`
        *   `stepTypeForCreate`
        *   `onCreate`
        *   `createStepMutation`
        *   `onCancelCreate`
    *   **Logic Simplification:**
        *   All conditional logic within `StepEditor.tsx` that relied on `isCreating` will be removed or refactored. `StepEditor` will always assume it's editing an existing step.
        *   The `handleSubmit` function in `StepEditor.tsx` will now *only* use `updateStep.mutate` for all save operations. The "Create Step" button variant will become "Save Changes" (or similar, if not already the case).
        *   The main `useEffect` hook in `StepEditor.tsx` (that initializes component state based on `step` or `isCreating`) will be simplified to only handle the `step` prop.
        *   The `key` prop for `StepEditor` in `WizardStepEditorPage.tsx` will be simplified (e.g., from `key={isSummaryPreviewActive ? 'summary-preview' : (isCreating ? 'creating' : activeStep?.id || 'no-selection')}` to `key={isSummaryPreviewActive ? 'summary-preview' : activeStep?.id || 'no-selection'}`).
    *   `INITIAL_STEP_CONFIG` might still be useful if a newly created step from the backend could have a `null` or partial config, but ideally, the backend provides a complete default config structure. Review `parseConfig` in this context – it should already handle defaults gracefully.

3.  **Adjust Child Configuration Components (e.g., `QuizmasterBasicConfig.tsx`):**
    *   These components should already be designed to receive `initialData`. The primary change is that the step they are configuring will always have an ID and exist in the database from the moment they are rendered for a "new" step.
    *   The previously noted "weird UI interaction" where adding a question in `QuizmasterBasicConfig` felt like a pre-save will be naturally resolved. Changes will be to the `stepConfig` of an *existing* (though new) step, saved explicitly by the user via the main "Save Changes" button in `StepEditor`.

4.  **Error Handling for Immediate Creation:**
    *   Implement robust error handling if the initial step creation via the new mechanism fails.
    *   The UI should clearly inform the user of the failure and potentially offer a retry mechanism.
    *   Consider the state of the UI if creation fails – should the user be returned to a state before attempting to add the step?

5.  **Review State Management (Parent Component):**
    *   Ensure the parent component correctly updates its list of steps and manages the "currently selected/editing step" state when a new step is successfully created and becomes active for editing.

## Phase 2: Refactor `StepEditor.tsx` into Smaller Components

**Goal:** Improve the maintainability, readability, and testability of `StepEditor.tsx` by breaking it down into smaller, more focused child components.

**Steps:**

1.  **Identify Refactoring Candidates:**
    *   **`BackgroundSettings`:** The entire `<Tabs>` section for managing image, solid color, gradient, and YouTube backgrounds. This is a high-priority candidate.
        *   This component would encapsulate the `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` logic.
        *   It would manage its own state for things like `youtubeUrlInput`, `youtubeError`, and interactions with `ImageLibraryModal` (or the modal interaction could be lifted if it makes more sense).
    *   **`StepPresentationSettings`:** Currently `CommonStepPresentationSettings`. Review if this component can be further refined or if its scope is appropriate. It handles headline and subtitle.
    *   **`StepRoleAssignmentSettings`:** The section for enabling/disabling role assignment and selecting a target role.
    *   **`StepGeneralSettings`:** The section with switches for "Step Status" (`is_active`) and "Mandatory Step" (`is_mandatory`).
    *   **`StepEditorActions`:** The section containing the "Save/Create", "Cancel", and "Delete" buttons, along with the display of mutation status/errors (`currentMutation.isError`, `updateStep.isSuccess`, `deleteStep.isError`).

2.  **Define Component Interfaces (Props & Callbacks):**
    *   For each new component, clearly define its props (what data it needs, e.g., parts of `stepConfig`, `isSaveDisabled`) and the callbacks it will use to communicate changes back to `StepEditor` (e.g., `onPresentationChange`, `onBackgroundChange`, `onRoleConfigChange`, `onGeneralSettingsChange`).

3.  **Implement and Integrate New Components:**
    *   Create the new component files (e.g., `BackgroundSettings.tsx`, `StepRoleAssignmentSettings.tsx`).
    *   Move the relevant JSX and logic from `StepEditor.tsx` into these new components.
    *   In `StepEditor.tsx`, replace the moved JSX with instances of the new components, passing the defined props and handling the callbacks to update the main `stepConfig` state or trigger actions.
    *   **State Management:**
        *   New components can have their own local UI state where appropriate (e.g., `youtubeUrlInput` in `BackgroundSettings`).
        *   Data that is part of the `Step` model and needs to be saved to the backend must be lifted to `StepEditor`'s `stepConfig` state, typically via `onChange` callbacks.

4.  **Manage Props and Callbacks:**
    *   Ensure data flows correctly down to the new components and that changes are correctly propagated up to `StepEditor.tsx` to update the `stepConfig`.
    *   The `handleSpecificConfigChange` callback might need to be adapted or complemented by more granular callbacks if `stepConfig.specific` is managed by one of these new larger sub-components.

5.  **Review and Refine:**
    *   After initial refactoring, review `StepEditor.tsx` to ensure it has been significantly simplified and now primarily acts as a coordinator for its child components.
    *   Test all functionalities thoroughly.

## Phase 3: Address Runtime Safety and Potential Bugs (Ongoing)

**Goal:** Continuously improve runtime safety and proactively address potential bugs identified during the refactoring process or from further analysis.

**Steps:**

1.  **Strengthen Type Safety:**
    *   Minimize type assertions (`as Type`). With immediate step creation and backend-defined default configs, `step.config` should ideally always be well-structured, reducing the need for assertions.
    *   If `step.config.specific` can vary wildly, consider using discriminated unions for `stepConfig.specific` based on `stepTypeInfo.name` to achieve better type safety when accessing specific properties.

2.  **Review `useEffect` Dependencies:**
    *   Re-evaluate `useEffect` dependencies in `StepEditor` and its child components after refactoring to ensure they are correct and not missing any dependencies or including unnecessary ones (like the mutations that were previously removed).

3.  **Component State Initialization:**
    *   Ensure all components correctly initialize their state from props (`initialData`, `stepConfig`, etc.) and handle updates to these props gracefully.
    *   Pay attention to the `useEffect` blocks that synchronize internal state with incoming props (e.g., in `QuizmasterBasicConfig.tsx` and `QuizmasterAiConfig.tsx`). Ensure they don't cause unnecessary re-renders or infinite loops. For instance, the `JSON.stringify` checks are a good start but can be optimized or re-evaluated.

4.  **Modal Interactions:**
    *   Review the `ImageLibraryModal` interaction. If `BackgroundSettings` becomes its own component, decide if `isImageLibraryOpen` state and `handleImageSelected` logic should reside within `BackgroundSettings` or remain in/be lifted to `StepEditor`.

5.  **Code Cleanup:**
    *   Remove any dead code, commented-out old logic, or unnecessary console logs introduced during development or debugging.

## Timeline & Priorities:

*   **Priority 1:** Phase 1 (Immediate Step Creation). This is expected to resolve the core instability and UX issues.
*   **Priority 2:** Phase 2 (Refactor `StepEditor.tsx`). This will improve long-term maintainability. Can be done iteratively.
*   **Priority 3:** Phase 3 (Runtime Safety). This is an ongoing concern, with specific items addressed as they are identified or become relevant during the other phases.

This roadmap will be updated as progress is made or new information becomes available. 