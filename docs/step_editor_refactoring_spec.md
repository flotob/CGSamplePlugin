# Refactoring Specification: StepEditor Component

## 1. Problem Statement

The `src/components/onboarding/steps/StepEditor.tsx` component has grown significantly in complexity and size. It manages numerous distinct pieces of state, handles multiple asynchronous operations (fetching, mutations), renders several complex UI sections (often conditionally), and contains intricate `useEffect` logic. This size and complexity make the component:

*   Difficult to understand and reason about.
*   Hard to maintain and modify without introducing regressions.
*   Prone to state management bugs and unexpected effect interactions (as seen during the gradient background implementation attempt).
*   Difficult to test effectively.

## 2. Goal

Refactor `StepEditor.tsx` by breaking it down into smaller, focused, and more manageable child components. The primary goals of this refactoring are:

*   **Improved Readability & Maintainability:** Make the codebase easier to navigate and understand.
*   **Reduced Complexity:** Isolate responsibilities into smaller units.
*   **Increased Stability:** Minimize the potential for unintended side effects between different parts of the form.
*   **Enhanced Testability:** Allow for more focused unit/integration testing of individual sections.

## 3. Analysis of Current `StepEditor.tsx` Responsibilities

The component currently handles:

*   **Top-Level State:** `stepConfig` (presentation, specific), `targetRoleId`, `isActive`, `isMandatory`.
*   **UI/Interaction State:** `isRoleAssignmentEnabled`, `isImageLibraryOpen`, `showDeleteConfirm`.
*   **Data Fetching:** `useStepTypesQuery`, `useAdminImagesQuery` (for background previews).
*   **Mutations:** `useUpdateStep`, `useDeleteStep`, uses `createStepMutation` prop.
*   **Effects:** Complex `useEffect` hooks for initializing state based on `step`/`isCreating` and for syncing local UI state (like color pickers) back to the main config.
*   **Rendering:**
    *   Modes: Create vs. Edit vs. Summary Preview.
    *   Step Type Display.
    *   Accordion Structure containing sections for:
        *   Presentation (Headline/Subtitle).
        *   Background (Tabs for Image, Color, Gradient, YouTube; includes image previews, modal trigger, color picker).
        *   Target Role Assignment.
        *   Step-Specific Configuration (rendering `EnsStepConfig`, `ContentStepConfig`, etc.).
        *   Step Status (Active/Mandatory switches).
    *   Action Buttons (Save/Create, Cancel, Delete + confirmation).
    *   Error/Success Message Display.
    *   `ImageLibraryModal` rendering.

## 4. Proposed Refactoring Strategy: Component Extraction

The most logical approach is to extract the content of each major UI section (primarily the `AccordionItem` contents and the action buttons) into dedicated child components. The `StepEditor` will become a **compositional parent** or **container component**.

## 5. Proposed New Components

Create a new directory, e.g., `src/components/onboarding/steps/editors/` to house these new components.

1.  **`StepPresentationEditor.tsx`** (Potentially rename/reuse `CommonStepPresentationSettings.tsx` directly)
    *   **Responsibility:** Edit headline and subtitle.
    *   **Props:** `config: { headline, subtitle }`, `onChange: (change: { headline?, subtitle? }) => void`, `disabled: boolean`.
    *   **Internal Logic:** State for headline/subtitle inputs. Calls `onChange`.

2.  **`StepBackgroundEditor.tsx`**
    *   **Responsibility:** Manage background selection (Tabs, Image Library interaction, Color Picker).
    *   **Props:**
        *   `wizardId: string`, `stepId: string | undefined`.
        *   `config: { backgroundType, backgroundValue }`.
        *   `onConfigChange: (change: { backgroundType?, backgroundValue? }) => void`.
        *   `onOpenImageLibrary: () => void`.
        *   `disabled: boolean`.
    *   **Internal Logic:**
        *   Renders `Tabs` UI.
        *   Contains `useAdminImagesQuery` for recent images preview.
        *   Renders `ColorPicker`.
        *   Handles internal state if implementing gradient logic later.
        *   Calls `onConfigChange` on selection.
        *   Calls `onOpenImageLibrary` when the button is clicked.

3.  **`StepRoleEditor.tsx`**
    *   **Responsibility:** Handle target role assignment.
    *   **Props:** `targetRoleId: string | null`, `roles: CommunityRole[]`, `onChange: (roleId: string | null) => void`, `disabled: boolean`.
    *   **Internal Logic:** State for `isRoleAssignmentEnabled`, renders `Checkbox` and `Select`, calls `onChange`.

4.  **`StepSpecificConfigEditor.tsx`**
    *   **Responsibility:** Render the correct config component based on step type.
    *   **Props:** `stepType: StepType | null`, `config: Record<string, unknown>`, `onChange: (newSpecificConfig: Record<string, unknown>) => void`, `disabled: boolean`.
    *   **Internal Logic:** Conditional rendering of `EnsStepConfig`, `ContentStepConfig`, etc.

5.  **`StepStatusEditor.tsx`**
    *   **Responsibility:** Handle Active/Mandatory switches.
    *   **Props:** `isActive: boolean`, `isMandatory: boolean`, `onActiveChange: (active: boolean) => void`, `onMandatoryChange: (mandatory: boolean) => void`, `disabled: boolean`.
    *   **Internal Logic:** Renders switches, calls `onChange` props.

6.  **`StepActionButtons.tsx`**
    *   **Responsibility:** Render form action buttons and delete confirmation.
    *   **Props:** `isCreating: boolean`, `isSaveDisabled: boolean`, `isDeleting: boolean`, `onCancelCreate?: () => void`, `onShowDeleteConfirm: () => void`, `onConfirmDelete?: () => void`, `onCancelDelete?: () => void`, `showDeleteConfirm: boolean`.
    *   **Internal Logic:** Renders buttons based on props, handles delete confirmation display.

## 6. Refactored `StepEditor.tsx` Responsibilities

After refactoring, `StepEditor.tsx` should primarily:

1.  **Own Top-Level State:** Manage the core state pieces: `stepConfig`, `targetRoleId`, `isActive`, `isMandatory`.
2.  **Fetch Step Types:** Continue using `useStepTypesQuery`.
3.  **Handle Core Effects:** Manage the main `useEffect` hook that depends on `[step, isCreating]` to initialize/reset the top-level state based on the loaded step.
4.  **Provide Callbacks:** Define callback functions (e.g., `handlePresentationChange`, `handleBackgroundChange`, `handleRoleChange`, `handleSpecificConfigChange`, `handleStatusChange`, `handleDeleteRequest`, `handleConfirmDelete`) that update its own state.
5.  **Manage Modal:** Own the state (`isImageLibraryOpen`) and rendering logic for the `ImageLibraryModal`, passing the `onSelect` (i.e., `handleImageSelected`) callback which updates the background part of its state.
6.  **Handle Form Submission:** Implement `handleSubmit` to gather the final state and call the appropriate mutation (`createStepMutation` or `updateStep`).
7.  **Compose UI:** Render the main form structure (`form`, `Accordion`) and orchestrate the rendering of the new child components within the accordion items, passing down the relevant state slices and callback handlers as props.
8.  **Handle Delete Confirmation:** Manage the `showDeleteConfirm` state.

## 7. Data Flow

*   **State Down:** `StepEditor` passes relevant slices of its state down to the child editor components as props (e.g., `backgroundConfig` to `StepBackgroundEditor`).
*   **Events Up:** Child editor components call callback functions passed via props (e.g., `onConfigChange`, `onRoleChange`) when the user makes changes. These callbacks are defined in `StepEditor` and update its state.

## 8. Advice for Next Agent

1.  **Incremental Refactoring:** Do not attempt to extract everything at once. Extract one section (e.g., `StepStatusEditor`) into its own component, ensure props and callbacks work correctly, and test thoroughly before moving to the next section.
2.  **Prop Drilling vs. Context:** For deeply nested components or shared state, prop drilling might become cumbersome. Evaluate if React Context or another state management solution (like Zustand, if appropriate for the project) might be beneficial for certain parts, but start with prop drilling.
3.  **Callback Naming:** Use clear and consistent naming for callback props (e.g., `onConfigChange`, `onStatusChange`).
4.  **Memoization:** Use `React.useCallback` for callback functions passed down as props to prevent unnecessary re-renders of child components if they are memoized (`React.memo`).
5.  **Focus on `StepEditor` First:** Get the state management and callback structure correct in the parent `StepEditor` before focusing too heavily on the internal implementation of each child component.
6.  **Test Extensively:** After each extraction, test:
    *   Loading existing steps with various configurations.
    *   Editing values in the extracted section.
    *   Saving the changes and verifying they persist correctly.
    *   Creating new steps.
7.  **Review `CommonStepPresentationSettings`:** Decide whether to keep this component as is and use it directly within `StepEditor`'s presentation section or create a new wrapper like `StepPresentationEditor`.

This refactoring will be a significant improvement, making the feature easier to work with going forward. 