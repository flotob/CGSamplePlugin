# Research Document: Sidequests Feature

## 1. Introduction & Concept Overview

### What are Sidequests?
Sidequests are supplementary content or tasks that a wizard administrator can attach to any step within an onboarding wizard. They are designed to provide users with additional context, resources, or activities that can help them understand or complete the main wizard step.

### Purpose and User Benefit
The primary purpose of Sidequests is to:
- Offer deeper dives into topics related to a wizard step.
- Provide alternative ways to understand concepts (e.g., video, article).
- Enable users to acquire knowledge or tools necessary for step completion (especially for quiz-like steps).
- Enhance user engagement by offering optional, related content.

### Core Components
A Sidequest is defined by:
-   **Content Type:**
    *   A YouTube video link.
    *   A link to an external blog post or article.
    *   A Markdown blob (effectively an embedded article/document).
-   **Metadata:**
    *   An illustrative image.
    *   A clear title.
    *   A brief description.

## 2. Data Model

To store Sidequests, a new database table is proposed:

**Table Name:** `sidequests`

**Columns:**

| Column Name          | Data Type        | Constraints & Notes                                                                      |
| -------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `id`                 | `uuid`           | Primary Key, `DEFAULT gen_random_uuid()`                                                 |
| `onboarding_step_id` | `uuid`           | Foreign Key to `onboarding_steps.id` (ON DELETE CASCADE), NOT NULL                       |
| `title`              | `text`           | NOT NULL                                                                                 |
| `description`        | `text`           | Nullable                                                                                 |
| `image_url`          | `text`           | Nullable. URL for the sidequest's image. For MVP, a direct URL.                          |
| `sidequest_type`     | `text`           | NOT NULL, `CHECK (sidequest_type IN ('youtube', 'link', 'markdown'))`                    |
| `content_payload`    | `text`           | NOT NULL. Stores the YouTube URL, external link URL, or the Markdown text.               |
| `display_order`      | `integer`        | NOT NULL, `DEFAULT 0`. Used for ordering sidequests within a step's playlist.            |
| `created_at`         | `timestamptz`    | `DEFAULT now()`, NOT NULL                                                                |
| `updated_at`         | `timestamptz`    | `DEFAULT now()`, NOT NULL                                                                |

**Relationships:**
-   Each `sidequest` record belongs to one `onboarding_step`.
-   An `onboarding_step` can have multiple `sidequests`.

**Indexes:**
-   Primary Key on `id`.
-   Foreign Key index on `onboarding_step_id`.
-   Unique index on `(onboarding_step_id, display_order)` to ensure consistent ordering.
-   Index on `(onboarding_step_id, sidequest_type)` might be useful for specific queries.

**Triggers/Defaults:**
-   `created_at` and `updated_at` will use `DEFAULT now()`. `node-pg-migrate` handles `updated_at` updates automatically by default for tables with an `updated_at` column when using `pgm.alterTable` or through explicit triggers if needed, but `DEFAULT now()` covers creation and explicit updates in queries will handle modification time. Standard practice is to ensure application logic or ORM handles `updated_at` on updates, or use a database trigger if that's the established pattern. Given the schema, `DEFAULT now()` is for creation, and application logic will handle updates to this field.

## 3. Admin Experience (Wizard & Step Configuration)

The admin UI for managing Sidequests will be integrated into the existing `StepEditor` via a modal experience.

### UI in Step Editor (`StepEditor.tsx`)
-   **New Section:** A dedicated "Sidequests" accordion item within the step configuration area.
-   **Trigger Button:** This accordion item will contain a button, e.g., "Manage Sidequests".
-   **Optional Summary:** A brief summary might be displayed here, like "3 sidequests attached" or a list of the first few titles. (Further detail for this summary can be decided during UI implementation).
-   **Modal Invocation:** Clicking the "Manage Sidequests" button will open the `SidequestsLibraryModal.tsx`.

### `SidequestsLibraryModal.tsx` (New Modal Component)
This modal is the central hub for managing all sidequests associated with a specific step.
-   **Invocation:** Opened from `StepEditor.tsx`.
-   **Content:**
    *   Displays a list of all existing sidequests for the current step using `SidequestAdminListItem.tsx` components.
    *   Supports drag-and-drop reordering of these items.
    *   Includes an "Add New Sidequest" button.
    *   When creating a new sidequest or editing an existing one, the `SidequestForm.tsx` will be rendered (likely within this same modal, perhaps replacing the list view or in a sub-section).
-   **Data:** Fetches and manages its own list of sidequests via React Query hooks.

### Sidequest Creation/Editing Form (`SidequestForm.tsx`)
This form will appear when an admin adds a new sidequest (via the "Add New" button in `SidequestsLibraryModal`) or edits an existing one (via the "Edit" button on a `SidequestAdminListItem` within the modal).
-   **Rendering Context:** Rendered inside `SidequestsLibraryModal.tsx`.
-   **Fields:**
    *   `Title` (text input, required)
    *   `Description` (textarea, optional)
    *   `Image`: A button to "Choose or Generate Image" which will open the `ImageLibraryModal`. A preview of the selected image will be shown. The `image_url` itself will be stored.
    *   `Sidequest Type` (dropdown/radio buttons: "YouTube", "Link", "Markdown", required)
-   **Conditional `Content Payload` Input (based on `Sidequest Type`):**
    *   **YouTube:** Text input for "YouTube Video URL". Validation for valid YouTube URL format.
    *   **Link:** Text input for "External Content URL". Validation for valid URL format.
    *   **Markdown:** A larger textarea for "Markdown Content". A live preview panel for the Markdown would be beneficial.

### Image Handling
-   Sidequest images will be managed using the existing `ImageLibraryModal` component. This allows admins to select from previously uploaded/generated images (scoped to their community) or generate new images using AI (DALL·E 3 via OpenAI API).
-   The `SidequestForm` will include a button to launch the `ImageLibraryModal`.
-   When an image is selected or generated via the modal, its `storage_url` will be returned and stored as the `image_url` for the sidequest.
-   The `ImageLibraryModal` will be passed necessary context, such as `wizardId` (to determine `communityId` for image scoping and quota checks if new images are generated), and potentially `stepId` or `sidequestId` if finer-grained association for generated images is desired in the future (though `communityId` derived from `wizardId` is the primary scope for `generated_images` table).

## 4. User Experience (Wizard Slideshow)

Sidequests will be displayed within the `WizardSlideshowModal` to provide readily accessible supplementary material.

### Display (`WizardSlideshowModal.tsx`)
-   **"Playlist" UI:** A vertical list/panel anchored to the right edge of the slideshow modal.
    *   This panel should be scrollable if the number of sidequests exceeds the available vertical space.
    *   Each sidequest item in the playlist should display:
        *   Its `image_url` (thumbnail).
        *   Its `title`.
        *   A snippet of its `description` (optional, on hover or truncated).
-   The playlist should be visually distinct but harmonious with the overall modal design.

### Interaction
When a user clicks on a sidequest item in the playlist:

-   **YouTube:**
    *   The YouTube video should open in a modal dialog *within* the application (e.g., using `react-youtube` or a similar library). This keeps the user within the wizard's context.
    *   The modal should allow closing to return to the current wizard step.
-   **Link (External Blog Post/Article):**
    *   The link should open in a new browser tab (`target="_blank"`). This is standard behavior for external links.
-   **Markdown:**
    *   The rendered Markdown content should be displayed in a modal dialog, similar to the YouTube player.
    *   The modal should be scrollable for longer content and provide a close button.

**Note on Progress:** For the MVP, interacting with or completing a sidequest will **not** be tracked and will not directly affect wizard progression or step completion. They are purely supplementary.

## 5. API Design

API endpoints will be needed for both admin management and user-facing display. All admin endpoints must be protected by `withAuth` and follow the established `/api/admin/...` path structure. User-facing data will be integrated into existing data retrieval endpoints for steps.

### Admin Endpoints
The API paths for admin operations will be structured under `/api/admin/steps/{stepId}/sidequests` to align with managing sub-resources of a step.

-   **`POST /api/admin/steps/{stepId}/sidequests`**
    *   Action: Create a new sidequest associated with `stepId`.
    *   Request Body: `title`, `description`, `image_url`, `sidequest_type`, `content_payload`, `display_order`.
    *   Response: The created sidequest object.
-   **`GET /api/admin/steps/{stepId}/sidequests`**
    *   Action: Retrieve all sidequests for `stepId` (for admin editing UI).
    *   Response: An array of sidequest objects, ordered by `display_order`.
-   **`PUT /api/admin/steps/{stepId}/sidequests/{sidequestId}`**
    *   Action: Update an existing sidequest.
    *   Request Body: Fields to update (e.g., `title`, `description`, `image_url`, `sidequest_type`, `content_payload`, `display_order`).
    *   Response: The updated sidequest object.
-   **`DELETE /api/admin/steps/{stepId}/sidequests/{sidequestId}`**
    *   Action: Delete a sidequest.
    *   Response: Success/failure status.
-   **`POST /api/admin/steps/{stepId}/sidequests/reorder` (Batch Update)**
    *   Action: Update the `display_order` for multiple sidequests of a given step.
    *   Request Body: An array of `{ sidequestId: string, display_order: number }`.
    *   Response: Success/failure status or list of updated sidequests.

#### Implementation Notes for Admin Endpoints:
-   **Authentication & Authorization:** All endpoints will be wrapped with the `withAuth(handler, true)` higher-order component to ensure only authenticated administrators can access them. The `req.user` object (containing `userId`, `communityId`, `isAdmin`) will be available.
-   **Database Interaction:** Use the existing database utility functions (e.g., `query` from `src/lib/db.ts` if that's the pattern) for interacting with the PostgreSQL database.
-   **Error Handling:** Implement robust error handling, returning appropriate HTTP status codes (e.g., 400 for bad requests, 401/403 for auth issues, 404 for not found, 500 for server errors).
-   **Input Validation:** Use a library like `zod` (already a dependency) for validating request bodies against expected schemas. This will be crucial for type safety and preventing invalid data.

**Example Structure for `POST /api/admin/steps/{stepId}/sidequests`:**
```typescript
// src/app/api/admin/steps/[stepId]/sidequests/route.ts
import { withAuth } from '@/lib/withAuth';
import { query } from '@/lib/db'; // Assuming db utility
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createSidequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  sidequest_type: z.enum(['youtube', 'link', 'markdown']),
  content_payload: z.string().min(1),
  display_order: z.number().int().min(0).optional().default(0),
});

export const POST = withAuth(async (req: NextRequest, { params }: { params: { stepId: string } }) => {
  try {
    const { communityId } = req.user; // Ensure admin is operating within their community context
    const { stepId } = params;
    const body = await req.json();

    const validation = createSidequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const { title, description, image_url, sidequest_type, content_payload, display_order } = validation.data;

    // TODO: Verify that the stepId belongs to the admin's communityId for authorization

    const result = await query(
      `INSERT INTO sidequests (onboarding_step_id, title, description, image_url, sidequest_type, content_payload, display_order, community_id_context) -- Assuming community_id_context for audit/scoping if needed
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [stepId, title, description, image_url, sidequest_type, content_payload, display_order, communityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to create sidequest' }, { status: 500 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sidequest:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // true for adminOnly

// GET handler for this route would fetch all sidequests for a given stepId
export async function GET(req: NextRequest, { params }: { params: { stepId: string } }) { /* ... */ }
```

**Structure for `PUT /api/admin/steps/{stepId}/sidequests/{sidequestId}` and `DELETE` would follow a similar pattern,** using `sidequestId` from `params` for targeting specific records and validating ownership/permissions.

**For `POST /api/admin/steps/{stepId}/sidequests/reorder`:**
- This will likely involve a transaction to update multiple `display_order` values atomically.
- The request body would be an array of `({ sidequestId: string, display_order: number })`.

### User-Facing Data Retrieval
-   Sidequest data for users will be included when fetching the details of an `onboarding_step`.
-   The existing API endpoint that serves step data to the `WizardSlideshowModal` (likely under `/api/onboarding/wizards/.../steps/{stepId}` or similar user-facing path, or directly when fetching a wizard and its steps) should be modified.
-   This modification will involve a `LEFT JOIN` from `onboarding_steps` to the new `sidequests` table on `onboarding_steps.id = sidequests.onboarding_step_id`.
-   The results should be aggregated (e.g., using `json_agg` in PostgreSQL or processed in the application layer) to nest an array of sidequest objects within each step object.
-   Ensure the sidequests are ordered by `display_order`.

**Conceptual SQL modification for fetching steps with sidequests:**
```sql
SELECT
  os.*, -- all columns from onboarding_steps
  (
    SELECT json_agg(sq.* ORDER BY sq.display_order ASC)
    FROM sidequests sq
    WHERE sq.onboarding_step_id = os.id
  ) as sidequests
FROM onboarding_steps os
WHERE os.wizard_id = $1 -- or other relevant filters for fetching steps
ORDER BY os.step_order ASC;
```
This approach ensures that sidequest data is efficiently fetched along with the step data, minimizing additional database queries from the client or API layer.

Example (conceptual modification to step data response):
```json
{
  "id": "step-uuid",
  "wizard_id": "wizard-uuid",
  "step_type_id": "type-uuid",
  "config": { "...step config..." },
  // ... other step fields ...
  "sidequests": [
    {
      "id": "sidequest1-uuid", // uuid
      "onboarding_step_id": "step-uuid", // uuid
      "title": "Watch: Intro to Topic X",
      "description": "A quick video explaining the basics.", // nullable
      "image_url": "https://example.com/image1.jpg", // nullable
      "sidequest_type": "youtube", // 'youtube' | 'link' | 'markdown'
      "content_payload": "https://www.youtube.com/watch?v=VIDEO_ID",
      "display_order": 0,
      "created_at": "2023-01-01T12:00:00Z", // timestamptz (ISO string)
      "updated_at": "2023-01-01T12:00:00Z"  // timestamptz (ISO string)
    },
    {
      "id": "sidequest2-uuid",
      "onboarding_step_id": "step-uuid",
      "title": "Read: Advanced Details",
      "description": "An in-depth article.",
      "image_url": "https://example.com/image2.jpg",
      "sidequest_type": "link",
      "content_payload": "https://example.com/blog-post",
      "display_order": 1,
      "created_at": "2023-01-02T14:30:00Z",
      "updated_at": "2023-01-02T15:00:00Z"
    }
    // ... more sidequests or null if none
  ]
}
```
This approach ensures that sidequest data is efficiently fetched along with the step data, minimizing additional database queries from the client or API layer.

## 6. Backend Implementation Details

### Database Migrations
-   Create the `sidequests` table using `node-pg-migrate`.
-   The migration will define columns, primary key, foreign key to `onboarding_steps` with `ON DELETE CASCADE`.
-   A `CHECK` constraint for `sidequest_type` values (`youtube`, `link`, `markdown`).
-   Indexes: on `onboarding_step_id` and a unique index on `(onboarding_step_id, display_order)`.
-   `created_at` and `updated_at` columns with `DEFAULT now()`.

The migration script will look similar to this:

```javascript
// Placeholder for actual migration script content
// Filename: YYYYMMDDHHMMSS_create_sidequests_table.js

exports.shorthands = {
  // uuid: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') }, // Example if needed, but usually defined per column
};

exports.up = pgm => {
  pgm.createTable('sidequests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    onboarding_step_id: {
      type: 'uuid',
      notNull: true,
      references: 'onboarding_steps(id)', // Shorthand for foreign key
      onDelete: 'CASCADE',
    },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    image_url: { type: 'text' },
    sidequest_type: {
      type: 'text',
      notNull: true,
      check: "sidequest_type IN ('youtube', 'link', 'markdown')"
    },
    content_payload: { type: 'text', notNull: true },
    display_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('sidequests', 'onboarding_step_id');
  pgm.createIndex('sidequests', ['onboarding_step_id', 'display_order'], { unique: true });
  // Optional: pgm.createIndex('sidequests', ['onboarding_step_id', 'sidequest_type']);
};

exports.down = pgm => {
  pgm.dropTable('sidequests');
};
```
This detailed script needs to be placed in a new migration file in the `migrations/` directory.

### Validation (in API route handlers)
-   **Input Validation (Zod):**
    *   Use `zod` schemas (as shown in the API example) for all incoming request bodies for admin endpoints.
    *   `title`: `string().min(1)`
    *   `description`: `string().optional()`
    *   `image_url`: `string().url().optional().or(z.literal(''))` (Allow empty string if admin wants to clear it, or ensure UI sends null).
    *   `sidequest_type`: `z.enum(['youtube', 'link', 'markdown'])`
    *   `content_payload`:
        *   For `youtube`: `z.string().url().regex(/^(https?:\/\/)?(www\\.)?(youtube\\.com|youtu\\.?be)\/.+$/)` (Basic YouTube URL regex).
        *   For `link`: `z.string().url()`
        *   For `markdown`: `z.string().min(1)` (Potentially add max length).
    *   `display_order`: `z.number().int().min(0)`
-   **Authorization/Ownership:**
    *   Verify that the `stepId` (and implicitly `wizardId`) belongs to the `communityId` of the authenticated admin to prevent cross-community data manipulation.
    *   This typically involves fetching the parent step or wizard and checking its `community_id` against `req.user.communityId`.
-   **Type-Payload Consistency:** While `zod` can handle some of this with discriminated unions if we structure the schema that way, explicit checks might be clearer if the payload field is generic. The `sidequest_type` enum in the schema helps enforce this at a basic level.

### Security
-   **Markdown Sanitization (User-Facing Display):**
    *   When rendering Markdown content provided by admins on the user-facing side (e.g., in the `MarkdownDisplayModal`), it **must** be sanitized to prevent XSS attacks.
    *   Utilize `react-markdown` with `remark-gfm` and ensure it's configured for sanitization or combined with a library like `DOMPurify` if `react-markdown`'s built-in mechanisms are insufficient for the required level of security. Your existing AI chat markdown renderer is a good reference here.
-   **URL Validation:**
    *   For `youtube` and `link` types, ensure URLs are well-formed. The `zod` URL validation is a good start.
    *   Consider potential for SSRF if these URLs were ever to be fetched server-side (e.g., for thumbnail generation in a future enhancement, though not planned for MVP user display). For MVP, since links are opened client-side, the primary risk is phishing or malicious external sites, which is an inherent risk with user-submitted links.
-   **CSRF Protection:** Next.js 13+ App Router typically handles this for API Routes using standard mechanisms like cookies, but confirm if any custom setup for CSRF has been done elsewhere that needs to be considered.
-   **Database Security:** Use parameterized queries (as shown with `pg` or your DB utility) to prevent SQL injection.

## 7. Frontend Implementation Details

### Admin UI (`src/components/onboarding/`)
Focus will be on integrating into `StepEditor.tsx` and a new modal for sidequest management.

-   **`SidequestsManager.tsx` (Refactored - to be integrated into `StepEditor.tsx` accordion item):**
    *   **Props:** `stepId: string`, `wizardId: string`.
    *   **Responsibilities:**
        *   Displays a button (e.g., "Manage Sidequests") to open the `SidequestsLibraryModal`.
        *   Manages the open/close state for `SidequestsLibraryModal`.
        *   Optionally, it might fetch and display a brief summary of sidequests (e.g., count or first few titles) directly in the accordion item for a quick overview. This part is secondary to launching the modal.
    *   Passes `stepId` and `wizardId` to `SidequestsLibraryModal` when opening it.

-   **`SidequestsLibraryModal.tsx` (New - Main Management UI):**
    *   **Props:** `isOpen: boolean`, `onClose: () => void`, `stepId: string`, `wizardId: string`.
    *   **State:** Manages visibility of `SidequestForm` (e.g., `formMode: 'create' | 'edit' | null`, `editingSidequestData: Sidequest | null`).
    *   **Functionality:**
        *   Uses `useGetStepSidequests(stepId)` to fetch and display the list of sidequests.
        *   Renders `SidequestAdminListItem.tsx` for each sidequest.
        *   Implements drag-and-drop for reordering using `@dnd-kit/sortable` and `useReorderSidequestsMutation`.
        *   Contains an "Add New Sidequest" button. When clicked, sets state to show `SidequestForm` in 'create' mode.
        *   Handles the `onEdit` callback from `SidequestAdminListItem`, setting state to show `SidequestForm` in 'edit' mode with the selected sidequest's data.
        *   Renders `SidequestForm.tsx` when `formMode` is 'create' or 'edit'.

-   **`SidequestAdminListItem.tsx` (Rendered inside `SidequestsLibraryModal`):**
    *   **Props:** `sidequest: Sidequest`, `stepId: string`, `onEdit: (sidequest: Sidequest) => void`.
    *   (Internal logic for display, delete mutation, and sortable integration remains largely the same as previously defined).
    *   The `onEdit` prop now signals `SidequestsLibraryModal` to show the form.

-   **`SidequestForm.tsx` (Rendered inside `SidequestsLibraryModal`):**
    *   **Props:** `stepId: string`, `wizardId: string`, `existingSidequest?: Sidequest | null`, `onCloseForm: () => void`, `onSaveSuccess?: (savedSidequest: Sidequest) => void`.
    *   (Internal logic for fields, `ImageLibraryModal` integration, create/update mutations remains largely the same as previously defined).
    *   `onCloseForm` now signals `SidequestsLibraryModal` to hide the form.
    *   `onSaveSuccess` signals `SidequestsLibraryModal`, which can then trigger a refetch of its list if needed (though mutations should handle invalidation) and hide the form.

-   **State Management:** React Query for server state. Local component state for form inputs, modal visibility, etc.
-   **Drag-and-Drop:** `@dnd-kit/sortable` used within `SidequestsLibraryModal`.
-   **API Hooks:** The existing hooks (`useGetStepSidequests`, `useCreateSidequestMutation`, etc.) will be used by these components, primarily by `SidequestsLibraryModal` and `SidequestForm`.

### User UI (`src/components/onboarding/WizardSlideshowModal.tsx`)
Anticipating needs for later implementation:
-   The data for sidequests will arrive as part of the `onboarding_step` object fetched for the slideshow.
-   No new direct data fetching hooks needed on the user side for sidequests themselves if they are embedded in the step data.
-   Components like `SidequestPlaylist.tsx` and `SidequestPlaylistItem.tsx` will primarily be responsible for rendering this pre-fetched data.
-   Your existing `ReactYoutube` component can be reused for the YouTube modal. The markdown renderer from AI chats can be adapted for the Markdown display modal.

## 8. Impact on Existing Systems

### Database
-   Addition of the `sidequests` table.
-   No breaking changes to existing tables, but requires a new migration.

### Quotas (`src/lib/quotas.ts`, `plan_limits` table)
-   **Consider for Future:**
    *   Maximum number of sidequests per step.
    *   Maximum number of sidequests per wizard.
    *   Total sidequests per community.
-   If image handling integrates with `generated_images` and AI generation, existing image quotas would apply.
-   For MVP, no new explicit quotas for sidequests themselves to keep complexity low, but this should be noted as a potential area for future plan-based limitations.

### Performance
-   Fetching sidequests along with step data will add a small overhead. Efficient querying (JOINs) and proper indexing on `sidequests.onboarding_step_id` are crucial.
-   Ensure that rendering the sidequest playlist, especially images, is optimized to not degrade `WizardSlideshowModal` performance. Lazy loading images in the playlist could be considered if performance becomes an issue.

## 9. Open Questions & Future Enhancements

-   **Sidequest Completion Tracking:**
    *   Should user interaction (clicks, views, time spent) with sidequests be tracked for analytics?
    *   Could sidequest completion become a soft prerequisite or unlock further content (beyond MVP)?
-   **Reusability of Sidequests:**
    *   Could admins create a library of common sidequests and attach them to multiple steps/wizards? (More complex data model needed).
-   **Advanced Image Management:**
    *   Full integration with `ImageLibraryModal` for selecting from/adding to `generated_images`.
    *   AI generation of images specifically for sidequests.
-   **Search/Filter for Sidequests:** If sidequests become very numerous, admins might need tools to find/manage them.
-   **More Sidequest Types:** E.g., embedded quizzes, file downloads, interactive embeds.
-   **User Feedback on Sidequests:** Allow users to rate or comment on the usefulness of sidequests.
-   **Conditional Display:** Show sidequests based on user roles or prior actions.
-   **A/B Testing:** Test the effectiveness of sidequests in improving wizard completion or user understanding.

## 10. Summary of Proposed MVP

The Minimum Viable Product for the Sidequests feature should include:
1.  **Database:** The `sidequests` table as defined.
2.  **Admin UI:**
    *   Ability to Create, Read, Update, and Delete sidequests for any given wizard step.
    *   Support for 'youtube', 'link', and 'markdown' types.
    *   Input fields for title, description (optional), image URL (optional), and content payload.
    *   Ability to reorder sidequests for a step.
3.  **User UI:**
    *   Display sidequests in a vertical "playlist-style" list on the right side of the `WizardSlideshowModal`.
    *   Each item shows image (if provided), title.
    *   Interaction:
        *   YouTube videos open in an in-app modal.
        *   External links open in a new browser tab.
        *   Markdown content displays in an in-app modal (rendered and sanitized).
4.  **No explicit tracking** of sidequest completion or interaction.
5.  **No new quotas** specifically for sidequests in MVP.

This MVP focuses on delivering the core value proposition of providing easily accessible supplementary content alongside wizard steps.