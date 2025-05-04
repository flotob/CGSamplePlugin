# Stripe Integration Plan

## 1. Goal

Integrate Stripe billing to allow communities to upgrade from the default 'free' plan to paid plans (initially a 'pro' plan). This involves handling subscription creation, management via Stripe Billing Portal, and updating the application's state based on subscription status received via webhooks. This system will enable monetization and provide the mechanism for users to bypass resource limits encountered (e.g., 402 errors).

This plan also outlines the necessary steps to support future metered (usage-based) billing for features like AI chat messages.

## 2. Prerequisites

*   A configured Stripe account.
*   Stripe API Keys (Secret and Publishable) for Test and Live modes.
*   A defined "Pro Plan" Product with an associated recurring Price object created within the Stripe dashboard (user task). The Price ID will be needed.
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
    *   **Purpose:** Creates a Stripe Checkout session for a community to subscribe to the 'pro' plan.
    *   **Auth:** Required (likely admin of the community).
    *   **Input:** Implicit `communityId` from `req.user.cid`.
    *   **Logic:**
        *   Retrieve the community record.
        *   Check if the community *already* has a `stripe_customer_id`. If not, create a new Stripe Customer (`stripe.customers.create`) and store the ID in the `communities` table.
        *   Retrieve the `stripe_price_id` for the 'pro' plan from the `plans` table.
        *   Create a Stripe Checkout session (`stripe.checkout.sessions.create`) with:
            *   `mode: 'subscription'`
            *   `customer: stripe_customer_id`
            *   `line_items: [{ price: pro_plan_stripe_price_id, quantity: 1 }]`
            *   `success_url`: URL to redirect to on success (e.g., back to billing page with success flag).
            *   `cancel_url`: URL to redirect to on cancellation.
            *   Crucially, include `client_reference_id: communityId` in the session creation. This helps link the session back to the community in webhooks if the customer ID isn't immediately available.
    *   **Response:** `{ sessionId: string }`

2.  **`POST /api/stripe/create-portal-session`**
    *   **Purpose:** Creates a Stripe Billing Portal session link for a community to manage their existing subscription.
    *   **Auth:** Required (likely admin of the community).
    *   **Input:** Implicit `communityId` from `req.user.cid`.
    *   **Logic:**
        *   Retrieve the `stripe_customer_id` for the given `communityId` from the `communities` table.
        *   If no `stripe_customer_id` exists, return an error (user isn't a Stripe customer yet).
        *   Create a Stripe Billing Portal session (`stripe.billingPortal.sessions.create`) with:
            *   `customer: stripe_customer_id`
            *   `return_url`: URL to redirect back to after portal usage (e.g., billing page).
    *   **Response:** `{ portalUrl: string }`

3.  **`POST /api/webhooks/stripe`**
    *   **Purpose:** Handles incoming events from Stripe to keep application state consistent.
    *   **Auth:** None (public endpoint, relies on Stripe signature verification).
    *   **Logic:**
        *   **Verify Signature:** Use `stripe.webhooks.constructEvent` with the raw request body, `stripe-signature` header, and your webhook signing secret (`STRIPE_WEBHOOK_SECRET` environment variable).
        *   **Handle Events (Switch statement based on `event.type`):**
            *   `checkout.session.completed`:
                *   If `mode` is `subscription`.
                *   Retrieve `client_reference_id` (our `communityId`) and `customer` (Stripe Customer ID) from the session data (`event.data.object`).
                *   Retrieve `subscription` ID.
                *   Update the corresponding `communities` record: set `stripe_customer_id` and potentially `current_plan_id` (though this might be better handled by `customer.subscription.created/updated`). Store the `subscription_id` if needed for management.
            *   `customer.subscription.created` / `customer.subscription.updated`:
                *   Get `customer` ID and plan details (`items.data[0].price.id`) from the subscription object (`event.data.object`).
                *   Find the corresponding `community` via `stripe_customer_id`.
                *   Lookup the internal `plan.id` based on the `stripe_price_id`.
                *   Update `communities.current_plan_id` based on the active subscription plan.
                *   Handle status changes (e.g., `trialing`, `active`, `past_due`).
            *   `customer.subscription.deleted`:
                *   Get `customer` ID.
                *   Find the corresponding `community`.
                *   Update `communities.current_plan_id` back to the 'free' plan ID.
            *   `invoice.paid`: Confirm successful payment (good for logging/analytics, potentially resetting metered usage counters if implemented).
            *   `invoice.payment_failed`: Log failure, potentially notify community admin.
        *   **Response:** Return `200 OK` to Stripe quickly to acknowledge receipt. Handle business logic asynchronously if it might take time.

## 5. Frontend Integration (@stripe/stripe-js)

Implement a modular approach using custom hooks and a dedicated component for reusability.

1.  **Custom Hooks (@tanstack/react-query):**
    *   `useCommunityBillingInfo`: Create a hook to fetch data from `/api/community/billing-info`. Encapsulates data fetching, caching, loading, and error states for community plan details and `stripe_customer_id`.
    *   `useCreateCheckoutSession`: Create a `useMutation` hook to call `POST /api/stripe/create-checkout-session`. Manages the API call state (loading, error) and handles the redirect to Stripe Checkout using `@stripe/stripe-js` on success.
    *   `useCreatePortalSession`: Create a `useMutation` hook to call `POST /api/stripe/create-portal-session`. Manages the API call state and handles the redirect to the Stripe Billing Portal on success.
2.  **Dedicated UI Component (`BillingManagementSection.tsx`):**
    *   Create a new component responsible for displaying billing status and actions.
    *   Uses `useCommunityBillingInfo` to fetch data.
    *   Conditionally renders current plan info ("Free Plan" / "Pro Plan").
    *   Conditionally renders either an "Upgrade to Pro" button or a "Manage Subscription" button (only if `stripe_customer_id` exists).
    *   Uses the mutation hooks (`useCreateCheckoutSession`, `useCreatePortalSession`) to get mutate functions and loading states for the buttons.
    *   Handles displaying loading states on buttons and showing errors via `useToast`.
3.  **Integration in Admin Settings (`AdminView.tsx`):**
    *   Import and render the `<BillingManagementSection />` component within the `activeSection === 'account'` block, replacing the placeholder.
4.  **Handling 402 Errors Elsewhere:**
    *   When other parts of the application receive a structured 402 error:
        *   Display a relevant message (e.g., "Upgrade required to add more wizards").
        *   Provide an "Upgrade" button/link that directly triggers the mutation function from the `useCreateCheckoutSession` hook, initiating the checkout flow without necessarily rendering the full `<BillingManagementSection />`.

## 6. Metered Billing (Aspirational / Phase 2)

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

## 7. Implementation Roadmap

1.  **Stripe Product/Price Setup (User Task):** Create the "Pro" Product and its recurring Price in Stripe Test mode. Note the Price ID (`price_...`).
2.  **Database Migration:**
    *   Create migration file (`...002`) to add `stripe_customer_id` to `communities`.
    *   Create migration file (`...003`) to update `plans` table with `stripe_price_id`. (Requires manual update of placeholder ID).
3.  **Environment Setup:** Add Stripe keys and webhook secret to `.env.local`.
4.  **Implement Webhook Handler (`/api/webhooks/stripe`):** Handle key events (`checkout.session.completed`, `customer.subscription.*`, etc.) to update DB state.
5.  **Implement Backend API for Billing Info (`GET /api/community/billing-info`):** (New Step) Create endpoint to fetch community plan code, name, and stripe_customer_id.
6.  **Implement Checkout Session API (`/api/stripe/create-checkout-session`):** Handle customer creation/retrieval and session creation.
7.  **Implement Portal Session API (`/api/stripe/create-portal-session`):** Handle retrieval of customer ID and portal session creation.
8.  **Implement Frontend Hooks & Component:** Create `useCommunityBillingInfo`, `useCreateCheckoutSession`, `useCreatePortalSession` hooks and the `<BillingManagementSection />` component.
9.  **Integrate Billing Component:** Add `<BillingManagementSection />` to `AdminView.tsx`.
10. **Test Thoroughly:** End-to-end testing with Stripe test mode, webhooks, UI interactions.
11. **Integrate 402 Error Handling:** Enhance components triggering quotas to use the billing hooks/UI for upgrade prompts.
12. **(Phase 2) Metered Billing:** Implement steps outlined in Section 6 if/when needed.

## 8. Open Questions & Considerations

*   **Webhook Idempotency:** How will duplicate webhook events be handled? (e.g., check if state update already occurred).
*   **Error Handling:** Robust handling for Stripe API errors, network issues, invalid user states.
*   **Free Plan Handling:** Confirm all logic correctly bypasses Stripe for 'free' plan users.
*   **Trial Periods:** Will the 'pro' plan offer a trial period? This requires adjustments in Checkout session creation and webhook handling.
*   **UI Details:** Exact design and flow for the billing section and upgrade prompts.
*   **Security:** Ensure webhook secret is secure, restrict API key permissions if possible. 