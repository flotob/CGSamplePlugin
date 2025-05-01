# Roadmap: User-Facing Wizard Rendering

**Goal:** Replace the dummy data in the user-facing wizard view (`WizardView.tsx`) with real data fetched from the backend, showing active wizards for the community and the user's progress.

**Current State:**

*   The `PluginContainer.tsx` component renders `WizardView.tsx` for non-admin users when the active section is 'wizards' (the default).
*   `WizardView.tsx` currently displays placeholder/dummy wizard information.
*   An admin-only endpoint `GET /api/wizards` exists, but no user-accessible endpoint for fetching wizards exists.

**Proposed Architecture:**

1.  **Backend:** A new API endpoint (`GET /api/user/wizards`) to provide active wizards and user progress.
2.  **Frontend Hook:** A new React Query hook (`useUserWizards`) to fetch data from the new API endpoint.
3.  **Frontend View:** `WizardView.tsx` will use the hook to get real data and render the wizard list dynamically.

**Implementation Steps:**

1.  **Backend API Endpoint (`GET /api/user/wizards`):
    *   **File:** Create `src/app/api/user/wizards/route.ts`.
    *   **Authentication:** Protect with `withAuth(..., false)` (requires authentication, not admin).
    *   **Logic:**
        *   Extract `userId` and `communityId` from the JWT payload (`req.user.sub`, `req.user.cid`).
        *   Perform a SQL query:
            *   Select `id`, `name`, `description` from `onboarding_wizards`.
            *   Filter where `community_id = $1` (communityId) AND `is_active = true`.
            *   Perform a `LEFT JOIN` with `user_wizard_progress` on `user_wizard_progress.wizard_id = onboarding_wizards.id` AND `user_wizard_progress.user_id = $2` (userId).
            *   Use the result of the join to determine a `progressStatus` for each wizard (e.g., 'not_started' if no join match, 'started' if there is a join match - completion logic can be added later).
        *   **Query Example (Conceptual - needs refinement for exact status):**
            ```sql
            SELECT
                w.id, w.name, w.description,
                -- Determine status based on progress existence
                CASE WHEN COUNT(uwp.step_id) > 0 THEN 'started' ELSE 'not_started' END as "progressStatus"
            FROM onboarding_wizards w
            LEFT JOIN user_wizard_progress uwp ON w.id = uwp.wizard_id AND uwp.user_id = $2
            WHERE w.community_id = $1 AND w.is_active = true
            GROUP BY w.id, w.name, w.description
            ORDER BY w.created_at DESC;
            ```
    *   **Response Payload:** Return JSON `{ wizards: Array<{ id: string; name: string; description: string | null; progressStatus: 'not_started' | 'started' | 'completed'; }> }`.

2.  **Frontend Hook (`useUserWizardsQuery`):
    *   **File:** Create `src/hooks/useUserWizardsQuery.ts` (or similar).
    *   **Logic:**
        *   Use `useQuery` from `@tanstack/react-query`.
        *   Use the `useAuthFetch` hook to make authenticated calls.
        *   Query key: `['userWizards']` (or include community/user ID if needed elsewhere).
        *   Query function: Call `authFetch('/api/user/wizards')`.
        *   Return the query result (`data`, `isLoading`, `error`).

3.  **Frontend View (`WizardView.tsx`):
    *   **Integration:** Import and use the `useUserWizardsQuery` hook.
    *   **Cleanup:** Remove any existing dummy data and related logic.
    *   **Loading/Error States:** Implement proper UI states for when the data is loading or if an error occurs during fetch.
    *   **Rendering:**
        *   Map over the `data.wizards` array returned by the hook.
        *   For each wizard, render its name, description.
        *   Display the `progressStatus` visually (e.g., using badges, icons).
    *   **Interaction:** Ensure clicking a wizard card prepares for future navigation/interaction (e.g., passing the wizard ID to a handler or state).

**Future Considerations:**

*   Implementing the actual wizard step execution view.
*   More sophisticated progress calculation (e.g., percentage complete, checking mandatory steps).
*   Handling different `step_types` within a wizard.
*   Potentially filtering wizards based on user roles. 