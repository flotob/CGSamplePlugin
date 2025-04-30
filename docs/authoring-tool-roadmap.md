# Onboarding Wizard Authoring Tool Roadmap

This document outlines the development plan for the onboarding wizard authoring tool.

## 1. Understanding & Setup

- **Technology Stack:** Next.js (React), TypeScript, Tailwind CSS.
- **Location:** The authoring interface will be integrated into the existing `AdminView` component (`src/components/AdminView.tsx`), conditionally rendered when the active section is 'config'.
- **Data Model:** Utilizes the existing PostgreSQL schema (`docs/current-db-schema.db`), particularly the `onboarding_wizards`, `step_types`, and `onboarding_steps` tables.

## 2. Core Authoring Features (MVP)

- **Wizard Listing & Creation:**
    - Display a list of existing wizards associated with the current community (`onboarding_wizards` table).
    - Provide a way to create a new wizard (requires setting `name`, `description`, `community_id`).
- **Step Management:**
    - Within a selected wizard's view:
        - Display existing steps (`onboarding_steps`) in their defined `step_order`.
        - Allow reordering of steps (drag and drop?).
        - Allow adding new steps.
        - Allow deleting existing steps.
- **Step Type Selection:**
    - When adding a new step, allow selection from available `step_types`. Initially:
        - ENS Verification (using existing integration)
        - Multiple Choice (New)
- **Step Configuration:**
    - **ENS Verification:** Define specific verification criteria (e.g., minimum ENS age - needs schema/logic update in `config` field?).
    - **Multiple Choice:** Define the question text and the possible answer options. Store this in the `config` JSONB field of `onboarding_steps`.
- **Role Assignment (Per Step):**
    - The authoring tool will allow associating an optional target role (`target_role_id` from `communities.roles`) with *any* step in the wizard.
    - When adding/editing a step, the admin can select a role to be granted upon successful completion of that specific step, or leave it blank if no role should be granted for that step.
    - This utilizes the existing `target_role_id` column in the `onboarding_steps` table.
- **Activation:** Allow toggling the `is_active` status for wizards and potentially individual steps.

## 3. Backend API Endpoints

- Need API endpoints (likely in `src/app/api/`) to support the frontend actions:
    - `GET /api/wizards`: List wizards for the community.
    - `POST /api/wizards`: Create a new wizard.
    - `PUT /api/wizards/:wizardId`: Update wizard details (name, description, target role, active status).
    - `DELETE /api/wizards/:wizardId`: Delete a wizard.
    - `GET /api/wizards/:wizardId/steps`: Get steps for a specific wizard.
    - `POST /api/wizards/:wizardId/steps`: Add a new step to a wizard.
    - `PUT /api/wizards/:wizardId/steps/:stepId`: Update a step (config, type, mandatory status).
    - `PUT /api/wizards/:wizardId/steps`: Update step order for a wizard.
    - `DELETE /api/wizards/:wizardId/steps/:stepId`: Delete a step.
    - `GET /api/step-types`: List available step types.

## 4. Frontend Implementation (`AdminView`/'config' section)

- Implement UI components for:
    - Wizard list display.
    - Wizard creation/editing form.
    - Step list display (with reordering).
    - Step creation/editing modal/form.
    - Specific configuration UIs for ENS and Multiple Choice steps.
- Integrate with backend API endpoints using `useCgQuery` / `useCgMutation`.

## 5. Multiple Choice Step Implementation (User View)

- Update `WizardView.tsx` (or relevant component displaying steps to the user) to render the Multiple Choice step type based on its configuration.
- Implement logic to store the user's choice (likely in `user_wizard_progress.verified_data`).

## 6. Future Considerations

- Conditional logic/branching within wizards.
- More complex role assignment logic (based on combined answers).
- Additional step types (e.g., free text input, external integrations).
- Analytics/reporting on wizard completion. 