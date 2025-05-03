# Research: Wizard Slideshow Social Proof Widget

## 1. Problem Statement

Wizards can feel isolating. Showing users that others have successfully progressed through the same steps can increase motivation, build trust, and create a sense of community engagement (social proof).

Currently, the application lacks:

1.  A mechanism to store user display information (username, profile picture).
2.  An efficient way to query which users have reached or surpassed a specific step in a wizard.

## 2. Goal

Display a small, visually appealing widget within the user-facing `WizardSlideshowModal` that shows the profile pictures of a limited number of other users who have either:

a)  Completed the entire wizard.
b)  Reached the current step or a step further in their latest session.

## 3. Core Requirements & Data

*   **Target Users:**
    *   Users who have a completion record for the *entire* wizard (Mechanism TBD - assumed or needs definition, e.g., a separate `user_wizard_completions` table or status flag).
    *   Users whose entry in `user_wizard_sessions` for this `wizardId` points to a `last_viewed_step_id` that has a `step_order` greater than or equal to the current step's `step_order`.
*   **Required Data:** For each relevant user to display:
    *   `user_id`: To uniquely identify them.
    *   `profile_picture_url`: The URL for their avatar image.
    *   `username`: (Optional, for tooltips/accessibility) Their display name.

## 4. Proposed Solution: `user_profiles` Table & Dedicated API

To provide the necessary display data and efficiently query relevant users, we propose:

1.  **New Table (`user_profiles`):** Store basic, public-facing profile information.
2.  **New API Endpoint:** Create a dedicated endpoint to fetch the list of relevant users for the social proof widget based on the current step.

## 5. Database Schema: `user_profiles` Table

| Column                | Type          | Constraints/Defaults        | Description                                      |
| :-------------------- | :------------ | :-------------------------- | :----------------------------------------------- |
| `user_id`             | `text`        | NOT NULL, PRIMARY KEY       | Unique User ID (likely from auth provider, e.g., JWT `sub`) |
| `username`            | `text`        | NULL                        | User's display name                              |
| `profile_picture_url` | `text`        | NULL                        | URL to the user's avatar image                   |
| `updated_at`          | `timestamptz` | NOT NULL, DEFAULT `now()`   | When the profile was last updated                |

*   **Note on Population:** This table needs to be populated. This could happen:
    *   During user signup/login by fetching data from the auth provider.
    *   Through a dedicated user profile settings page.
    *   The population mechanism is outside the scope of building *this specific widget* but is a prerequisite.

## 6. API Endpoint: `GET /api/wizards/[wizardId]/steps/[stepId]/social-proof`

*   **Purpose:** Fetch a list of user profiles relevant for social proof display on a specific step.
*   **URL Parameters:**
    *   `wizardId`: The ID of the current wizard.
    *   `stepId`: The ID of the *current* step being viewed by the user.
*   **Authentication:** Required (fetch current user's ID to exclude them from results).
*   **Logic:**
    1.  Get current `userId` from auth context.
    2.  Get the `step_order` for the provided `stepId` and `wizardId` from `onboarding_steps`.
    3.  **Query 1 (Completed Users):** Find `user_id`s who have completed this `wizardId` (Requires a defined completion mechanism - Placeholder: `SELECT user_id FROM user_wizard_completions WHERE wizard_id = $1`).
    4.  **Query 2 (In-Progress Users):** Find `user_id`s from `user_wizard_sessions` where `wizard_id = $1` and their `last_viewed_step_id` corresponds to a step in `onboarding_steps` with `step_order >=` the current step's order.
        ```sql
        SELECT DISTINCT ses.user_id
        FROM user_wizard_sessions ses
        JOIN onboarding_steps st ON ses.last_viewed_step_id = st.id
        WHERE ses.wizard_id = $1 -- Current Wizard ID
          AND st.wizard_id = $1  -- Ensure step belongs to the same wizard
          AND st.step_order >= $2; -- Current Step Order
        ```
    5.  **Combine & Filter:** Combine unique `user_id`s from Query 1 and Query 2. Exclude the current `userId`.
    6.  **Limit & Order:** Apply a limit (e.g., `LIMIT 10`) and potentially an order (e.g., by session `updated_at` for recency, or randomly).
    7.  **Join with Profiles:** Join the final list of `user_id`s with the `user_profiles` table to retrieve `username` and `profile_picture_url`.
    8.  **Response (Success):** Return an array: `{ users: [{ user_id, username, profile_picture_url }, ...] }`
    9.  **Response (Error):** Standard errors (400, 401, 404, 500).

## 7. Frontend Implementation

*   **New Hook (`useWizardStepSocialProofQuery`):**
    *   Located likely in a new `src/hooks/useSocialProofQuery.ts` or similar.
    *   Takes `wizardId` and `currentStepId` as inputs.
    *   Calls the `GET /api/wizards/[wizardId]/steps/[stepId]/social-proof` endpoint.
    *   Returns the fetched `users` array, loading state, etc.
    *   Crucially, the `currentStepId` input needs to be dynamic, so the hook refetches when the step changes.
*   **New Component (`SocialProofWidget.tsx`):**
    *   Accepts the `users` array as a prop.
    *   Handles loading and empty states.
    *   Renders a small list/stack of user avatars (e.g., using `<Avatar>` component from `shadcn/ui`).
    *   Could include tooltips showing usernames on hover.
*   **Integration (`WizardSlideshowModal.tsx`):**
    *   Instantiate `useWizardStepSocialProofQuery` with the current `wizardId` and `currentStep.id`.
    *   Place the `<SocialProofWidget />` component in a suitable, consistent location within the modal (e.g., fixed in the footer, or below the main step content).
    *   Pass the fetched `users` data to the widget.

## 8. Performance & Scalability Considerations

*   **Database Indexing:** Ensure appropriate indexes exist on `user_wizard_sessions` (PK covers user/wizard, need index on `last_viewed_step_id`), `user_wizard_completions` (if used), and `user_profiles` (`user_id`).
*   **Query Optimization:** The combined query (especially Query 2 joining sessions and steps) could become slow with many users/sessions. Careful query planning is needed.
*   **Limiting Results:** Always apply a `LIMIT` in the API query to prevent returning excessive data.
*   **Caching:** Consider caching the API response on the frontend (React Query handles this) and potentially server-side if the data doesn't need to be absolutely real-time.

## 9. Alternatives Considered

*   **Fetching All Progress/Sessions Client-Side:** Retrieving all `user_wizard_progress` and `user_wizard_sessions` data to the client and filtering there would be highly inefficient and expose unnecessary data.
*   **Overloading Existing Tables:** As discussed previously, adding session data to `user_wizard_progress` or profile data directly to the auth user object complicates those schemas.

## 10. Recommendation

Creating the dedicated `user_profiles` table (assuming it doesn't exist in a similar form) and the specific API endpoint (`GET /api/wizards/[wizardId]/steps/[stepId]/social-proof`) offers the cleanest, most scalable, and maintainable approach for implementing the social proof widget. 