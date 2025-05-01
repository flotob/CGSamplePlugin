# User-Facing Wizard Slideshow Specification

## 1. Goal

To define the user experience and technical requirements for rendering an onboarding wizard as a full-screen, step-by-step slideshow modal after a user selects a wizard from the `WizardView` component.

## 2. User Experience Flow

1.  **Trigger:** User clicks on an "Available Wizard" card in `WizardView.tsx`.
2.  **Display:** A full-screen modal/overlay appears, covering the main plugin UI.
3.  **Modal Content:**
    *   **Header/Controls:**
        *   A progress indicator (e.g., step `X` of `Y`, progress bar) is displayed at the top.
        *   A close button (`X`) is prominently placed in the top-right corner to allow the user to exit the wizard at any time (progress should ideally be saved).
    *   **Main Area:**
        *   The content of the *current step* is rendered dynamically.
        *   This area needs to adapt based on the `step_type` (e.g., display text/images for info steps, show options for multiple choice, render the ENS verification component, etc.).
    *   **Navigation:**
        *   Buttons for "Next" / "Previous" (or similar) are displayed at the bottom (or contextually).
        *   The "Next" button may be disabled until the current step's requirements are met (e.g., an answer is selected, verification succeeds).
4.  **Progression:** Clicking "Next" advances the user to the next step in the defined `step_order`.
5.  **Completion:** Upon completing the final step, the user might see a success message, and the modal likely closes automatically, returning them to the main plugin view (potentially the `WizardView` with the completed wizard now moved to the "Completed" section).
6.  **Exiting:** Clicking the close button dismisses the modal. The user's progress up to the last completed step should be saved.

## 3. Technical Requirements

*   **Modal Component:**
    *   A reusable full-screen modal component needs to be created (e.g., using Radix UI Dialog primitive or similar).
    *   State management to control modal visibility (e.g., triggered from `WizardView`).
*   **State Management:**
    *   Need state to track the `activeWizardId` and the `currentStepIndex` (or `currentStepId`) within the active wizard.
    *   This state might live in `PluginContainer` or a dedicated context.
*   **Data Fetching:**
    *   Fetch the full details of the selected wizard, including all its steps in the correct `step_order`, when the modal is opened (`GET /api/wizards/:wizardId/steps` endpoint likely needed if not already covered by existing hooks).
    *   Fetch user progress for the active wizard to determine the starting step or resume point (`user_wizard_progress` table).
*   **Step Rendering:**
    *   Implement a dynamic step rendering mechanism.
    *   Create individual React components for each `step_type` (e.g., `InfoStepDisplay`, `MultipleChoiceStepDisplay`, `EnsVerificationStepDisplay`).
    *   The main slideshow component will map the current step's `step_type_id` to the corresponding display component, passing the step's `config` and other necessary props.
*   **Progress Tracking:**
    *   API endpoint(s) needed to record step completion in `user_wizard_progress` (e.g., `POST /api/user/wizards/:wizardId/steps/:stepId/complete`).
    *   Update local/cached progress state upon successful completion.
*   **Navigation Logic:**
    *   Handle enabling/disabling the "Next" button based on step completion criteria.
    *   Manage transitions between steps.
*   **Error Handling:** Display errors gracefully (e.g., if step data fails to load, or step completion fails).

## 4. Open Questions

*   How should partial progress be handled if a user closes the modal?
*   How exactly is step completion determined for each type (e.g., button click, successful verification API call)?
*   Should there be visual transitions between steps?
*   How are errors specific to a step (e.g., failed ENS verification) displayed within the step component?

## 5. Next Steps

1.  Refine the technical requirements (API endpoints, state management approach).
2.  Design wireframes/mockups for the modal layout, progress indicator, and step navigation.
3.  Implement the full-screen modal component.
4.  Implement the state logic for tracking the active wizard and current step.
5.  Implement the dynamic step rendering component and initial step type display components. 