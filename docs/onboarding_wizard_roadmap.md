# Onboarding Wizard Plugin Roadmap

## 1. Vision Summary

The goal is to create a universal Common Ground (CG) plugin that functions as a customizable onboarding wizard. Key aspects include:

*   **Role Gating:** The plugin controls community access/privileges by assigning CG roles upon successful completion of an onboarding flow.
*   **Admin Configuration:** Community admins use an interface within the plugin to design multi-step onboarding sequences.
*   **Configurable Steps:** Admins can stitch together steps like questionnaires, agreements/protocols, and OAuth integrations (e.g., Twitter, Discord).
*   **User Experience:** New or existing members interact with the plugin, following the admin-defined steps to gain specified CG roles automatically upon completion.
*   **Universality:** Designed to be installable and usable by any CG community.

## 2. Development Roadmap (Iterative Approach)

This roadmap prioritizes building the core functionality and admin experience first, allowing for iterative development and feedback.

**Phase 1: Foundation & Core Role Assignment**

*   **Goal:** Establish the basic structure and enable assigning a *pre-defined* role via a simple user interaction.
*   **Steps:**
    1.  **Refactor Existing Code:**
        *   Extract CG interaction logic from `myInfo.tsx` into reusable React hooks (e.g., `useCgLib()`, `useUserInfo()`, `useCommunityInfo()`, `useGiveRole()`).
        *   **Use React Query (`@tanstack/react-query`)** within these hooks for better data fetching state management (caching, background updates, loading/error states).
        *   **Detailed Sub-steps:**
            1.  **Install React Query:**
                *   `npm install @tanstack/react-query`
            2.  **Set up React Query Provider:**
                *   Create a client (`const queryClient = new QueryClient()`).
                *   Wrap the application in `src/app/layout.tsx` (or a new client component layout) with `<QueryClientProvider client={queryClient}>`.
            3.  **Create Hooks Directory:**
                *   Create `src/hooks`.
            4.  **Create `CgLibContext.tsx`:**
                *   **Purpose:** Manages the initialization and provides access to the `CgPluginLib` instance via React Context.
                *   **Action:** Create `src/context/CgLibContext.tsx`.
                *   **Implementation:**
                    *   Define `CgLibContext`.
                    *   Create `CgLibProvider` component:
                        *   Uses `useSearchParams` to get `iframeUid`.
                        *   Uses `useEffect` to initialize `CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)`.
                        *   Stores `{ cgInstance, isInitializing, initError }` in state and provides it via context value.
                    *   Create `useCgLib` hook that consumes `CgLibContext`.
                *   **Action:** Wrap the `<QueryClientProvider>`'s children (or the relevant part of the layout) with `<CgLibProvider>`.
            5.  **Create `useCgQuery.ts` Hook:**
                *   **Purpose:** A generic hook using React Query's `useQuery` to fetch data from the `CgPluginLib`.
                *   **Action:** Create `src/hooks/useCgQuery.ts`.
                *   **Implementation:**
                    *   Takes a `queryKey` (e.g., `['userInfo']`) and a `queryFn` (an async function that calls the `CgPluginLib` method, e.g., `async () => (await cgInstance.getUserInfo()).data`).
                    *   Gets `{ cgInstance, isInitializing }` from `useCgLib()`.
                    *   Uses `useQuery` from `@tanstack/react-query`.
                    *   `queryKey` includes the instance availability (or something unique per iframeUid) to ensure query runs for the right instance.
                    *   The `queryFn` uses the `cgInstance`.
                    *   Set `enabled: !!cgInstance` in `useQuery` options to only run when the instance is ready.
                    *   Returns the result object from `useQuery` (`{ data, error, isLoading, ... }`).
            6.  **Create `useCgMutation.ts` Hook (for Actions):**
                *   **Purpose:** Provides functions to trigger actions (mutations) on `CgPluginLib` using React Query's `useMutation`.
                *   **Action:** Create `src/hooks/useCgMutation.ts`.
                *   **Implementation:**
                    *   Takes a `mutationFn` (e.g., `async ({ roleId, userId }) => cgInstance.giveRole(roleId, userId)`) and optionally related `queryKeys` to invalidate.
                    *   Gets `{ cgInstance }` from `useCgLib()`.
                    *   Gets `queryClient` using `useQueryClient()`.
                    *   Uses `useMutation`.
                    *   The `mutationFn` uses the `cgInstance`.
                    *   In `onSuccess` option, invalidate relevant queries using `queryClient.invalidateQueries({ queryKey: [...] })` (e.g., invalidate `['userInfo']` after `giveRole`).
                    *   Returns the result object from `useMutation` (`{ mutate, mutateAsync, isPending, isError, isSuccess, ... }`).
            7.  **Refactor `myInfo.tsx`:**
                *   Remove direct `useState` for CG data and the `useEffect` for initialization.
                *   Use `useCgQuery` to fetch `userInfo`, `communityInfo`, `friends`. Handle loading/error states.
                    *   Example: `const { data: userInfo, ... } = useCgQuery(['userInfo', iframeUid], async () => (await cgInstance.getUserInfo()).data);`
                *   Use `useCgMutation` for the `giveRole` action.
                    *   Example: `const { mutate: assignRole, isPending: isAssigningRole } = useCgMutation(async ({ roleId, userId }) => cgInstance.giveRole(roleId, userId), { onSuccess: () => queryClient.invalidateQueries(['userInfo']) });`
                *   Update button `onClick` to call `assignRole({ roleId: ..., userId: ... })`.
            8.  **Ensure Providers Wrap Correctly:**
                *   Verify `QueryClientProvider` and `CgLibProvider` are correctly placed in the component tree (likely in `layout.tsx` or a client component wrapper).
    2.  **Basic Admin/User Distinction:**
        *   Implement a simple way to differentiate views using `useAdminStatus` hook (checks `NEXT_PUBLIC_ADMIN_ROLE_IDS` env var or default "Admin" role).

**Phase 2: Admin Configuration UI & Storage**

*   **Goal:** Allow admins to *select* which role(s) are assigned upon completion of the (future) onboarding flow. Introduce configuration persistence.
*   **Steps:**
    1.  **Admin UI - Role Selection:**
        *   Build an admin-only component using `useCommunityInfo()` to list available roles.
        *   Allow admin to select role(s) to be assigned (e.g., using checkboxes).
    2.  **Configuration Storage Strategy:**
        *   **Research:** Investigate `cg-plugin-lib` for community-specific data storage.
        *   **Fallback/Initial:** Plan for external storage (backend API + DB) or use `localStorage` for rapid prototyping.
    3.  **Save/Load Configuration:**
        *   Implement saving/loading the selected role IDs via the chosen storage method.
    4.  **Update User Logic:**
        *   Use the loaded configuration to determine which role(s) to assign.

**Phase 3: Basic Workflow Engine (Static Steps)**

*   **Goal:** Introduce a multi-step workflow concept using predefined, simple step types.
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

*(Further phases will involve adding Questionnaire/OAuth steps, UI refinement, error handling, etc.)* 