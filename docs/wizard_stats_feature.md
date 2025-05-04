# Feature Research: Wizard Statistics in Admin List

## 1. Goal

Display key statistics (e.g., unique starters, unique completers) for each **published** wizard directly within the admin list view (`src/components/onboarding/WizardList.tsx` / `WizardListItem.tsx`). This provides admins with a quick overview of wizard engagement.

## 2. Context & Challenges

*   The existing Social Proof feature (`useWizardStepSocialProofQuery`, `/api/wizards/[id]/steps/[stepId]/social-proof`) calculates unique user counts, but only for **individual steps**.
*   Fetching step-level stats for all steps of all wizards displayed in the list is highly inefficient (N+1 problem).
*   We need aggregated statistics **per wizard**.
*   Primary data sources: `user_wizard_progress` (for starters) and `user_wizard_completions` (for completers).

## 3. Proposed Plan (Batch API Approach)

This approach prioritizes backend efficiency and separation of concerns.

**Phase 1: Backend - New Stats Endpoint**

1.  **Define Stats:** Initial focus on:
    *   **Unique Starters:** `COUNT(DISTINCT user_id)` from `user_wizard_progress` per `wizard_id`.
    *   **Unique Completers:** `COUNT(DISTINCT user_id)` from `user_wizard_completions` per `wizard_id`.
2.  **Create API Route:** `GET /api/admin/wizards/stats`
    *   Admin-only access (`withAuth(handler, true)`).
    *   Accepts a comma-separated list of wizard IDs via query parameter (e.g., `?ids=uuid1,uuid2,uuid3`).
3.  **Implement Backend Logic:**
    *   Parse the list of wizard IDs.
    *   Perform two optimized DB queries (using `COUNT(DISTINCT user_id) ... WHERE wizard_id = ANY($1::uuid[]) GROUP BY wizard_id`) - one for starters, one for completers.
    *   Combine results into a response map: ` { [wizardId]: { starters: number, completers: number } } `.
4.  **Define Types:** Create TypeScript interfaces for the API response.

**Phase 2: Frontend - Hook and UI Integration**

5.  **Create Hook:** `useWizardsStatsQuery(wizardIds: string[])`
    *   Takes an array of wizard IDs.
    *   Calls the new `GET /api/admin/wizards/stats` endpoint.
    *   Returns the stats data map.
    *   Handles empty `wizardIds` array gracefully (no API call).
6.  **Modify `WizardList.tsx`:**
    *   Fetch wizard list using `useWizardsQuery`.
    *   Extract IDs of **published** wizards.
    *   Call `useWizardsStatsQuery` with the published IDs.
    *   Pass the relevant stats down to each `WizardListItem` for published wizards.
7.  **Modify `WizardListItem.tsx`:**
    *   Accept optional `stats` prop: `{ starters: number, completers: number }`.
    *   If `wizard.is_active` and `stats` are provided, display the numbers (e.g., "{stats.starters} Starters / {stats.completers} Completers").

## 4. Next Steps (When Implemented)

1.  Create the API route file (`src/app/api/admin/wizards/stats/route.ts`) and implement basic structure.
2.  Implement the database query logic in the API route.
3.  Define TypeScript types for the API response.
4.  Create the `useWizardsStatsQuery` hook.
5.  Integrate the hook call into `WizardList.tsx`.
6.  Update `WizardListItem.tsx` props and render the stats display. 