# Research: Wizard Resume Logic Enhancement

## 1. Problem Statement

Currently, the `WizardSlideshowModal` determines the user's starting/current step by finding the first step in the fetched list that does not have a `completed_at` timestamp in the `user_wizard_progress` table.

This approach has limitations:

*   **Ambiguity with Auto-Completing Steps:** Steps like the 'content' slide auto-complete immediately. If a user views such a step and closes the modal, upon reopening, the logic sees it as completed and incorrectly jumps the user to the *next* incomplete step, rather than resuming on the content slide they were viewing.
*   **Navigation Before Closing:** If a user navigates back to a previously completed step and then closes the modal, the current logic will still resume them at the first *incomplete* step, not the completed step they were last viewing.
*   **Complexity:** The `useEffect` hook managing this logic becomes complex as it tries to infer user intent (starting vs. resuming) solely from completion data.

## 2. Goal

*   Reliably resume the user on the *exact step* they were last viewing within a specific wizard session, regardless of the step's completion status or type.
*   Decouple the logic for step completion from the logic for session navigation and resumption.
*   Provide a smoother and more intuitive user experience.

## 3. Proposed Solution: `user_wizard_sessions` Table

Introduce a new database table specifically designed to track the user's session state within each wizard.

**Schema:** `user_wizard_sessions`

| Column                | Type          | Constraints/Defaults                   | Description                                         |
| :-------------------- | :------------ | :------------------------------------- | :-------------------------------------------------- |
| `user_id`             | `text`        | NOT NULL                               | Foreign Key (Implicit) to User ID                   |
| `wizard_id`           | `uuid`        | NOT NULL, FK to `onboarding_wizards` | Foreign Key to the Wizard ID                  |
| `last_viewed_step_id` | `uuid`        | NOT NULL, FK to `onboarding_steps`   | Foreign Key to the last Step ID the user viewed |
| `updated_at`          | `timestamptz` | NOT NULL, DEFAULT `now()`              | Timestamp of the last update to this session      |
| **Primary Key**       | (`user_id`, `wizard_id`) |                                        | Ensures one session record per user per wizard    |

**Logic Flow:**

1.  **Wizard Opens:**
    *   Frontend fetches the user's session record for the specific `wizardId` from the new API (`GET /api/user/wizards/[wizardId]/session`).
    *   If a record exists and contains a valid `last_viewed_step_id`, the frontend finds the corresponding step in the fetched `steps` list and sets the initial `currentStepIndex` accordingly.
    *   If no record exists (or `last_viewed_step_id` is invalid), the frontend defaults to the first step (index 0).
2.  **User Navigates / Step Changes:**
    *   Whenever `currentStepIndex` changes in the frontend (due to Next/Previous clicks or other logic), a `useEffect` triggers.
    *   This effect calls a mutation (`PUT /api/user/wizards/[wizardId]/session`) to update (or insert if it's the first interaction) the `last_viewed_step_id` and `updated_at` for the current user and wizard in the `user_wizard_sessions` table.

## 4. API Changes

*   **`GET /api/user/wizards/[wizardId]/session`:**
    *   **Purpose:** Retrieve the last viewed step ID for the current user and wizard.
    *   **Auth:** Required.
    *   **Logic:** `SELECT last_viewed_step_id FROM user_wizard_sessions WHERE user_id = $1 AND wizard_id = $2`.
    *   **Response:** `{ last_viewed_step_id: string | null }` or 404 if no record.
*   **`PUT /api/user/wizards/[wizardId]/session`:**
    *   **Purpose:** Update or insert (UPSERT) the last viewed step ID.
    *   **Auth:** Required.
    *   **Request Body:** `{ "stepId": "..." }`
    *   **Logic:** Use an `UPSERT` statement:
        ```sql
        INSERT INTO user_wizard_sessions (user_id, wizard_id, last_viewed_step_id, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, wizard_id) 
        DO UPDATE SET 
          last_viewed_step_id = EXCLUDED.last_viewed_step_id, 
          updated_at = NOW();
        ```
        *   Ensure the provided `stepId` exists in the `onboarding_steps` table for the given `wizardId` before performing the UPSERT.
    *   **Response:** 200 OK on success, standard errors otherwise.

## 5. Frontend Changes (`WizardSlideshowModal.tsx`)

*   **New State/Queries:**
    *   Add `useUserWizardSessionQuery` to fetch data from the `GET` endpoint.
    *   Add `useUpdateUserWizardSessionMutation` to call the `PUT` endpoint.
*   **Initial Load Logic (`useEffect`):**
    *   Modify the existing effect that determines the start index.
    *   Prioritize setting `currentStepIndex` based on the `last_viewed_step_id` fetched from `useUserWizardSessionQuery`.
    *   Only fall back to finding the first incomplete step or index 0 if the session query returns no data or an invalid ID.
*   **Update Session Logic (`useEffect`):**
    *   Create a new `useEffect` hook that depends on `currentStepIndex` (or more precisely, `currentStep?.id`).
    *   When `currentStep?.id` changes and is valid, call `updateUserWizardSessionMutation.mutate({ stepId: currentStep.id })`. Debouncing this mutation might be useful if navigation is rapid.
*   **Simplification:** The old `useEffect` logic relying solely on `completed_at` can likely be significantly simplified or removed, as the session state now dictates the resume point.

## 6. Alternative Considered: Overloading `user_wizard_progress`

*   **Method:** Add a `last_viewed_at` timestamp column to `user_wizard_progress`. Find the record with the latest `last_viewed_at` for the user/wizard to determine the resume step.
*   **Drawbacks:**
    *   Mixes completion tracking with session state, muddying the table's purpose.
    *   Requires potentially complex queries to find the single latest record across all steps.
    *   Doesn't elegantly handle the case where the user last viewed a step *before* completing it.
    *   Less explicit and harder to reason about.

## 7. Recommendation

Creating the dedicated `user_wizard_sessions` table is the recommended approach. It provides a clear separation of concerns, simplifies the logic for resuming sessions, and offers a more robust and maintainable solution compared to overloading the existing progress table or relying solely on completion timestamps. 