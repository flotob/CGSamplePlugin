# Onboarding Wizard Plugin Roadmap

## 1. Vision Summary

The goal is to create a universal Common Ground (CG) plugin that functions as a customizable onboarding wizard. Key aspects include:

*   **Role Gating:** The plugin controls community access/privileges by assigning CG roles upon successful completion of an onboarding flow.
*   **Admin Configuration:** Community admins use an interface within the plugin to design multi-step onboarding sequences.
*   **Configurable Steps:** Admins can stitch together steps like questionnaires, agreements/protocols, and OAuth integrations (e.g., Twitter, Discord).
*   **User Experience:** New or existing members interact with the plugin, following the admin-defined steps to gain specified CG roles automatically upon completion.
*   **Universality:** Designed to be installable and usable by any CG community.

## 2. Development Roadmap (Iterative Approach)

This roadmap prioritizes building the core functionality and structural/visual foundation first.

**Phase 1: Foundation & Core Setup (Completed)**

*   **(1.1)** Code refactored into hooks (`useCgQuery`, `useCgMutation`, `CgLibContext`).
*   **(1.2)** React Query provider set up.
*   **(1.3)** Admin/User distinction implemented (`useAdminStatus` based on role titles/env var).

**Phase 2: Structural & Visual Foundation**

*   **Goal:** Establish a clear structure for Admin vs. User views and integrate a UI component library for consistency and faster development later.
*   **Steps:**
    1.  **(New Step 2.1) Component Structure Refinement:**
        *   Create `src/components/AdminView.tsx` and `src/components/UserView.tsx`.
        *   Move admin/user specific rendering logic from `myInfo.tsx` into these components.
        *   Modify `myInfo.tsx` to act as a container, fetching data and conditionally rendering `<AdminView />` or `<UserView />`, passing props.
    2.  **(New Step 2.2) Install & Set up UI Component Library & Theming:**
        *   **Recommendation:** Use **Shadcn/UI**.
        *   Initialize Shadcn/UI: `npx shadcn-ui@latest init` (follow prompts).
        *   **Set up Theme Support:** Install `next-themes` (`npm install next-themes`). Configure Shadcn/UI and `next-themes` provider for light/dark mode detection (following system preference) as per their documentation.
        *   Add initial components: `npx shadcn-ui@latest add button card checkbox`.
    3.  **(New Step 2.3) Basic UI Styling with Component Library:**
        *   Refactor UI in `AdminView.tsx` and `UserView.tsx` to use basic Shadcn/UI components (e.g., `<Card>`, `<Button>`).
    4.  **(New Step 2.4) Basic Admin Navigation:**
        *   **Goal:** Set up a tabbed interface within the admin view.
        *   Add Shadcn/UI `<Tabs>` component: `npx shadcn@latest add tabs`.
        *   Install dependencies if needed (e.g., `@radix-ui/react-tabs`).
        *   Modify `AdminView.tsx` to use `<Tabs>` with "Current Info" and "Configuration" tabs.
        *   Move existing info cards into the "Current Info" tab content.

**Phase 3: Admin Configuration & Storage (Previously Phase 2)**

*   **Goal:** Allow admins to configure the onboarding flow, starting with role selection, and persist this configuration.
*   **Steps:**
    1.  **(Was 2.1) Admin UI - Role Selection:**
        *   Inside `AdminView.tsx`, use `useCgQuery` to fetch `communityInfo`.
        *   Display the list of roles using Shadcn/UI components (e.g., `<Checkbox>` inside `<Card>`).
        *   Manage selected role IDs in local state.
    2.  **(Was 2.2) Configuration Storage Strategy:**
        *   Research/Decide on storage (CG plugin storage, external DB via API routes, etc.).
        *   Implement saving/loading.
    *   *(Further steps...)*

**Phase 4: Basic Workflow Engine (Previously Phase 3)**

*   **Goal:** Introduce a multi-step workflow concept using predefined step types.
*   **Steps:**
    1.  **Data Structure:** Define a model for workflows (e.g., an array of step objects with `id`, `type`, `title`, `content`).
    2.  **Admin UI - Workflow Builder:**
        *   Allow admins to add/reorder simple step types (e.g., `acknowledgement`, `simple_button`).
        *   Configure step content (e.g., text for acknowledgement).
        *   Save the workflow structure.
    3.  **User View - Step Renderer:**
        *   Load the configured workflow.
        *   Render the current step based on user progress.
    4.  **User Logic - Step Progression:**
        *   Maintain user progress state (e.g., `currentStepIndex`).
        *   Implement completion logic for each step type.
        *   Advance to the next step upon completion.
        *   Trigger `useGiveRole()` only after the final step.

*(Further phases will involve adding Questionnaire/OAuth steps, advanced workflow logic, error handling refinement, etc.)* 