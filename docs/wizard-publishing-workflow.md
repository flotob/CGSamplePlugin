# Wizard Publishing Workflow - Research & Proposal

## 1. Goal

Implement a publishing workflow for onboarding wizards in the admin configuration view. This workflow distinguishes between "published" (active) and "unpublished" (inactive) wizards, defining specific allowed actions for each state to prevent accidental modification of live wizards.

## 2. Defined Workflow Rules

Based on the `is_active` flag in the `onboarding_wizards` table:

| State                  | `is_active` | Allowed Actions                         | Disallowed Actions |
| :--------------------- | :---------- | :-------------------------------------- | :----------------- |
| **Published**          | `true`      | Deactivate, Delete, Duplicate           | Edit               |
| **Unpublished (Draft)** | `false`     | Edit, Publish, Delete, Duplicate        | Deactivate         |

*   **Publish:** Set `is_active = true`.
*   **Deactivate:** Set `is_active = false`.
*   **Duplicate:** Create a new wizard record (`is_active = false`) and copy all associated steps from the original.
*   **Edit:** Allow opening the `WizardStepEditorPage`.
*   **Delete:** Remove the wizard and its associated steps (database cascade should handle this).

## 3. Current State Analysis (`WizardList.tsx`)

*   **Fetches Data:** Uses `useWizardsQuery()` which successfully retrieves wizard details including the `is_active` flag.
*   **Displays Status:** Correctly shows an "Active" or "Inactive" badge based on `is_active`.
*   **Current Actions:** Only allows "Edit" by making the entire wizard card clickable, calling `setEditingWizardId(wizard.id)`. No other action buttons exist. The edit action is currently allowed regardless of the `is_active` status.

## 4. Backend API Status & Plan

Based on analysis of `src/app/api/wizards/`:

*   **List Wizards (`GET /api/wizards`):** Exists and returns `is_active`.
*   **Create Wizard (`POST /api/wizards`):** Exists.
*   **Get Wizard Details (`GET /api/wizards/[id]`):** Exists.
*   **Update Wizard (`PUT /api/wizards/[id]`):** Exists. **Can be used for Publish/Unpublish** by sending `{ "is_active": boolean }` in the request body.
*   **Delete Wizard (`DELETE /api/wizards/[id]`):** Exists.
*   **Duplicate Wizard (`POST /api/wizards/[id]/duplicate`):** **Missing.** Needs to be created. Logic:
    1.  Verify original wizard (`id`) exists and belongs to admin's community.
    2.  Fetch original wizard details.
    3.  Fetch all associated steps (`SELECT * FROM onboarding_steps WHERE wizard_id = $1 ORDER BY step_order`).
    4.  Create new wizard record (`is_active = false`, name appending " (Copy)").
    5.  Loop through original steps, creating copies associated with the new wizard ID.
    6.  Return new wizard details.
*   **List/Create/Update/Delete Steps:** Endpoints for step management under `/api/wizards/[id]/steps/` and `/api/wizards/[id]/steps/[stepId]/` appear to exist.

## 5. Proposed Frontend Changes (`WizardList.tsx`)

*   **Remove Card Click:** Remove the `onClick` handler from the main `<Card>` element.
*   **Add Action Buttons:** Add buttons conditionally based on `wizard.is_active`:
    *   **If `wizard.is_active === true` (Published):**
        *   Button: "Deactivate" (calls `usePublishWizard` mutation with `wizardId` and `is_active: false`).
        *   Button: "Duplicate" (calls `useDuplicateWizard` mutation with `wizardId`).
        *   Button: "Delete" (calls `useDeleteWizard` mutation with `wizardId`).
        *   *No "Edit" button.*
    *   **If `wizard.is_active === false` (Unpublished):**
        *   Button: "Edit" (calls `setEditingWizardId(wizard.id)`).
        *   Button: "Publish" (calls `usePublishWizard` mutation with `wizardId` and `is_active: true`).
        *   Button: "Duplicate" (calls `useDuplicateWizard` mutation with `wizardId`).
        *   Button: "Delete" (calls `useDeleteWizard` mutation with `wizardId`).
*   **Implement/Update Mutation Hooks:**
    *   `usePublishWizard`: A mutation hook calling **`PUT /api/wizards/[id]`** with `{ is_active: boolean }`. Invalidate `['wizards']` query on success.
    *   `useDuplicateWizard`: A mutation hook calling **`POST /api/wizards/[id]/duplicate`**. Invalidate `['wizards']` query on success.
    *   `useDeleteWizard`: A mutation hook calling **`DELETE /api/wizards/[id]`**. Invalidate `['wizards']` query on success. (Need to verify if this hook already exists).
*   **Visual Styling:** Apply appropriate button styles.

## 6. Open Questions / Considerations

*   **Edit Prevention in Editor:** Simply disabling the "Edit" button in the list is the first step. Should `WizardStepEditorPage` *also* prevent saving changes if opened for an active wizard (e.g., if the user navigates there directly somehow)? This would require passing `is_active` to the editor or having the editor fetch it. Might be over-engineering for now.
*   **Error Handling:** Ensure mutations provide user feedback on errors (e.g., using `toast`).
*   **Confirmation Dialogs:** Add confirmation dialogs for destructive actions like "Delete" and potentially "Deactivate".
*   **Naming Duplicates:** Is appending " (Copy)" sufficient, or should the user be prompted for a name? Appending is simpler initially.

## 7. Next Steps

1.  **Create the backend API endpoint for duplicating wizards:** `POST /api/wizards/[id]/duplicate`.
2.  **Implement frontend mutation hooks:** `usePublishWizard`, `useDuplicateWizard`, and verify/create `useDeleteWizard`.
3.  **Refactor `WizardList.tsx`:** Remove card `onClick`, add conditional action buttons, and integrate the mutation hooks. 