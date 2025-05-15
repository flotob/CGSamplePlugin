# Super Admin Dashboard - Research Plan

## 1. Objective

Implement a new "Super Admin" section in the application. This section will feature a dashboard displaying cross-community analytics, accessible only to a designated super admin user.

## 2. Key Features

*   **Conditional Sidebar Link:**
    *   A "Super Admin" link will appear in the main navigation sidebar.
    *   Visibility of this link is restricted to the user whose ID matches the `NEXT_PUBLIC_SUPERADMIN_ID` environment variable.
*   **Dedicated Super Admin Page:**
    *   The link will navigate to a new page/view dedicated to super admin functions.
    *   Access to this page must be strictly controlled, ensuring only the super admin can view it.
*   **Super Admin Dashboard Metrics:**
    *   **Total Communities:** Count of all communities that have installed the plugin.
    *   **Plan Breakdown:** Statistics on how many communities are on different subscription plans (e.g., Free, Pro, Premium).
    *   **Usage Event Aggregates:** Total counts of various usage events across all communities, potentially filterable by `feature_enum` types (e.g., `ai_chat_message`, `wizard_step_completion`, `image_generation`).

## 3. Research & Investigation Areas

### 3.1. Frontend - Sidebar Integration

*   **Identify Sidebar Component:** Locate the exact React component responsible for rendering the navigation sidebar.
    *   *Initial Finding:* `src/components/layout/Sidebar.tsx` appears to be the main component.
    *   *Confirm Data Flow:* Understand how `userId` and `isAdmin` status are passed to this component, likely from `src/app/PluginContainer.tsx`.
*   **Environment Variable Access:** Determine how to access `process.env.NEXT_PUBLIC_SUPERADMIN_ID` within the sidebar component or its parent.
*   **Conditional Rendering Logic:** Plan the logic to show/hide the "Super Admin" link based on the current user's ID and the environment variable.
*   **New Route/Section:**
    *   Define a new section ID (e.g., `'super-admin'`).
    *   Update `PluginContainer.tsx` or relevant routing logic to handle this new section and render a new Super Admin view component.

### 3.2. Frontend - Super Admin Page/View

*   **New Component:** Create a new React component for the Super Admin dashboard (e.g., `src/components/super-admin/SuperAdminDashboardView.tsx`).
*   **Layout:** Design the layout for displaying the super admin metrics (stat cards, charts if necessary).
*   **Data Fetching Hook:** Create a new React Query hook (e.g., `useSuperAdminStatsQuery`) to fetch data from the new backend API endpoint.
*   **UI Components:** Reuse existing `StatCard` or create new components for displaying aggregated data.

### 3.3. Backend - API Endpoint for Super Admin Stats

*   **New API Route:** Create a new API route (e.g., `src/app/api/super-admin/stats/route.ts`).
*   **Authentication/Authorization:**
    *   Protect this route using `withAuth`.
    *   Implement strict authorization to ensure only the user whose ID matches `NEXT_PUBLIC_SUPERADMIN_ID` can access this endpoint. This might involve re-checking the ID from the JWT against the environment variable on the server-side.
*   **Database Queries:**
    *   **Total Communities:** `SELECT COUNT(*) FROM communities;`
    *   **Plan Breakdown:**
        *   `SELECT p.name, COUNT(c.id) FROM communities c JOIN plans p ON c.current_plan_id = p.id GROUP BY p.name;`
        *   Consider communities with `current_plan_id IS NULL` as potentially "Free" or a default plan if applicable.
    *   **Usage Events:**
        *   `SELECT feature, COUNT(*) FROM usage_events GROUP BY feature;` (To get counts per `feature_enum` type)
        *   `SELECT COUNT(*) FROM usage_events;` (For total usage events)
    *   Verify table names and column names against `docs/current-db-schema.db`. The schema uses `plans.code` and `plans.name`, and `communities.current_plan_id` which references `plans.id`.
*   **Response Structure:** Define the JSON response structure for the super admin stats.

### 3.4. Data Types and Enums

*   **`feature_enum`**: Confirm usage for filtering/displaying usage event types. The schema provided shows: `ENUM ('ai_chat_message', 'wizard_step_completion', 'api_call_generic', 'active_wizard', 'image_generation')`.
*   **Plan Information**: How to map `plan_id` to plan names (Free, Pro, Premium). The `plans` table has `id`, `code`, and `name`.

## 4. Open Questions & Considerations

*   How should communities with no `current_plan_id` be categorized in the plan breakdown? (Assume "Free" or a default category).
*   Security: Double-check that the super admin ID comparison is secure and cannot be easily bypassed on the client-side. Server-side checks for API endpoints are crucial.
*   Error Handling: Plan for robust error handling in both frontend and backend components.
*   Scalability: For usage events, if the `usage_events` table grows very large, consider if direct `COUNT(*)` queries will be performant enough or if pre-aggregation might be needed in the future (out of scope for V1).

## 5. Next Steps (Post-Research)

1.  **Implement Backend API:** Create the API route and database queries.
2.  **Implement Frontend Data Fetching:** Create the React Query hook.
3.  **Update Sidebar:** Add the conditional link.
4.  **Create Super Admin Page:** Develop the new view/page component to display the stats.
5.  **Testing:** Thoroughly test access control and data accuracy. 