# Roadmap: Quota Limit Upgrade Prompt

## 1. Goal

Improve the user experience when hitting plan usage limits (quotas). Currently, hitting a limit triggers a `402 Payment Required` or `429 Too Many Requests` response from the backend, resulting in a generic error toast on the client.

The goal is to intercept these specific quota-related errors on the client-side and display a dedicated modal prompting the user to upgrade their plan, instead of just showing a toast.

## 2. Current State

*   **Backend:**
    *   A robust quota system exists (`src/lib/quotas.ts`) using `enforceEventRateLimit` and `enforceResourceLimit`.
    *   It tracks features like `AIChatMessage`, `ImageGeneration`, `ActiveWizard`.
    *   When limits are hit, a `QuotaExceededError` is thrown.
    *   API routes catch this error and return either `402 Payment Required` (for wizards, image generation) or `429 Too Many Requests` (for AI chat) with varying levels of detail in the JSON response body.
*   **Frontend:**
    *   API calls are primarily made via the `useAuthFetch` hook (`src/lib/authFetch.ts`).
    *   `useAuthFetch` throws a *generic* error (`Error(\`HTTP error! status: \${response.status}\`);`) for non-`ok` responses (like 402/429), discarding the specific JSON error body returned by the backend.
    *   TanStack Query mutation hooks (e.g., `useGenerateAndSaveImageMutation`) use `authFetch` and have `onError` handlers that typically display a generic error toast using `useToast`, based on the limited error message from `authFetch`.

## 3. Implementation Plan

### Step 1: Standardize Backend Quota Error Response (Recommended)

*   **Task:** Modify all API routes that catch `QuotaExceededError` to consistently return:
    *   **Status Code:** `402 Payment Required`. This is semantically more appropriate than `429` for prompting an upgrade.
    *   **JSON Body:** A standardized, structured JSON body containing details about the limit exceeded. Example:
        ```json
        {
          "error": "QuotaExceeded",
          "message": "Usage limit reached for [Feature Name].",
          "details": {
            "feature": "image_generation", // from Feature enum
            "limit": 100,
            "window": "1 month", // or 'static' for resource limits
            "currentCount": 100
          }
        }
        ```
*   **Files to Check/Modify:**
    *   `src/app/api/admin/steps/generate-background/route.ts` (Already uses 402, check body)
    *   `src/app/api/wizards/route.ts` (Already uses 402, check body)
    *   `src/app/api/wizards/[id]/route.ts` (Already uses 402, check body)
    *   `src/app/api/onboarding/quizmaster/chat/route.ts` (Change 429 to 402, ensure body)
    *   `src/app/api/admin/ai-assistant/chat/route.ts` (Change 429 to 402, ensure body)
    *   Potentially others using `enforceEventRateLimit` or `enforceResourceLimit`.

### Step 2: Enhance Client-Side Error Handling (`authFetch`)

*   **Task:** Modify `src/lib/authFetch.ts` to parse the JSON body for non-`ok` responses and include it in the thrown error.
*   **Details:**
    *   Define a custom error class (e.g., `HttpError` or `ApiError`) that extends `Error` and can hold the response status, status text, and parsed JSON body.
    *   In the `if (!response.ok)` block:
        *   Attempt to `await response.json()`.
        *   If successful, throw `new HttpError(response.status, response.statusText, parsedJsonBody)`.
        *   If JSON parsing fails (e.g., empty body or non-JSON), fall back to throwing `new HttpError(response.status, response.statusText, await response.text())` or the current generic error.
*   **Benefit:** Downstream error handlers (like TanStack Query's `onError`) will now receive the detailed error information from the backend.

### Step 3: Create the Upgrade Modal Component

*   **Task:** Create a new reusable React component (e.g., `src/components/billing/UpgradeModal.tsx`).
*   **Features:**
    *   Accepts props for visibility (`isOpen`, `onClose`).
    *   Displays a clear message indicating a usage limit was reached (potentially mentioning the specific feature if available from the error).
    *   Includes buttons/links:
        *   "View Plans" / "Upgrade Plan" (potentially triggering the Stripe checkout flow via `useCreateCheckoutSession`).
        *   "Manage Billing" (triggering the Stripe portal via `useCreatePortalSession`).
        *   A "Close" or "Maybe Later" button.
*   **Styling:** Use `shadcn/ui` components (`Dialog`, `Button`, etc.) for consistency.

### Step 4: Implement Global Error Interception and Modal Trigger

*   **Task:** Set up a global mechanism to catch errors from API calls (specifically TanStack Query mutations/queries) and trigger the Upgrade Modal for `402` errors.
*   **Approach Options:**
    1.  **TanStack Query `onError` Defaults:** Configure default `onError` handlers for `QueryClient` or individual mutations/queries. This handler would check the error (now enhanced by Step 2), and if it's a `402` with `error: "QuotaExceeded"`, trigger the modal state update.
    2.  **Context/State Management:** Create a global context (e.g., `ErrorHandlingContext`) or use an existing state manager (like Zustand) to hold the modal's open state and potentially the error details. Modify mutation hooks' `onError` to check for `402` and call a function from the context/store to open the modal.
*   **Details:**
    *   The chosen mechanism needs access to the error object thrown by `authFetch` (enhanced in Step 2).
    *   It should check `error.status === 402` and `error.body?.error === 'QuotaExceeded'`.
    *   If matched, update the state to show the `<UpgradeModal />`.
    *   Ensure other errors are still handled (e.g., by showing standard toasts).

### Step 5: Integrate Modal State Management

*   **Task:** Add state management for the `<UpgradeModal />`.
*   **Details:**
    *   Use `useState` in a high-level component (like `PluginContainer` or `AppLayout`) or preferably a dedicated global state solution (Zustand recommended if not already in use, otherwise React Context).
    *   The global error handler (Step 4) will update this state to open the modal.
    *   The `<UpgradeModal />` component itself will render based on this state and include logic to close itself (updating the state).

## 4. Considerations

*   **User Experience:** Avoid showing both a toast *and* the modal for the same quota error. The global handler should prevent the default toast in case of a 402.
*   **Admin vs. User:** The upgrade prompt is likely most relevant for admins who manage billing, but could potentially be shown to users depending on the application's model. Ensure the logic targets the appropriate users. The current quota checks seem community-based, so targeting admins makes sense.
*   **Stripe Integration:** Ensure the "Upgrade" and "Manage Billing" buttons correctly trigger the existing Stripe checkout (`useCreateCheckoutSession`) and portal (`useCreatePortalSession`) hooks. 