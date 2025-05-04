# Quota System Research & Plan

## Phase 1: Active Wizard Limit Display

**Goal:** Enhance the admin "Account Settings" page (`src/components/AdminView.tsx`) to display the community's usage against their current plan's limit for active wizards.

**Context:**
*   Currently, the only enforced limit is `active_wizard` defined in the `plan_limits` table.
*   Event-based usage tracking (`usage_events`) is not yet implemented or relevant for this feature.

**Data Requirements:**
1.  Community's Current Plan Name: Fetch `communities.current_plan_id`, then look up `plans.name`.
2.  Active Wizard Limit: Fetch `plan_limits.hard_limit` where `plan_id` matches the community's plan and `feature = 'active_wizard'`.
3.  Current Active Wizard Count: Perform a `COUNT(*)` on `onboarding_wizards` where `community_id` matches and `is_active = true`.

**Initial Implementation Plan:**

1.  **Backend API Route:**
    *   Create a new route: `GET /api/community/quota-usage/route.ts` (Keeps community-related info together).
    *   This route *must* be restricted to administrators using `withAuth(handler, true)` from `@/lib/withAuth`.
    *   Inside the handler, the `communityId` will be available via `req.user.cid` from the JWT payload.
    *   It will perform the database queries (using the project's standard DB utility, likely found in existing routes) listed above to fetch the plan name, limit, and current usage for active wizards, scoped by `communityId`.
    *   It will return a JSON object, e.g., `{ planName: 'Pro', limitFeature: 'active_wizard', limit: 10, currentUsage: 3, remaining: 7 }`.
2.  **Frontend Hook:**
    *   Create a React Query hook (e.g., `useQuotaUsageQuery`) to fetch data from the new API endpoint.
3.  **Frontend Component:**
    *   Create a new React component (e.g., `src/components/admin/QuotaUsageDisplay.tsx`).
    *   This component will use the hook to get the data.
    *   It will display the plan name, the active wizard usage (e.g., "3 / 10 Active Wizards Used"), and potentially a visual indicator like a progress bar.
    *   Include an "Upgrade" button (likely linking to the Stripe Billing Portal).
4.  **Integration:**
    *   Add the `QuotaUsageDisplay` component into the "Account Settings" section within `src/components/AdminView.tsx`.

**Future Considerations (Scalability):**
*   The API endpoint and frontend component should be designed so they can later be extended to handle multiple types of limits (e.g., event-based AI usage) by returning and iterating over an array of limit/usage objects.
*   Investigate `src/lib/quotas.ts` later for potential reuse in checking usage, although direct DB queries seem sufficient for `active_wizard`.

---
*This document reflects the plan incorporating API structure and authentication conventions.* 