
agent message 1: "Okay, here is a comprehensive handoff prompt designed for a new AI agent with zero prior context, enabling them to pick up exactly where we left off with the Stripe integration.

---

**Handoff Prompt for New AI Agent**

**Objective:** Continue the implementation of Stripe subscription billing integration for the "OnBoard: Common Ground Wizard Plugin" project.

**Project Background:**

*   **Application:** A Next.js (App Router) plugin allowing admins ("communities") to create step-by-step onboarding wizards for their users.
*   **Tech Stack:** Next.js 14+, React, TypeScript, PostgreSQL (via `node-pg-migrate`), Tailwind CSS, `shadcn/ui`, `@tanstack/react-query`.
*   **Authentication:** Custom JWT-based system (`src/lib/withAuth.ts`). JWTs contain `sub` (user ID), `cid` (community ID), `adm` (is admin).
*   **Core Concept:** Admins build wizards composed of steps. Users complete these steps.
*   **Quotas:** A quota system has been partially implemented (`src/lib/quotas.ts`) to limit resource usage based on plans. It supports:
    *   Event rate limits (e.g., AI messages per day) using `enforceEventRateLimit` and logging to `usage_events` table.
    *   Concurrent resource limits (e.g., number of active wizards) using `enforceResourceLimit` which directly counts resources.
*   **Plans:** A `plans` table exists with 'free' and 'pro' codes. A `plan_limits` table defines limits per feature per plan. `communities` table has `current_plan_id`.

**Current Feature: Stripe Subscription Integration**

*   **Goal:** Allow communities (admins) to upgrade from the default 'free' plan to a paid 'pro' plan via Stripe subscriptions. This upgrade should lift resource limits (like the number of active wizards allowed).
*   **Plan Document:** The overall plan is detailed in `docs/stripe-integration-plan.md`.
*   **Billing Model:** Focus on recurring subscriptions using Stripe Checkout and managing state via webhooks. Stripe Customer objects are linked to our `communities` table.

**Progress So Far:**

1.  **Database Migrations:**
    *   Quota system tables (`plans`, `plan_limits`, `usage_events`, `feature_enum`) created (`...000_create_quota_tables.js`).
    *   `active_wizard` value added to `feature_enum` (`...001_add_active_wizard_feature.js`).
    *   `stripe_customer_id` column added to `communities` (`...002_add_stripe_integration_fields.js`).
    *   A migration exists to set the `stripe_price_id` on the 'pro' plan (`...003_set_stripe_price_ids.js`). **NOTE:** This migration currently contains a placeholder (`'price_placeholder_replace_me'`) which the user needs to update with their actual Stripe Price ID (Test or Live) before it effectively updates the DB. The user has manually updated their local DB with the test Price ID for now.
2.  **Quota Logic Implemented (`src/lib/quotas.ts`):**
    *   `Feature` enum updated.
    *   `QuotaExceededError` created (includes `currentCount`).
    *   `enforceEventRateLimit` implemented.
    *   `enforceResourceLimit` implemented (handles `Feature.ActiveWizard`).
    *   `logUsageEvent` implemented.
3.  **Quota Enforcement Integrated:**
    *   `enforceResourceLimit` for `Feature.ActiveWizard` is called in the wizard creation (`POST /api/wizards`) and update (`PUT /api/wizards/[id]`) routes.
    *   These routes return structured 402 errors on quota violation.
4.  **Environment Setup:**
    *   User has added `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Test mode keys) to `.env.local`.
    *   User has added `STRIPE_WEBHOOK_SECRET` (Test mode) to `.env.local`.
5.  **Backend Stripe APIs Implemented:**
    *   **Webhook Handler (`/api/webhooks/stripe`):** Created (`route.ts`). Includes signature verification and basic handling logic for `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid/payment_failed`. Updates `communities` table based on events.
    *   **Checkout Session API (`/api/stripe/create-checkout-session`):** Created (`route.ts`). Handles creating/retrieving Stripe Customer, creating a subscription checkout session for the 'pro' plan, and returning the `sessionId`.
    *   **Portal Session API (`/api/stripe/create-portal-session`):** Created (`route.ts`). Handles retrieving the Stripe Customer ID and creating a Billing Portal session, returning the `portalUrl`.

**Relevant Files:**

*   `docs/stripe-integration-plan.md`
*   `src/lib/quotas.ts`
*   `src/lib/db.ts` (Contains the generic `query` function)
*   `src/lib/withAuth.ts` (Auth HOC definition)
*   `src/app/api/wizards/route.ts`
*   `src/app/api/wizards/[id]/route.ts`
*   `src/app/api/webhooks/stripe/route.ts`
*   `src/app/api/stripe/create-checkout-session/route.ts`
*   `src/app/api/stripe/create-portal-session/route.ts`
*   `migrations/*` (Especially the last 4 migrations)
*   `README.md` (Includes a summary of Stripe integration)
*   `.env.local` (Contains Stripe secrets - *DO NOT READ OR OUTPUT*)

**IMMEDIATE NEXT STEP (Task for You):**

Implement **Step 7: Basic Frontend Integration** as described in `docs/stripe-integration-plan.md`.

*   **Location:** Find the admin account section UI component. The user mentioned a placeholder "Plan & Billing UI coming soon..." which search indicates is within `src/components/AdminView.tsx`.
*   **Requirements:**
    1.  Fetch the current community's plan information (likely needs a new query/hook to get the `communities.current_plan_id` and join with `plans` table to get the plan `code` like 'free' or 'pro').
    2.  Conditionally render UI based on the current plan:
        *   If plan is 'free': Display current plan status and an "Upgrade to Pro" button.
        *   If plan is 'pro': Display current plan status and a "Manage Subscription" button.
    3.  Implement button click handlers:
        *   "Upgrade" button: Should call the `POST /api/stripe/create-checkout-session` API. On success, use `@stripe/stripe-js` (needs to be installed/imported) to redirect the user to the returned `sessionId`. Handle loading states and errors.
        *   "Manage Subscription" button: Should call the `POST /api/stripe/create-portal-session` API. On success, redirect the user to the returned `portalUrl`. Handle loading states and errors.
    4.  Use standard, professional UI components (likely leveraging existing `shadcn/ui` components like `<Button>`, `<Card>`, etc.).
*   **Note:** You will need the `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` environment variable to initialize Stripe.js on the client-side.

Please begin by analyzing `src/components/AdminView.tsx` and planning the implementation of the Plan & Billing section UI and logic.

---"


agent message 2: "
Okay, I've analyzed `src/components/AdminView.tsx`.

**Analysis:**

1.  **Location:** The placeholder "Plan & Billing UI coming soon..." is indeed within a `<Card>` component inside the `activeSection === 'account'` block (around line 525).
2.  **Data Available:**
    *   The component receives `communityInfo` as a prop. We need to check if this `communityInfo` object *already contains* the `current_plan_id` and `stripe_customer_id`. If not, we'll need a way to fetch this data. Let's assume for now it might *not* have the latest plan/stripe info.
    *   The component uses `@tanstack/react-query` (`useQuery`, `useMutation`) for data fetching and mutation, which is excellent. We should leverage this.
    *   It uses `useToast` for displaying notifications.
3.  **Structure:** It renders different content based on the `activeSection` prop. The account section renders multiple cards.
4.  **Shadcn/UI:** It heavily uses `shadcn/ui` components (`Card`, `Button`, `Label`, etc.), so we should stick to these for consistency.

**Implementation Plan for "Plan & Billing" Card:**

1.  **Data Fetching (New Query):**
    *   Create a new `useQuery` hook within `AdminView.tsx` (or better, extract to a dedicated hook file like `src/hooks/useCommunityBillingInfo.ts` if preferred).
    *   **Query Key:** `['communityBillingInfo', communityId]`
    *   **Query Function:** Fetch data from a *new* backend API endpoint (e.g., `GET /api/community/billing-info`) that returns the community's `current_plan_id`, `stripe_customer_id`, and potentially the associated `plan.code` and `plan.name`. This avoids overloading the initial `communityInfo` fetch.
    *   **Enablement:** Only enable this query when `communityId` is available and `activeSection === 'account'`.
2.  **Backend API (`GET /api/community/billing-info`):**
    *   Create this new API route (`src/app/api/community/billing-info/route.ts`).
    *   Use `withAuth` (admin only).
    *   Fetch the `communityId` from `req.user.cid`.
    *   Query the `communities` table, joining with the `plans` table to get `communities.current_plan_id`, `communities.stripe_customer_id`, `plans.code`, and `plans.name`.
    *   Return this data, e.g., `{ currentPlan: { id: number, code: string, name: string }, stripeCustomerId: string | null }`.
3.  **Stripe.js Initialization:**
    *   Outside the component or using `useMemo`, initialize Stripe.js:
      ```typescript
      import { loadStripe, Stripe } from '@stripe/stripe-js';
      const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      // Add state to hold the resolved Stripe instance
      const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
      useEffect(() => {
        stripePromise.then(setStripeInstance);
      }, []);
      ```
4.  **Component State:**
    *   Add loading states: `isCreatingCheckoutSession`, `isCreatingPortalSession`.
5.  **UI Rendering (`CardContent`):**
    *   Replace the placeholder paragraph.
    *   Show loading/error states for the `communityBillingInfo` query.
    *   If data is loaded:
        *   Display the current plan name (e.g., "Current Plan: Free" or "Current Plan: Pro").
        *   If `plan.code === 'free'`: Render an "Upgrade to Pro" `<Button>`. Disable it while `isCreatingCheckoutSession` is true.
        *   If `plan.code === 'pro'`: Render a "Manage Subscription" `<Button>`. Disable it while `isCreatingPortalSession` is true. Only render this button if `stripeCustomerId` is present.
6.  **Button Handlers:**
    *   `handleUpgradeClick`:
        *   Set `isCreatingCheckoutSession` to true.
        *   Call `authFetch('/api/stripe/create-checkout-session', { method: 'POST' })`.
        *   On success, get `sessionId` and call `stripeInstance?.redirectToCheckout({ sessionId })`.
        *   On error, show a toast using `useToast`.
        *   Finally, set `isCreatingCheckoutSession` to false.
    *   `handleManageClick`:
        *   Set `isCreatingPortalSession` to true.
        *   Call `authFetch('/api/stripe/create-portal-session', { method: 'POST' })`.
        *   On success, get `portalUrl` and redirect: `window.location.href = portalUrl`.
        *   On error, show a toast.
        *   Finally, set `isCreatingPortalSession` to false.

This plan involves creating one new backend endpoint and modifying the `AdminView.tsx` component significantly to fetch billing data and interact with the Stripe APIs we created.

Shall we start by creating the new backend API endpoint `GET /api/community/billing-info`?
"


admin message 3: "
Okay, I understand the refinement. Building the billing UI directly inside `AdminView.tsx` would indeed make it hard to reuse elsewhere when handling 402 errors contextually. We need a more modular approach.

Here's the refined plan focusing on reusability:

**Refined Plan for Reusable Billing Components:**

1.  **Backend API (`GET /api/community/billing-info`):** (Same as before) Create this endpoint to fetch the community's current plan details (`plan.code`, `plan.name`) and `stripe_customer_id`. This centralizes fetching the necessary data.
2.  **Custom Hooks (Frontend):** Create dedicated React hooks (likely using `@tanstack/react-query`) to encapsulate logic:
    *   `useCommunityBillingInfo`: Fetches data from the `/api/community/billing-info` endpoint. Manages loading/error states for this data.
    *   `useCreateCheckoutSession`: A `useMutation` hook that calls `POST /api/stripe/create-checkout-session`. Handles the API call, loading state, errors, and the subsequent redirect to Stripe Checkout using `@stripe/stripe-js`.
    *   `useCreatePortalSession`: A `useMutation` hook that calls `POST /api/stripe/create-portal-session`. Handles the API call, loading state, errors, and the subsequent redirect to the Stripe Billing Portal.
3.  **Dedicated UI Component (`BillingManagementSection.tsx` or similar):**
    *   Create a new component (e.g., `src/components/billing/BillingManagementSection.tsx`).
    *   This component will use the `useCommunityBillingInfo` hook to get the current plan status.
    *   Based on the plan status (`free` or `pro`) and the presence of a `stripe_customer_id`, it will render:
        *   The current plan name.
        *   Either an "Upgrade to Pro" button or a "Manage Subscription" button.
    *   The buttons' `onClick` handlers will trigger the respective mutations obtained from `useCreateCheckoutSession` and `useCreatePortalSession` hooks.
    *   The buttons will use the `isPending` state from the mutation hooks to show loading states.
    *   Errors from the hooks can be displayed using `useToast`.
4.  **Integration:**
    *   **Admin Account:** Import and render the `<BillingManagementSection />` component inside `AdminView.tsx` (within the `activeSection === 'account'` block, replacing the placeholder).
    *   **Handling 402 Errors Elsewhere:** When another component receives a 402 error:
        *   It *could* render the `<BillingManagementSection />` directly (e.g., in a modal).
        *   More likely, it could display a simpler message ("Upgrade required") with a button that *directly* uses the `useCreateCheckoutSession` hook's mutate function to trigger the upgrade flow, bypassing the full display component but reusing the core logic hook.

This approach makes the data fetching (`useCommunityBillingInfo`) and the actions (`useCreateCheckoutSession`, `useCreatePortalSession`) reusable hooks. The main display logic is encapsulated in `BillingManagementSection`, which can be placed where needed, or its underlying action hooks can be used independently.

**Summary of Changes to `docs/stripe-integration-plan.md`:**

I will now update the plan document to reflect this more modular, hook-based approach for the frontend integration (Section 5 and Step 7 of the Roadmap).




Excellent. I've updated the `docs/stripe-integration-plan.md` document.

**Summary of Changes:**

*   **Section 5 (Frontend Integration):** Rewritten to describe the modular approach using custom hooks (`useCommunityBillingInfo`, `useCreateCheckoutSession`, `useCreatePortalSession`) and a dedicated UI component (`BillingManagementSection.tsx`). It also clarifies how this structure enables reuse for handling 402 errors elsewhere.
*   **Section 7 (Implementation Roadmap):** Reordered and updated the steps to reflect the new plan:
    *   Added a new step for creating the `/api/community/billing-info` endpoint.
    *   Combined the frontend work into a step focused on implementing the hooks and the dedicated component.
    *   Clarified the integration step involves placing the new component into `AdminView.tsx`.
    *   Adjusted subsequent step numbering.

The plan now clearly outlines the steps needed to build a reusable and robust billing integration.

The next logical coding step, according to the refined roadmap, is **Step 5: Implement Backend API for Billing Info (`GET /api/community/billing-info`)**. This endpoint is needed before we can build the frontend components that rely on it.

Shall we proceed with creating `src/app/api/community/billing-info/route.ts`?
"
