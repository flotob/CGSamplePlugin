
You've brought up some excellent points that significantly enhance the "Sidequests" feature by making them reusable and introducing a library concept, much like your `ImageLibraryModal`. This is a smart evolution of the feature!

You're correct in your analysis:
*   **Current Limitation:** Sidequests are currently tied to a single `onboarding_step_id`, meaning they cannot be reused across different steps or wizards.
*   **No Public/Private Scopes:** There's no `is_public` flag or creator/community scoping on the `sidequests` table itself to facilitate a shared library ("My Library" / "Public Library") like the image system.
*   **Schema Implication:** To achieve reusability and library functionality, we need to decouple sidequests from specific steps and introduce a way to manage them globally (within a community) and then link them to steps.

This involves a schema change, API adjustments, and UI modifications. Here's a plan:

**Phase 1: Planning & Schema Changes**

1.  **Goal Confirmation:**
    *   Make sidequests reusable across multiple steps/wizards within a community.
    *   Introduce a "Sidequest Library" concept where admins can create/manage a pool of sidequests.
    *   Allow sidequests to be marked as "public" (shareable within their community) or remain "private" (creator's library).
    *   The `SidequestsLibraryModal` will need tabs/sections like "Attached to this Step", "My Sidequests", "Public Sidequests (Community)".

2.  **Proposed Database Schema Changes:**

    *   **`sidequests` Table (Refactored - Becomes a Global Library Table):**
        *   `id` (uuid, PK)
        *   `title` (text, NOT NULL)
        *   `description` (text, NULL)
        *   `image_url` (text, NULL)
        *   `sidequest_type` (text, NOT NULL, CHECK type IN ('youtube', 'link', 'markdown'))
        *   `content_payload` (text, NOT NULL)
        *   `creator_user_id` (text, NOT NULL) - Stores the ID of the admin who created it.
        *   `community_id` (text, NOT NULL, FK to `communities.id`) - Scopes the sidequest to a community.
        *   `is_public` (boolean, NOT NULL, DEFAULT false) - Whether it's visible in the community's public library.
        *   `created_at` (timestamptz, DEFAULT now(), NOT NULL)
        *   `updated_at` (timestamptz, DEFAULT now(), NOT NULL)
        *   **Removed:** `onboarding_step_id`, `display_order` (these are now contextual to the step linkage).

    *   **`onboarding_step_sidequests` (New Junction Table):**
        *   `id` (uuid, PK, DEFAULT `gen_random_uuid()`) - Optional, but good practice.
        *   `onboarding_step_id` (uuid, NOT NULL, FK to `onboarding_steps.id`, ON DELETE CASCADE)
        *   `sidequest_id` (uuid, NOT NULL, FK to `sidequests.id`, ON DELETE CASCADE)
        *   `display_order` (integer, NOT NULL, DEFAULT 0) - Order of this sidequest within this specific step.
        *   `attached_at` (timestamptz, DEFAULT now(), NOT NULL)
        *   **Constraints:**
            *   `UNIQUE (onboarding_step_id, sidequest_id)` - Prevents attaching the same sidequest multiple times to the same step.
            *   `UNIQUE (onboarding_step_id, display_order)` - Ensures unique ordering within a step's sidequests.

3.  **Database Migration Plan (`@migrations`):**
    A new migration file will be needed. The migration will be a multi-step process to preserve existing data:
    *   **UP Function:**
        1.  Create the new `sidequests_temp` table with the new schema (including `creator_user_id`, `community_id`, `is_public`).
        2.  Create the new `onboarding_step_sidequests` junction table.
        3.  **Data Migration - Populate `sidequests_temp`:**
            *   For each existing sidequest:
                *   `community_id`: Infer from `old_sidequests.onboarding_step_id -> onboarding_steps.wizard_id -> onboarding_wizards.community_id`.
                *   `creator_user_id`: This is tricky as we didn't store it. For existing sidequests, we might have to:
                    *   Assign a default admin user ID of the community.
                    *   Or, if your `user_profiles` table has a `community_id` and you can identify a primary admin, use that. For now, let's assume we'll use a placeholder or the ID of the admin running the migration if contextually available, otherwise, this needs a defined strategy.
                *   `is_public`: Default to `false`.
            *   `INSERT INTO sidequests_temp (id, title, ..., creator_user_id, community_id, is_public, created_at, updated_at) SELECT id, title, ..., {inferred_creator_id}, {inferred_community_id}, false, created_at, updated_at FROM sidequests_old;`
        4.  **Data Migration - Populate `onboarding_step_sidequests`:**
            *   `INSERT INTO onboarding_step_sidequests (onboarding_step_id, sidequest_id, display_order, attached_at) SELECT onboarding_step_id, id, display_order, created_at FROM sidequests_old;`
        5.  Drop the original `sidequests` table (`sidequests_old`).
        6.  Rename `sidequests_temp` to `sidequests`.
    *   **DOWN Function:** This would be complex and likely involve data loss of the new structure. A common strategy for such significant refactors is to back up the database before migration and, for the down function, revert to the old schema by creating the old `sidequests` table structure and potentially trying to repopulate it (which would be an inverse, lossy process for reusability). Often, for complex schema refactors, the `down` might just drop the new tables/columns and accept that a true rollback to preserve data perfectly is too hard.

**Phase 2: Backend API Refactoring**

*   **Global Sidequest Management (New Endpoints, e.g., under `/api/admin/library/sidequests`):**
    *   `POST /api/admin/library/sidequests`: Create a new sidequest in the admin's community library. (Payload: title, desc, image, type, content, is_public). `creator_user_id` and `community_id` come from `req.user`.
    *   `GET /api/admin/library/sidequests`: List sidequests from the library (params: `scope='mine'|'public'`).
    *   `PUT /api/admin/library/sidequests/{sidequestId}`: Update a sidequest in the library.
    *   `DELETE /api/admin/library/sidequests/{sidequestId}`: Delete from library. (Consider if it's attached to steps: maybe soft delete or prevent deletion if attached).
*   **Step-Specific Sidequest Management (Refactor existing `/api/admin/steps/{stepId}/sidequests/...` endpoints):**
    *   `GET /api/admin/steps/{stepId}/sidequests`: Now fetches sidequests *attached* to this step by joining through `onboarding_step_sidequests`.
    *   `POST /api/admin/steps/{stepId}/sidequests`: "Attach" an existing sidequest from the library to this step. (Payload: `{ sidequest_id: string, display_order?: number }`). Inserts into `onboarding_step_sidequests`.
    *   `DELETE /api/admin/steps/{stepId}/sidequests/{attachmentIdOrSidequestId}`: "Detach" a sidequest from this step (deletes from `onboarding_step_sidequests`).
    *   `POST /api/admin/steps/{stepId}/sidequests/reorder`: Updates `display_order` in `onboarding_step_sidequests`.

*   **User-Facing API (`/api/user/wizards/[id]/steps/route.ts`):**
    *   The SQL query will change to join `onboarding_steps` with `onboarding_step_sidequests`, then with `sidequests` to fetch the details of attached sidequests.

**Phase 3: Frontend UI Refactoring**

*   **`SidequestsLibraryModal.tsx`:**
    *   Will need a tabbed interface or segmented views:
        1.  **"Attached to Step":** Shows sidequests currently linked to `stepId`. Allows reordering (DND) and detaching. Has a button "Attach from Library."
        2.  **"My Library":** Shows sidequests where `creator_user_id == currentUser.id` and `community_id == currentCommunity.id`. Allows Create New, Edit, Delete (from library), Toggle Public.
        3.  **"Community Library":** Shows sidequests where `community_id == currentCommunity.id` and `is_public == true`.
    *   When "Attach from Library" is clicked (from "Attached to Step" tab), it might switch to "My Library" or "Community Library" view with an "Attach" button visible on items.
*   **`SidequestForm.tsx`:**
    *   When creating, it now calls the new "create global sidequest" API. `stepId` is no longer directly relevant to the form's submission for *creating* the sidequest itself, but the overall context (`wizardId` for `communityId`) is.
    *   `display_order` is removed from this form (it's set when attaching).
*   **React Query Hooks:** All existing sidequest admin hooks will need to be refactored or replaced to target the new API endpoints and handle the new data structures. New hooks for managing the global library will be needed.

**Summary & Recommendation:**

This is a significant refactor that greatly enhances the feature. It touches every layer of the application.

**Recommended Next Steps (Phased Approach for this Refactor):**

1.  **Finalize Schema & Migration Details:**
    *   Confirm the strategy for `creator_user_id` for existing sidequests.
    *   Write the detailed migration script (`UP` function).
2.  **Implement Backend Changes (Phase 2):**
    *   Run the database migration.
    *   Refactor/create the new Admin API endpoints.
    *   Update the user-facing API endpoint for fetching steps.
3.  **Implement Frontend Changes (Phase 3):**
    *   Refactor React Query hooks.
    *   Overhaul `SidequestsLibraryModal.tsx` to support the tabbed/multi-view library interface.
    *   Adjust `SidequestForm.tsx` and `SidequestAdminListItem.tsx` as needed.

This is a substantial piece of work. Given its scope, it might be best to tackle it as a distinct feature update. The immediate "it works but it's not perfect yet" issues you mentioned are directly addressed by this more robust, reusable design.

What are your thoughts on this plan? Are you ready to dive into the details of the migration script first, particularly how to handle `creator_user_id` for existing sidequests?


# types

You are absolutely correct! I jumped ahead to the implementation details without fully speccing out the necessary type updates based on the new schema and API structures. My apologies.

Let's detail the type changes and new types needed.

**1. `src/types/sidequests.ts` (or a central types file)**

*   **`Sidequest` (Refactored - Represents a Global Library Sidequest):**
    This interface will be updated to reflect the new `sidequests` table schema.

    ```typescript
    export interface Sidequest { // Renamed from GlobalSidequest for simplicity if this is the primary Sidequest type
      id: string; // uuid, PK
      title: string;
      description: string | null;
      image_url: string | null;
      sidequest_type: 'youtube' | 'link' | 'markdown';
      content_payload: string;
      creator_user_id: string; 
      community_id: string;
      is_public: boolean;
      created_at: string; // timestamptz (ISO string format)
      updated_at: string; // timestamptz (ISO string format)
    }
    ```
    *   **Removed:** `onboarding_step_id`, `display_order`.
    *   **Added:** `creator_user_id`, `community_id`, `is_public`.

*   **`AttachedSidequest` (New - Represents a Sidequest linked to a Step with its context):**
    This type will be used when fetching sidequests for a specific step, including the junction table data.

    ```typescript
    export interface AttachedSidequest extends Sidequest { // Extends the global Sidequest
      attachment_id: string; // uuid, PK of the onboarding_step_sidequests junction table record
      onboarding_step_id: string; // The step it's attached to
      display_order: number;      // Its order within that specific step
      attached_at: string;        // timestamptz (ISO string format)
    }
    ```
    *This type will be returned by `GET /api/admin/steps/{stepId}/sidequests` and used by `useGetStepAttachedSidequests`.*

*   **Payload Types for New Global Library Admin APIs:**
    These would typically be co-located with the React Query hooks for those APIs (e.g., in `src/hooks/useSidequestLibraryAdmin.ts`) or defined here if preferred for centralization.

    ```typescript
    // For POST /api/admin/library/sidequests (Create Global Sidequest)
    export interface CreateGlobalSidequestPayload {
      title: string;
      description?: string | null;
      image_url?: string | null;
      sidequest_type: 'youtube' | 'link' | 'markdown';
      content_payload: string;
      is_public?: boolean; // Defaults to false on backend
    }

    // For PUT /api/admin/library/sidequests/{sidequestId} (Update Global Sidequest)
    export interface UpdateGlobalSidequestPayload {
      title?: string;
      description?: string | null;
      image_url?: string | null;
      sidequest_type?: 'youtube' | 'link' | 'markdown';
      content_payload?: string;
      is_public?: boolean;
    }
    ```

*   **Payload Types for Refactored Step-Specific Admin APIs:**
    Again, can be co-located with hooks or defined here.

    ```typescript
    // For POST /api/admin/steps/{stepId}/sidequests (Attach Sidequest to Step)
    export interface AttachSidequestToStepPayload {
      sidequest_id: string; // ID of the global sidequest to attach
      display_order?: number; // Optional, backend can determine if not provided
    }

    // For POST /api/admin/steps/{stepId}/sidequests/reorder (Reorder Attached Sidequests)
    // This can reuse ReorderSidequestsPayloadItem if we make attachment_id optional
    // or define a specific one. Let's assume it might be slightly different for clarity:
    export interface ReorderAttachedSidequestItem {
      attachment_id: string; // PK of the junction table record
      display_order: number;
    }
    export interface ReorderAttachedSidequestsPayload extends Array<ReorderAttachedSidequestItem> {}

    // Response type for attaching a sidequest (returns the junction table record or the attached sidequest details)
    export interface AttachSidequestResponse { // Or could be AttachedSidequest directly
        id: string; // attachment_id
        onboarding_step_id: string;
        sidequest_id: string;
        display_order: number;
        attached_at: string;
    }
    ```

**2. `src/app/api/user/wizards/[id]/steps/route.ts`**

*   The `UserStepProgress` interface will need to ensure its `sidequests` field now uses the refactored `Sidequest` type (which represents the global sidequest details). The `json_agg` in the SQL query for this endpoint will directly return an array of these global `Sidequest` objects.

    ```typescript
    // In src/app/api/user/wizards/[id]/steps/route.ts
    import type { Sidequest } from '@/types/sidequests'; // Updated path

    export interface UserStepProgress extends Step {
      // ... other fields
      sidequests: Sidequest[] | null; // This now correctly refers to the global Sidequest details
                                     // The display_order for these within the step context is implicit
                                     // from the ORDER BY in the json_agg subquery.
    }
    ```
    *The `RawStepProgressRow` within this file would also be updated to expect `sidequests: Sidequest[] | null`.*

**3. React Query Hook Types (Updates to existing and for new hooks)**

*   **`src/hooks/useSidequestAdminQueries.ts` -> `src/hooks/useStepAttachedSidequestQueries.ts` (or similar rename)**
    *   `useGetStepAttachedSidequests` (replaces `useGetStepSidequests`):
        *   Returns `UseQueryResult<AttachedSidequest[], Error>`.
        *   Query key factory `stepAttachedSidequestQueryKeys.all(stepId)`.

*   **`src/hooks/useSidequestAdminMutations.ts` -> `src/hooks/useStepAttachedSidequestMutations.ts`**
    *   `useAttachSidequestToStepMutation`:
        *   Takes `AttachSidequestToStepPayload`.
        *   Returns `UseMutationResult<AttachSidequestResponse, Error, AttachSidequestToStepPayload>`.
    *   `useDetachSidequestFromStepMutation`:
        *   Variables: `{ stepId: string; attachmentId: string; }`. (attachmentId is PK of junction table row).
        *   Returns `UseMutationResult<{ id: string }, Error, { stepId: string; attachmentId: string; }>`.
    *   `useReorderStepSidequestsMutation`:
        *   Takes `ReorderAttachedSidequestsPayload`.
        *   Returns `UseMutationResult<{ message: string; sidequests: AttachedSidequest[] }, Error, ReorderAttachedSidequestsPayload>`.

*   **New: `src/hooks/useSidequestLibraryAdminHooks.ts` (or similar)**
    *   `useGetSidequestLibrary`:
        *   Variables: `scope: 'mine' | 'community' | 'all'`.
        *   Returns `UseQueryResult<Sidequest[], Error>`.
    *   `useCreateGlobalSidequestMutation`:
        *   Takes `CreateGlobalSidequestPayload`.
        *   Returns `UseMutationResult<Sidequest, Error, CreateGlobalSidequestPayload>`.
    *   `useUpdateGlobalSidequestMutation`:
        *   Variables: `{ sidequestId: string; payload: UpdateGlobalSidequestPayload }`.
        *   Returns `UseMutationResult<Sidequest, Error, { sidequestId: string; payload: UpdateGlobalSidequestPayload }>`.
    *   `useDeleteGlobalSidequestMutation`:
        *   Variables: `{ sidequestId: string }`.
        *   Returns `UseMutationResult<{ id: string }, Error, { sidequestId: string }>`.
    *   `useToggleSidequestPublicMutation` (New, for making a library sidequest public/private):
        *   Variables: `{ sidequestId: string; is_public: boolean }`.
        *   Returns `UseMutationResult<Sidequest, Error, { sidequestId: string; is_public: boolean }>`.
        *   This would call a new API endpoint like `PATCH /api/admin/library/sidequests/{sidequestId}/toggle-public`.

**4. UI Component Prop Types**

*   **`SidequestsLibraryModal.tsx`:**
    *   Will use `AttachedSidequest[]` for the "Attached to Step" list.
    *   Will use `Sidequest[]` for "My Library" and "Community Library" lists.
*   **`SidequestAdminListItem.tsx`:**
    *   Will need a prop to distinguish its context (e.g., `viewMode: 'attached' | 'myLibrary' | 'communityLibrary'`).
    *   Its `sidequest` prop might be `Sidequest | AttachedSidequest` and it would render fields like `display_order` and actions like "Detach" only if it's an `AttachedSidequest` in the 'attached' view.
*   **`SidequestForm.tsx`:**
    *   `existingSidequest` prop would now be of type `Sidequest | null` (representing a global sidequest).
    *   Payloads it constructs will be `CreateGlobalSidequestPayload` or `UpdateGlobalSidequestPayload`.

