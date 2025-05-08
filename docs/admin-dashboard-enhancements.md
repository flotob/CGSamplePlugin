# Admin Dashboard Enhancements Research & Plan

## 1. Objective

To enhance the Admin Dashboard section of the OnBoard plugin by displaying relevant statistics and visualizations. This will provide community administrators with actionable insights into user engagement and wizard effectiveness within their specific community, based on data stored in the plugin's PostgreSQL database.

## 2. Proposed Stats & Visualizations (V1)

For an initial version (V1), we should focus on high-value, relatively easy-to-compute metrics:

**A. Key Performance Indicators (KPIs) - Displayed as Stat Cards:**

*   **Total Wizards:** Count of all wizards created for the community.
*   **Active Wizards:** Count of wizards currently marked as active.
*   **Total Completions (All Time):** Count of unique users who have completed at least one wizard.
*   **Total Credentials Linked:** Count of all linked credentials across all users (potentially filterable by type later, e.g., ENS).
*   **Images Generated (Optional):** Count of AI images generated (if this feature is heavily used).

**B. Visualizations (Charts):**

*   **Wizard Completions Over Time:** A bar or line chart showing the number of wizard completions per day for the last 30 days. This helps visualize trends in user onboarding activity.

## 3. Data Sources

These metrics will require querying the following tables:

*   `onboarding_wizards`: For total/active wizard counts (filtered by `community_id`).
*   `user_wizard_completions`: For total unique user completions (using `DISTINCT user_id`, filtered by wizards belonging to the `community_id`) and for the time-series data (grouping by `DATE(completed_at)`).
*   `user_linked_credentials`: For total linked credentials count (potentially requires joining with users/communities if not directly filterable, though filtering by `user_id`s within the community should work).
*   `generated_images`: For image generation counts (filtered by `community_id`).
*   `plans` & `communities`: To potentially display the current plan alongside usage stats (though this might be redundant with the dedicated billing section).

## 4. Implementation Plan

The implementation involves backend API work, frontend data fetching, and new UI components.

**Step 1: Backend API Endpoint (`GET /api/admin/dashboard-stats`)**

*   **File:** `src/app/api/admin/dashboard-stats/route.ts` (New file)
*   **Protection:** Use `withAuth(..., true)` for admin-only access.
*   **Logic:**
    *   Get `communityId` from `req.user.cid` (JWT claim).
    *   Execute multiple SQL queries against the PostgreSQL database (`@/lib/db`):
        *   `SELECT COUNT(*) as total_wizards FROM onboarding_wizards WHERE community_id = $1;`
        *   `SELECT COUNT(*) as active_wizards FROM onboarding_wizards WHERE community_id = $1 AND is_active = true;`
        *   `SELECT COUNT(DISTINCT user_id) as total_users_completed FROM user_wizard_completions WHERE wizard_id IN (SELECT id FROM onboarding_wizards WHERE community_id = $1);`
        *   `SELECT COUNT(*) as total_credentials_linked FROM user_linked_credentials WHERE user_id IN (...subquery for users in community...);` (Need to refine user filtering based on available data - maybe users who completed a wizard?).
        *   `SELECT COUNT(*) as total_images_generated FROM generated_images WHERE community_id = $1;`
        *   For the chart: `SELECT DATE(completed_at) as completion_date, COUNT(*) as completions FROM user_wizard_completions WHERE wizard_id IN (SELECT id FROM onboarding_wizards WHERE community_id = $1) AND completed_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(completed_at) ORDER BY completion_date ASC;`
    *   Aggregate the results into a single JSON response object, e.g.:
        ```json
        {
          "kpis": {
            "totalWizards": 10,
            "activeWizards": 8,
            "totalUsersCompleted": 150,
            "totalCredentialsLinked": 75,
            "totalImagesGenerated": 50
          },
          "completionsLast30Days": [
            { "date": "2024-01-01", "completions": 5 },
            { "date": "2024-01-02", "completions": 8 },
            // ... more data points ...
          ]
        }
        ```
*   **Error Handling:** Implement proper try/catch blocks for database queries.

**Step 2: Frontend Data Fetching Hook (`useAdminDashboardStatsQuery`)**

*   **File:** `src/hooks/useAdminDashboardStatsQuery.ts` (New file)
*   **Logic:**
    *   Use `useQuery` from `@tanstack/react-query`.
    *   Use `useAuth()` to get `decodedPayload` (for `communityId`).
    *   Use `useAuthFetch()` for making the authenticated request.
    *   **Query Key:** `['adminDashboardStats', communityId]`
    *   **Query Function:** Call `GET /api/admin/dashboard-stats` using `authFetch`.
    *   **Enablement:** Only enable the query if `communityId` is available and the user is an admin.
    *   Define a TypeScript interface for the expected API response structure.

**Step 3: Frontend UI Components**

*   **Main Container (`DashboardStatsSection.tsx`)**
    *   **File:** `src/components/admin/DashboardStatsSection.tsx` (New file)
    *   Uses `useAdminDashboardStatsQuery` to fetch data.
    *   Handles loading and error states.
    *   Arranges `StatCard` components (e.g., in a grid).
    *   Renders the `CompletionsChart` component, passing the time-series data.
*   **Stat Card (`StatCard.tsx`)**
    *   **File:** `src/components/admin/StatCard.tsx` (New file)
    *   A reusable component accepting props like `title`, `value`, `icon` (optional), `description` (optional).
    *   Uses `shadcn/ui Card` for styling.
    *   Displays the KPI data clearly.
*   **Completions Chart (`CompletionsChart.tsx`)**
    *   **File:** `src/components/admin/CompletionsChart.tsx` (New file)
    *   Takes the `completionsLast30Days` data array as a prop.
    *   Uses the chosen charting library (`recharts`) to render a bar or line chart.
    *   Needs to handle potential lack of data gracefully.

**Step 4: Charting Library Integration (`recharts`)**

*   **Rationale:** `recharts` is chosen for its React-centric approach, good documentation, component-based composition, and compatibility with Tailwind/shadcn styling.
*   **Installation:** Add the dependency: `npm install recharts`
*   **Usage (`CompletionsChart.tsx`):**
    *   Import necessary components from `recharts` (e.g., `ResponsiveContainer`, `BarChart`, `LineChart`, `Bar`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`).
    *   Structure the chart using these components.
    *   Map the `completionsLast30Days` data prop to the format expected by `recharts` (usually an array of objects).
    *   Example data structure for chart: `[{ date: 'Jan 01', completions: 5 }, { date: 'Jan 02', completions: 8 }]` (dates might need formatting for display).
    *   Use `ResponsiveContainer` to make the chart adapt to its parent container size.
    *   Configure axes, tooltips, and potentially legends for clarity.

**Step 5: Integrate into AdminView**

*   **File:** `src/components/AdminView.tsx`
*   Import `DashboardStatsSection`.
*   Modify the rendering logic for `activeSection === 'dashboard'`.
*   Replace or augment the current placeholder content (User Info, Friends, Roles cards) with the new `<DashboardStatsSection />`.
    *   *Decision:* For V1, maybe display the stats section *above* the existing cards for prominence.

## 5. Future Enhancements

*   More detailed credential linking stats (by type).
*   Wizard-specific completion rates and drop-off analysis.
*   Step type usage frequency.
*   Date range selection for charts.
*   More granular usage tracking (e.g., API calls if relevant).

## 6. Next Steps

1.  **Install Charting Library:** Run `npm install recharts`.
2.  **Implement Backend API:** Create `src/app/api/admin/dashboard-stats/route.ts` and implement the database queries and response structure.
3.  **Implement Frontend Hook:** Create `src/hooks/useAdminDashboardStatsQuery.ts`.
4.  **Implement UI Components:** Create `DashboardStatsSection.tsx`, `StatCard.tsx`, and `CompletionsChart.tsx`.
5.  **Integrate:** Add `DashboardStatsSection` to `AdminView.tsx`.
6.  **Test Thoroughly.** 