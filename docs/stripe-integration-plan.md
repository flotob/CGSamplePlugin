# Stripe Integration Plan

## 1. Goal

Integrate Stripe billing to allow communities to upgrade from the default 'free' plan to paid plans (initially a 'pro' plan). This involves handling subscription creation, management via Stripe Billing Portal, and updating the application's state based on subscription status received via webhooks. This system will enable monetization and provide the mechanism for users to bypass resource limits encountered (e.g., 402 errors).

This plugin runs within an iframe hosted by a parent application (e.g., `app.cg`). This plan accounts for the iframe context and the need for cross-window communication after Stripe redirects.

This plan also outlines the necessary steps to support future metered (usage-based) billing for features like AI chat messages.

## 2. Prerequisites

*   A configured Stripe account (Test Mode initially).
*   Stripe API Keys (Secret and Publishable) for Test and Live modes set in environment variables.
*   A defined "Pro Plan" Product with an associated recurring Price object created within the Stripe dashboard (user task). The Price ID will be needed.
*   Defined environment variables:
    *   `STRIPE_SECRET_KEY` (Backend)
    *   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Frontend)
    *   `STRIPE_WEBHOOK_SECRET` (Backend)
    *   `PARENT_APP_URL`: The base URL of the parent application hosting the iframe (e.g., `https://app.cg`). (Backend)
    *   `NEXT_PUBLIC_PARENT_APP_URL`: Same as `PARENT_APP_URL`, but accessible by the frontend for origin verification. (Frontend)
*   Coordination with the parent application (`app.cg`) team to implement the required callback handling on the community page (See Section 6).
*   (Optional but Recommended) Stripe CLI installed for local webhook testing.

## 3. Database Schema Changes

1.  **Add `stripe_customer_id` to `communities`:** This column links a community in our database to a Customer object in Stripe.
    *   `ALTER TABLE communities ADD COLUMN stripe_customer_id TEXT UNIQUE;` (Initially NULLABLE)
2.  **Populate `stripe_price_id` in `plans`:** The `stripe_price_id` column (already created in the `plans` table) needs to be updated with the actual Stripe Price ID for the 'pro' plan once created.
    *   `UPDATE plans SET stripe_price_id = 'price_xyz...' WHERE code = 'pro';`

*Migration required for these changes.*

## 4. Backend API Routes (using Next.js App Router)

All Stripe API calls must happen server-side.

1.  **`POST /api/stripe/create-checkout-session`**
    *   **Purpose:** Creates a Stripe Checkout session.
    *   **Auth:** Required (admin).
    *   **Input:**
        *   Implicit `communityId` from `req.user.cid` (JWT).
        *   *Optional* `{ pluginId?: string }` in the request body (for future use).
    *   **Logic:**
        *   Retrieve `communityId` from JWT.
        *   Retrieve optional `pluginId` from request body.
        *   Get/Create Stripe Customer ID.
        *   Get Pro Plan `stripe_price_id`.
        *   Get `PARENT_APP_URL` from env.
        *   **Conditionally construct `success_url` and `cancel_url`:**
            *   `baseUrl = pluginId ? `${PARENT_APP_URL}/c/${communityId}/plugin/${pluginId}/` : `${PARENT_APP_URL}/c/${communityId}/` `
            *   `success_url`: ``${baseUrl}?stripe_status=success&session_id={CHECKOUT_SESSION_ID}``
            *   `cancel_url`: ``${baseUrl}?stripe_status=cancel``
        *   Create Stripe Checkout session with these URLs and `client_reference_id: communityId`.
    *   **Response:** `{ sessionId: string }`

2.  **`POST /api/stripe/create-portal-session`**
    *   **Purpose:** Creates a Stripe Billing Portal session.
    *   **Auth:** Required (admin).
    *   **Input:**
        *   Implicit `communityId` from `req.user.cid` (JWT).
        *   *Optional* `{ pluginId?: string }` in the request body (for future use).
    *   **Logic:**
        *   Retrieve `communityId` from JWT.
        *   Retrieve optional `pluginId` from request body.
        *   Retrieve `stripe_customer_id` for `communityId`.
        *   Get `PARENT_APP_URL` from env.
        *   **Conditionally construct `return_url`:**
            *   `baseUrl = pluginId ? `${PARENT_APP_URL}/c/${communityId}/plugin/${pluginId}/` : `${PARENT_APP_URL}/c/${communityId}/` `
            *   `return_url`: ``${baseUrl}?stripe_status=portal_return``
        *   Create Stripe Billing Portal session with this `return_url`.
    *   **Response:** `{ portalUrl: string }`

3.  **`POST /api/webhooks/stripe`**
    *   **Purpose:** Handles incoming events from Stripe to keep application state consistent.
    *   **Auth:** None (public endpoint, relies on Stripe signature verification).
    *   **Logic:**
        *   Verify Signature using `STRIPE_WEBHOOK_SECRET`.
        *   Handle Events (`checkout.session.completed`, `customer.subscription.*`, `invoice.*` etc.)
        *   Update `communities` table (`stripe_customer_id`, `current_plan_id`).
        *   Respond `200 OK` to Stripe.

## 5. Frontend Integration (@stripe/stripe-js)

Implement a modular approach using custom hooks and a dedicated component. Account for iframe context and parent communication.

1.  **Custom Hooks (@tanstack/react-query):**
    *   `useCommunityBillingInfo`: Fetches data from `/api/community/billing-info`.
    *   `useCreateCheckoutSession`:
        *   `mutate` function accepts no arguments for now.
        *   `mutationFn` calls backend API without a request body.
        *   Handles API call state, errors, and Stripe.js redirect.
    *   `useCreatePortalSession`:
        *   `mutate` function accepts no arguments for now.
        *   `mutationFn` calls backend API without a request body.
        *   Handles API call state, errors, and *direct window redirect* (`window.location.href = portalUrl`).
2.  **Dedicated UI Component (`BillingManagementSection.tsx`):**
    *   Accepts `communityId` as prop (no `pluginId` needed for now).
    *   Uses `useCommunityBillingInfo(communityId)`.
    *   Conditionally render info and buttons.
    *   Calls mutation hooks: `createCheckoutSession()` or `createPortalSession()`.
    *   Handles loading/error states.
3.  **Integration in Admin Settings (`AdminView.tsx`):**
    *   Render `<BillingManagementSection communityId={...} />`.
4.  **Handling 402 Errors Elsewhere:**
    *   Show simple message + button triggering `useCreateCheckoutSession().mutate()`.
5.  **Parent Communication Listener:**
    *   Implement a `message` event listener (e.g., in `PluginContainer` or `AuthContext`).
    *   Verify message `event.origin` against `NEXT_PUBLIC_PARENT_APP_URL`.
    *   Check for `event.data.type === 'stripeCallback'`.
    *   Based on `event.data.status` ('success', 'cancel', 'portal_return'):
        *   Show appropriate toasts.
        *   Invalidate `communityBillingInfo` query using `queryClient` to refresh the UI state (will take effect when user navigates back to plugin).

## 6. Parent Application (`app.cg`) Responsibilities

*   **Implement Community Page Callback Logic:** The parent application page loaded at `/c/{communityId}/` needs specific logic.
*   **Detect Stripe Parameters:** On load, this page must check for the presence of `?stripe_status=...` (and `session_id=...` on success) in the URL.
*   **Identify Target Iframe:** Determine which iframe on the page corresponds to this plugin instance. This might involve:
    *   The plugin iframe sending an initial `postMessage` to the parent identifying itself (e.g., `{ type: 'pluginReady', pluginType: 'onboardingWizard' }`).
    *   The parent storing this iframe reference.
*   **Send Message:** Once the correct iframe is identified and the `stripe_status` is detected, use `iframeElement.contentWindow.postMessage({ type: 'stripeCallback', status: '...', sessionId?: '...' }, pluginOrigin)` to send the status back to the plugin iframe. `pluginOrigin` is the plugin's origin (e.g., ngrok URL).
*   **Clear/Handle Parameters:** The parent page should ideally handle or clear the `stripe_status` URL parameters after processing to avoid reprocessing on subsequent loads.

## 7. Metered Billing (Aspirational / Phase 2)

1.  **Stripe Setup:** Create a metered Price for the relevant feature (e.g., AI Chat Messages per unit).
2.  **Plan Limits:** Add a corresponding `plan_limits` entry for the `pro` plan and `ai_chat_message` feature (e.g., limit=10000, window='30 days').
3.  **Usage Reporting:**
    *   Modify the `logUsageEvent` function in `src/lib/quotas.ts` or create a separate mechanism.
    *   When an event for a metered feature (`ai_chat_message`) occurs for a community on a *paid plan*:
        *   Retrieve the community's active Stripe `subscription_id` (needs to be stored during webhook handling).
        *   Find the specific `subscription_item_id` associated with the metered price on that subscription.
        *   Call `stripe.subscriptionItems.createUsageRecord(subscription_item_id, { quantity: 1, action: 'increment' })`. Handle potential errors.
    *   **Considerations:** Reporting usage on every event might be excessive. Batching usage (e.g., hourly/daily counts) might be more efficient, but requires more state management.
4.  **Enforcement:** The existing `enforceEventRateLimit` function will handle checking usage against the `plan_limits` for metered features.

## 8. Implementation Roadmap

1.  **Stripe Product/Price Setup (User Task)**
2.  **Database Migration**
3.  **Environment Setup:** Add Stripe keys, webhook secret, `PARENT_APP_URL`, `NEXT_PUBLIC_PARENT_APP_URL`.
4.  **Implement Webhook Handler (`/api/webhooks/stripe`)**
5.  **Implement Billing Info API (`GET /api/community/billing-info`)**
6.  **Update Checkout Session API (`/api/stripe/create-checkout-session`):** Implement *conditional* URL logic (accept optional `pluginId`, default to `/c/{communityId}/` URL for now).
7.  **Update Portal Session API (`/api/stripe/create-portal-session`):** Implement *conditional* URL logic (accept optional `pluginId`, default to `/c/{communityId}/` URL for now).
8.  **Frontend Hooks (`useCreate...`)**: (No changes needed *now*)
9.  **Implement Frontend Listener:** Add `message` listener.
10. **Frontend Component (`BillingManagementSection`):** (No changes needed *now*)
11. **Billing Component Integration (`AdminView.tsx`):** (No changes needed *now*)
12. **Parent App Implementation (`app.cg` Task):** Implement `/c/{communityId}/` callback logic (Section 6).
13. **Test Thoroughly:** End-to-end testing including parent app interaction and manual navigation.
14. **Integrate 402 Error Handling**
15. **(Phase 2) Metered Billing**
16. **(Future) Frontend Updates:** When `pluginId` is available, update frontend hooks/components to pass it.
17. **(Future) Parent App Updates:** Update `app.cg` callback logic to handle the specific plugin URL.

## 9. Open Questions & Considerations

*   **Parent App Coordination:** Confirm timeline and implementation details for the parent app changes (Section 6), especially the strategy for identifying the correct iframe and handling message timing.
*   **Frontend `pluginId` Source (Future):** How will the `pluginId` eventually be accessed by the frontend?
*   **Error Handling:** Robust handling for Stripe API errors, network issues, `postMessage` failures, invalid user states.
*   **Trial Periods:** Will the 'pro' plan offer a trial period?
*   **UI/UX:** Clarify user instructions regarding manual navigation back/refresh needed after Stripe interaction to see updated status.
*   **Security:** Ensure webhook secret secure, restrict API key permissions, verify `postMessage` origin. 