# Feature Guide: AI-Generated Step Backgrounds

## 1. Introduction & Goal

This document outlines the implementation plan for a feature allowing administrators to generate decorative background images for individual onboarding wizard steps using OpenAI's DALL·E 3 image generation model.

**The primary goals are:**

1.  **Enhance Visual Appeal:** Provide admins a tool to create unique, relevant, and aesthetically pleasing backgrounds for wizard steps, improving the user experience.
2.  **Dynamic Content:** Allow admins to easily customize the look and feel of steps based on their content or purpose using text prompts.
3.  **Controlled Usage:** Integrate generation with the existing quota system to manage API costs and prevent abuse.
4.  **Persistent Storage:** Ensure generated images are stored reliably and served efficiently.
5.  **Admin Workflow:** Provide a seamless UI experience within the existing Step Editor for admins to manage prompts, generate images, preview results, and save the background to the step configuration.
6.  **User Display:** Render the saved background image effectively on the user-facing wizard slide.

This feature leverages external services (OpenAI, Object Storage) and requires careful integration with the existing backend API, frontend components, and quota system.

## 2. High-Level Workflow

```mermaid
sequenceDiagram
    participant AdminUI as Admin (StepEditor)
    participant BackendAPI as Backend API <br>(/api/admin/steps/generate-background)
    participant QuotaLib as Quota Check <br>(src/lib/quotas.ts)
    participant OpenAI
    participant Storage as Object Storage <br>(Railway/MinIO)
    participant UsageDB as usage_events Table
    participant StepDB as onboarding_steps Table

    AdminUI->>+BackendAPI: POST Request (wizardId, stepId, prompt)
    BackendAPI->>+QuotaLib: Check Quota ('image_generation', communityId)
    alt Quota Exceeded
        QuotaLib-->>-BackendAPI: Error (e.g., 402)
        BackendAPI-->>-AdminUI: Error Response (402)
    else Quota OK
        QuotaLib-->>-BackendAPI: OK
        BackendAPI->>+OpenAI: Generate Image (prompt)
        OpenAI-->>-BackendAPI: Temporary Image URL
        BackendAPI->>BackendAPI: Download Image Data (from URL)
        BackendAPI->>+Storage: Upload Image Data (unique key)
        Storage-->>-BackendAPI: Persistent Image URL
        BackendAPI->>+UsageDB: Log Usage Event ('image_generation')
        UsageDB-->>-BackendAPI: Logged
        BackendAPI-->>-AdminUI: Success Response { imageUrl: persistentUrl }
        AdminUI->>+StepDB: Update Step Config (via PATCH /api/wizards/.../steps/[stepId])
        StepDB-->>-AdminUI: Step Updated
    end
```

## 3. Database Modifications

### 3.1. `feature_enum` Type

The existing `feature_enum` type, used by the `plan_limits` and `usage_events` tables, needs a new value to track image generation events.

*   **Action:** Add the value `'image_generation'` to the `feature_enum`.
*   **Migration File:** `migrations/<timestamp>_add_image_generation_feature.js`
*   **SQL:**
    ```sql
    -- Add the new value to the enum
    ALTER TYPE feature_enum ADD VALUE 'image_generation';

    -- Optional: Add corresponding limits to existing plans in plan_limits
    -- Example: INSERT INTO plan_limits (plan_id, feature, hard_limit)
    --          SELECT id, 'image_generation', 50 -- Allow 50 generations/month for 'pro' plan
    --          FROM plans WHERE code = 'pro'
    --          ON CONFLICT DO NOTHING;
    -- Example: INSERT INTO plan_limits (plan_id, feature, hard_limit)
    --          SELECT id, 'image_generation', 5 -- Allow 5 generations/month for 'free' plan
    --          FROM plans WHERE code = 'free'
    --          ON CONFLICT DO NOTHING;
    ```
    *(Note: Adding default limits via migration requires careful consideration of existing plans).*

### 3.2. `onboarding_steps` Table

No direct schema changes are needed. The persistent URL of the generated and stored image will be saved within the existing `config` JSONB column.

*   **Proposed Structure:** `config.presentation.backgroundImageUrl: string | null`
*   **Example:**
    ```json
    {
      "presentation": {
        "headline": "Welcome!",
        "backgroundImageUrl": "https://your-storage.example.com/images/comm1/wizA/stepB/1701010101.png"
      },
      "specific": { ... }
    }
    ```

## 4. Environment Variables

The following environment variables need to be configured for the backend:

*   `OPENAI_API_KEY`: Your secret key for accessing OpenAI APIs.
*   `STORAGE_ACCESS_KEY_ID`: Access key for your object storage provider.
*   `STORAGE_SECRET_ACCESS_KEY`: Secret key for your object storage provider.
*   `STORAGE_BUCKET_NAME`: Name of the bucket to store images in.
*   `STORAGE_REGION`: Region of your storage bucket (e.g., `us-east-1`).
*   `STORAGE_ENDPOINT_URL`: Endpoint URL for the storage service (especially important for S3-compatible services like MinIO or Railway's offering).
*   `STORAGE_PUBLIC_URL_PREFIX` (Optional but Recommended): The public base URL for accessing files in the bucket (e.g., `https://your-cdn.example.com/images/` or `https://your-bucket.s3.amazonaws.com/`). This avoids constructing URLs manually.

Ensure separate values are configured for development (e.g., pointing to local MinIO) and production (pointing to Railway object storage).

## 5. Storage Utility (`src/lib/storage.ts`)

This new utility module will abstract the interaction with the object storage service.

*   **Dependencies:** `@aws-sdk/client-s3` (standard SDK for S3-compatible storage).
*   **Initialization:** Create an S3 client instance using credentials and endpoint details from environment variables.
*   **`uploadImageFromUrl(sourceUrl: string, destinationKey: string): Promise<string>` function:**
    1.  Takes the temporary image URL from OpenAI (`sourceUrl`) and a desired unique key for storage (`destinationKey`).
    2.  Fetches the image data from `sourceUrl` (e.g., using `fetch` and getting an `ArrayBuffer` or `ReadableStream`).
    3.  Uses the S3 client's `PutObjectCommand` to upload the image data/stream to the configured bucket with the `destinationKey`. Set appropriate `ContentType` (e.g., `image/png`). Set `ACL` to `public-read` if direct access is needed, or configure bucket policy accordingly.
    4.  Constructs and returns the persistent public URL for the uploaded object (e.g., using `STORAGE_PUBLIC_URL_PREFIX` and `destinationKey`, or using `GetSignedUrlCommand` if pre-signed URLs are preferred, though less likely for background images).
*   **Key Generation:** The `destinationKey` should be unique. A good pattern is `communityId/wizardId/stepId/<timestamp_or_uuid>.png`.

## 6. Backend API Endpoint (`src/app/api/admin/steps/generate-background/route.ts`)

This new API route handles the entire generation, storage, and quota process.

*   **Method:** `POST`
*   **Authentication:** Admin-only, using `withAuth(..., true)`.
*   **Request Body:** `{ wizardId: string, stepId: string, prompt: string }`
*   **Logic:**
    1.  **Validate Input:** Check for presence and basic format of `wizardId`, `stepId`, `prompt`.
    2.  **Authorize:** Query the database to verify that the specified `stepId` exists, belongs to the `wizardId`, and that the `wizardId` belongs to the admin's `communityId` (from `req.user.cid`). Return 404 or 403 if not found/authorized.
    3.  **Check Quota:** Call the quota enforcement function (e.g., `enforceResourceLimit(communityId, 'image_generation')` from `src/lib/quotas.ts`). Handle potential `QuotaExceededError` by returning a 402 or similar status code.
    4.  **Augment Prompt (Optional):** Prepend/append style keywords to the received `prompt` (e.g., `"Illustration in the style of Studio Ghibli: " + prompt`).
    5.  **Call OpenAI:**
        *   Initialize `openai` client.
        *   Call `openai.images.generate({ model: "dall-e-3", prompt: augmentedPrompt, size: "1024x1024", n: 1, response_format: "url" })`.
        *   Handle potential OpenAI errors (API key issues, rate limits, content policy violations). Return appropriate error responses (e.g., 400, 500).
    6.  **Store Image:**
        *   Get the temporary `imageUrl` from the OpenAI response.
        *   Generate a unique `destinationKey` for storage.
        *   Call `uploadImageFromUrl(imageUrl, destinationKey)` from the storage utility.
        *   Handle potential storage upload errors. Return 500 if upload fails.
    7.  **Log Usage:** On successful upload, log the event: `logUsageEvent(communityId, req.user.sub, 'image_generation')`.
    8.  **Return URL:** Return a JSON response with the persistent image URL: `NextResponse.json({ imageUrl: persistentUrl }, { status: 200 })`.

## 7. Frontend Admin UI

### 7.1. Generate Background Hook (`src/hooks/useGenerateBackgroundMutation.ts`)

*   Create a standard React Query mutation hook using `useMutation`.
*   **Variables Type:** `{ wizardId: string, stepId: string, prompt: string }`.
*   **Success Response Type:** `{ imageUrl: string }`.
*   **`mutationFn`:** Uses `authFetch` to call `POST /api/admin/steps/generate-background` with the variables.
*   **`onSuccess` / `onError`:** Handle loading states and display appropriate toasts for success or failure (including specific messages for quota errors if possible).

### 7.2. Step Editor Component (`src/components/onboarding/steps/StepEditor.tsx`)

*   **State:** Add local state for `imagePrompt: string`, `isGenerating: boolean`, `generationError: string | null`.
*   **UI Elements:**
    *   **Image Preview:** An `<img>` tag or a `div` with `background-image` style to display the *current* background image URL stored in `step.config.presentation.backgroundImageUrl`. Show a placeholder if no URL exists.
    *   **Prompt Input:** An `<Input>` or `<Textarea>` bound to the `imagePrompt` state.
    *   **Generate Button:** A `<Button>` labeled "Generate Background" or similar. Disable it if `isGenerating` is true or if the prompt is empty.
    *   **Loading/Error Display:** Show a spinner or message when `isGenerating` is true. Display `generationError` if it's not null.
*   **Logic:**
    1.  Instantiate `useGenerateBackgroundMutation`.
    2.  Instantiate `useUpdateStep` (already exists from `useStepsQuery`).
    3.  The "Generate Background" button's `onClick` handler:
        *   Sets `isGenerating` to true, clears `generationError`.
        *   Calls `generateBackgroundMutation.mutate({ wizardId, stepId, prompt: imagePrompt }, { onSuccess: ..., onError: ... })`.
    4.  Inside the `generateBackgroundMutation`'s `onSuccess(data)` callback:
        *   Get the `imageUrl` from `data`.
        *   Construct the updated step `config` object, merging the new `backgroundImageUrl` into the `presentation` section.
        *   Call `updateStep.mutate({ config: updatedConfig })` to save the URL to the database.
        *   Set `isGenerating` to false.
    5.  Inside the `generateBackgroundMutation`'s `onError(error)` callback:
        *   Set `generationError` based on `error.message`.
        *   Set `isGenerating` to false.

## 8. Frontend User UI (`src/components/onboarding/steps/display/...`)

*   Identify the component responsible for rendering the main container/background of a wizard step (e.g., `StepDisplay.tsx` or potentially the parent `WizardSlideshowModal.tsx` if the background applies to the whole modal frame).
*   Read the `backgroundImageUrl` from the current `step.config.presentation`.
*   Conditionally apply inline styles or classes to set the `background-image`:
    ```jsx
    <div
      className="step-container bg-cover bg-center ..." // Add relevant Tailwind classes
      style={step.config?.presentation?.backgroundImageUrl
             ? { backgroundImage: `url('${step.config.presentation.backgroundImageUrl}')` }
             : {}
      }
    >
      {/* Step content */}
    </div>
    ```

## 9. Open Questions & Defaults (Suggestions)

*   **Dev Storage:** **Recommend MinIO via Docker.** Provide basic `docker-compose.yml` snippet and example environment variables in project setup guide/README.
*   **Error Handling:**
    *   Quota Error (Backend API returns 402): Show specific toast: "Image generation quota reached. Please upgrade your plan."
    *   OpenAI Content Policy Error: Show specific toast: "Image prompt violates content policy. Please try a different prompt."
    *   OpenAI Rate Limit/Other Error: Show generic toast: "AI generation failed. Please try again later."
    *   Storage Error: Show generic toast: "Failed to save generated image. Please try again."
*   **Image Cost/Quota:** Start with a placeholder (e.g., 1 generation = 1 credit/usage point). Needs analysis based on OpenAI pricing and plan structure.
*   **Prompt Augmentation:** Recommend starting simple. Prepend: `"Illustration, cinematic lighting, high detail: "` to the user's prompt. Can be refined later.
*   **Image Dimensions/Format:** **Standardize on 1024x1024, PNG format** (OpenAI returns PNG by default via URL).
*   **Image Caching/Regeneration:** **Allow regeneration.** Don't implement caching initially. If an admin generates a new image for the same step, the backend should overwrite the old file in storage (or generate a new key and update the config) and log a new usage event.

This detailed plan provides a comprehensive roadmap for implementing the AI background generation feature.

 