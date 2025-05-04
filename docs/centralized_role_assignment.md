# Feature Research: Centralized Role Assignment & Session Refresh

## 1. Goal

Ensure that whenever a user is granted a role within the plugin (either programmatically upon wizard completion or manually by an admin), their authentication session (JWT) is refreshed immediately so that subsequent API calls correctly reflect their new permissions (specifically for filtering the user-facing wizard list based on `required_role_id`).

## 2. Problem Context

*   The user's roles are fetched once during initial authentication and embedded in a JWT.
*   Backend API endpoints rely on the roles within this JWT to make authorization decisions (e.g., filtering wizards).
*   When a role is granted *after* the JWT is issued, the JWT becomes stale.
*   Subsequent API calls using the stale JWT will not reflect the user's new role, leading to incorrect data being shown (e.g., wizards the user should now have access to remain hidden).
*   Previous attempts to fix this only addressed one specific code path (`useMarkWizardCompleted`).

## 3. Research Findings

A review of the codebase identified the following locations where role assignments currently occur:

1.  **Wizard Completion (`useMarkWizardCompleted.ts`):** 
    *   The hook calls `/api/user/wizards/[wizardId]/complete`.
    *   This API returns the `target_role_id`s associated with the completed steps.
    *   The hook then loops through these IDs and calls `assignRole` (a `useCgMutation` wrapper around `cgInstance.giveRole`) for each role.
2.  **Admin Assignment (`AdminView.tsx`):**
    *   The `handleAssignRoleClick` function uses a `useCgMutation` hook that directly calls `cgInstance.giveRole`.
3.  **Individual Step Completion (`useCompleteStepMutation` / `POST /api/user/.../steps/[stepId]/complete`):**
    *   The current implementation for completing an individual step **does not** check the step's `target_role_id` or trigger any role assignment.

**Conclusion:** Roles are currently assigned *only* upon full wizard completion or manual admin action. A centralized approach is needed to handle the session refresh consistently for both cases.

## 4. Proposed Plan: Centralized Hook

Create a single, reusable hook that encapsulates the logic for assigning a role *and* refreshing the session.

1.  **Create Hook (`src/hooks/useAssignRoleAndRefresh.ts`):**
    *   **Dependencies:** `useCgLib`, `useAuth`, `useQueryClient`, `useToast`, `useMutation`.
    *   **Input:** Accepts `{ roleId: string, userId: string }`.
    *   **Core Logic (`mutationFn`):** Calls `cgInstance.giveRole(roleId, userId)`.
    *   **Success Handling (`onSuccess`):**
        *   Shows a success toast.
        *   Invalidates relevant queries (e.g., `['userInfo', iframeUid]`).
        *   Performs JWT refresh: `logout()` then `login()`.
    *   **Error Handling (`onError`):** Shows an error toast.
    *   **Return Value:** Standard React Query mutation result object (`mutate`, `isPending`, etc.).

2.  **Refactor `useMarkWizardCompleted.ts`:**
    *   Remove its internal `useCgMutation` for `assignRole`.
    *   Remove any manual `logout`/`login` logic previously added.
    *   Import and instantiate `useAssignRoleAndRefresh`.
    *   Replace the call to the old `assignRole` mutation with `assignRoleAndRefresh.mutate({ roleId, userId })` within the loop.

3.  **Refactor `AdminView.tsx`:**
    *   Remove its internal `useCgMutation` used for `handleAssignRoleClick`.
    *   Import and instantiate `useAssignRoleAndRefresh`.
    *   Update `handleAssignRoleClick` to call `assignRoleAndRefresh.mutate({ roleId, userId: userInfo?.id })`.

## 5. Benefits

*   **Consistency:** Ensures session refresh logic is applied every time a role is granted.
*   **Maintainability:** Centralizes role assignment side-effects in one place.
*   **Future-Proofing:** If new ways to grant roles are added (e.g., per-step completion), they can simply use this hook.

## 6. Next Steps

1.  Implement the `useAssignRoleAndRefresh` hook.
2.  Refactor `useMarkWizardCompleted.ts` to use the new hook.
3.  Refactor `AdminView.tsx` to use the new hook. 