# Research: Adding a Premium Plan

This document outlines the research and steps required to add a new "Premium Plan" to the application.

## 1. Stripe Setup (Conceptual)

Before implementing any code, the following needs to be configured in the Stripe dashboard:

1.  **Create a New Product:**
    *   Go to "Products" in the Stripe dashboard.
    *   Click "+ Add product".
    *   Name: e.g., "Premium Tier"
    *   (Optional) Description, image, etc.
    *   Ensure the product is marked as "Active".

2.  **Create a New Price for the Product:**
    *   Under the newly created "Premium Tier" product, click "+ Add price".
    *   Pricing model: Standard pricing or Package pricing (likely Standard).
    *   Price: e.g., $25.00 (or your desired price). This will be entered as cents in the database, e.g., `2500`.
    *   Currency: USD (or your desired currency).
    *   Billing period: Monthly (or your desired period).
    *   Usage type: Licensed (standard recurring charge).
    *   Save the price.
    *   **Crucially, note down the generated Price ID (e.g., `price_xxxxxxxxxxxxxx`). This `stripe_price_id` will be needed for the database and backend configuration.**

## 2. Database Schema Changes

Based on the existing schema (`docs/current-db-schema.db`) and the provided `SELECT` statements, the following database changes are needed.

### 2.1. `plans` Table

A new row needs to be inserted into the `plans` table.

*   **Current `plans` data:**
    ```sql
    -- id | code | name       | price_cents | stripe_price_id              | is_active
    -- ---|------|------------|-------------|------------------------------|-----------
    --  1 | free | Free Tier  | 0           | NULL                         | 1 (true)
    --  2 | pro  | Pro Tier   | 1000        | price_1RKz24Q6xikS4G1Hi0do9BxT | 1 (true)
    ```

*   **New "Premium Plan" entry:**
    *   `id`: 3 (assuming auto-increment or next available)
    *   `code`: 'premium'
    *   `name`: 'Premium Tier'
    *   `price_cents`: 2500 (assuming $25.00, adjust as needed)
    *   `stripe_price_id`: (This will be the ID from Stripe after creating the price, e.g., `price_PREMIUMXXXXXX`)
    *   `is_active`: true (or 1)

### 2.2. `plan_limits` Table

New rows need to be inserted into the `plan_limits` table for the "Premium Plan" (`plan_id = 3`), corresponding to each `feature_enum`.

*   **Current `plan_limits` data for Free (plan_id=1) and Pro (plan_id=2):**
    ```sql
    -- plan_id | feature          | time_window | hard_limit
    -- --------|------------------|-------------|------------
    --       1 | active_wizard    | 00:00:00    | 3
    --       2 | active_wizard    | 00:00:00    | 10
    --       1 | image_generation | 30 days     | 5
    --       2 | image_generation | 30 days     | 100
    --       1 | ai_chat_message  | 1 day       | 20
    --       2 | ai_chat_message  | 1 day       | 200
    ```

*   **New "Premium Plan" limits (assuming `plan_id = 3`):**
    *   `plan_id`: 3, `feature`: 'active_wizard', `time_window`: '00:00:00' (interpreted as no window, just a max count), `hard_limit`: 25 (assumption)
    *   `plan_id`: 3, `feature`: 'image_generation', `time_window`: '30 days', `hard_limit`: 500 (assumption)
    *   `plan_id`: 3, `feature`: 'ai_chat_message', `time_window`: '1 day', `hard_limit`: 1000 (assumption)

    *(Note: The exact `feature_enum` values should be confirmed from the database schema if they differ from 'active_wizard', 'image_generation', 'ai_chat_message'.)*

## 3. Stripe Checkout Implementation Analysis

### 3.1. Frontend Component: `src/components/billing/BillingManagementSection.tsx`

*   **Current Behavior:**
    *   Displays current plan details.
    *   Shows an "Upgrade to Pro" button if the current plan is not 'pro'. This button calls `createCheckoutSession()` from `useCreateCheckoutSession`.
    *   Shows a "Manage Subscription" button if the current plan is 'pro'. This button calls `createPortalSession()` from `useCreatePortalSession`.
*   **Required Changes for Premium Plan:**
    *   **UI Update:** Modify the UI to display all available plans (Free, Pro, Premium) and their features/limits, potentially in a comparison table similar to the user-provided image.
    *   **Button Logic:**
        *   If current plan is "Free": Show "Upgrade to Pro" and "Upgrade to Premium" buttons.
        *   If current plan is "Pro": Show "Upgrade to Premium" button. (Optionally, a "Downgrade to Free" via Stripe Portal could be a consideration but is out of scope for the initial request).
        *   If current plan is "Premium": Clearly indicate it's the current plan. "Manage Subscription" button should still be available.
    *   **`createCheckoutSession` Calls:** The `createCheckoutSession` mutation (and subsequently its hook and API route) will need to be parameterized to accept the `code` (e.g., 'pro', 'premium') or `stripe_price_id` of the target plan.

### 3.2. Frontend Hooks: `src/hooks/useCreateCheckoutSession.ts`

*   **Current Behavior:**
    *   Makes a `POST` request to `/api/stripe/create-checkout-session` without a body (relies on JWT for context).
*   **Required Changes for Premium Plan:**
    *   The `mutationFn` within `useCreateCheckoutSession` must be modified to accept an argument, e.g., `targetPlanCode: string`.
    *   This `targetPlanCode` must be included in the body of the `POST` request to the API endpoint.
        ```typescript
        // Example modification in useCreateCheckoutSession.ts
        // const mutationFn = async (targetPlanCode: string) => {
        //   return await authFetch<CreateCheckoutSessionResponse>('/api/stripe/create-checkout-session', {
        //     method: 'POST',
        //     body: JSON.stringify({ targetPlanCode }), // Pass target plan
        //   });
        // };
        ```

### 3.3. API Route: `src/app/api/stripe/create-checkout-session/route.ts`

*   **Current Behavior:**
    *   Hardcoded to fetch the `stripe_price_id` for the 'pro' plan.
    *   Creates a Stripe customer if one doesn't exist for the community.
    *   Creates a Stripe Checkout session for the 'pro' plan.
    *   Requires admin privileges.
*   **Required Changes for Premium Plan:**
    *   **Accept Target Plan:** The route must now expect a `targetPlanCode` (e.g., 'pro', 'premium') in the request body.
    *   **Dynamic Price ID Fetching:** Modify the database query to fetch the `stripe_price_id` based on the received `targetPlanCode` instead of hardcoding 'pro'.
        ```typescript
        // Example modification in POST /api/stripe/create-checkout-session
        // const { targetPlanCode } = await req.json(); // Assuming req.json() middleware is used or req.body exists
        // const planResult = await query<PlanRow>(
        //   `SELECT id, code, stripe_price_id FROM plans WHERE code = $1 AND is_active = true`,
        //   [targetPlanCode]
        // );
        // const targetPriceId = planResult.rows[0]?.stripe_price_id;
        // ... use targetPriceId in stripe.checkout.sessions.create
        ```
    *   **Subscription Upgrades (Stripe handles this):** When creating a checkout session for a customer who already has an active subscription (e.g., upgrading from Pro to Premium), Stripe's Checkout session (`mode: 'subscription'`) can handle upgrades. If the `customer` ID provided to `stripe.checkout.sessions.create` has an existing subscription, Stripe can manage proration and create an upgrade.
        *   We need to ensure the `customer` ID passed to `stripe.checkout.sessions.create` is the existing `stripe_customer_id` for the community.
        *   The `line_items` should contain the `price` ID of the *new* target plan (Premium).
    *   **Admin Restriction:** The current admin restriction (`withAuth(..., true)`) should be reviewed. If community owners (who might not be platform super-admins) are supposed to manage their own community's subscription, this might need adjustment. For now, we assume it remains admin-only for initiating upgrades.

### 3.4. Stripe Webhook Handler (e.g., `/api/webhooks/stripe/route.ts` - *needs path verification*)

*   **Current Behavior (Assumed):**
    *   Handles events like `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, etc.
    *   Updates the `communities` table `current_plan_id` based on the Stripe event data.
*   **Required Changes for Premium Plan:**
    *   **Verify Handler Path:** Confirm the exact path to the Stripe webhook handler.
    *   **Plan Identification:** Ensure the webhook logic correctly identifies the subscribed plan. The `checkout.session.completed` event object contains `line_items`, which includes `price.id` (this is the `stripe_price_id`). For other events like `customer.subscription.updated`, the subscription object will contain `items.data[0].price.id`.
    *   **Update `current_plan_id`:** The logic that updates `current_plan_id` in the `communities` table must be robust enough to find the correct internal plan ID by matching the `stripe_price_id` from the event with the `stripe_price_id` in the `plans` table.
        ```sql
        -- Example: Find internal plan_id based on stripe_price_id from webhook
        -- SELECT id FROM plans WHERE stripe_price_id = $1;
        ```
    *   This ensures that when a user subscribes to Free, Pro, or the new Premium plan, or changes between them, the `communities.current_plan_id` is accurately updated.

## 4. Database Migration Script

Based on the existing migration files in the `/migrations` folder, a new migration script will be needed to add the "Premium Plan" and its associated limits to the database. The script will use `node-pg-migrate`.

**File Name:** `YYYYMMDDHHMMSS_add_premium_plan.js` (Replace `YYYYMMDDHHMMSS` with the current timestamp when creating the file).

**Content:**

```javascript
exports.shorthands = undefined;

exports.up = async (pgm) => {
  // Assumptions for the Premium Plan:
  // - Plan ID: 3 (ensure this is the next available ID in your 'plans' table)
  // - Plan Code: 'premium'
  // - Plan Name: 'Premium Tier'
  // - Price (cents): 2500 (i.e., $25.00)
  // - Stripe Price ID: Set to actual ID provided by user
  //
  // - Limits:
  //   - Active Wizards: 25 (no specific time window, interpreted as max count)
  //   - Image Generations: 500 per '30 days'
  //   - AI Chat Messages: 1000 per '1 day'

  const premiumPlanStripePriceId = 'price_1RMx4LQ6xikS4G1HjX0CN9A2'; // ACTUAL STRIPE PRICE ID

  // Insert the new Premium Plan
  await pgm.db.query(
    `INSERT INTO plans (id, code, name, price_cents, stripe_price_id, is_active)
     VALUES (3, 'premium', 'Premium Tier', 2500, $1, true)
     ON CONFLICT (id) DO NOTHING; -- Or handle conflict as appropriate for your setup (e.g., DO UPDATE)
    `,
    [premiumPlanStripePriceId]
  );
  // Note: If your 'plans.id' is auto-incrementing (SERIAL/IDENTITY), 
  // you might not specify 'id' in the INSERT, or use a subquery to get the nextval if needed.
  // However, given existing data has id 1 and 2, explicitly setting to 3 is assumed here for simplicity.

  // Insert limits for the Premium Plan (plan_id = 3)
  const planLimits = [
    { plan_id: 3, feature: 'active_wizard',    time_window: '0 hours', hard_limit: 25 },    // '0 hours' or '00:00:00' for no window
    { plan_id: 3, feature: 'image_generation', time_window: '30 days', hard_limit: 500 },
    { plan_id: 3, feature: 'ai_chat_message',  time_window: '1 day',   hard_limit: 1000 },
  ];

  for (const limit of planLimits) {
    await pgm.db.query(
      `INSERT INTO plan_limits (plan_id, feature, time_window, hard_limit)
       VALUES ($1, $2, $3::interval, $4)
       ON CONFLICT (plan_id, feature, time_window) DO NOTHING; -- Or handle conflict
      `,
      [limit.plan_id, limit.feature, limit.time_window, limit.hard_limit]
    );
  }
};

exports.down = async (pgm) => {
  // Remove Premium Plan limits
  await pgm.db.query(`DELETE FROM plan_limits WHERE plan_id = 3;`);

  // Remove the Premium Plan itself
  await pgm.db.query(`DELETE FROM plans WHERE code = 'premium' AND id = 3;`);
  
  // Optional: If using a sequence for plan IDs and want to reset it if 3 was the last one.
  // This is generally not recommended unless you are sure about the state.
  // Example: await pgm.db.query("SELECT setval('plans_id_seq', COALESCE((SELECT MAX(id) FROM plans), 1));");
};
```

**Important Considerations for the Migration Script:**

*   **Stripe Price ID:** The placeholder `price_PREMIUMXXXXXX` **MUST** be replaced with the actual Price ID generated in Stripe for the Premium plan.
*   **Plan ID (`id: 3`):** This assumes `3` is the next available and appropriate ID for the new plan. If `plans.id` is a serial/identity column, the insert might be simpler, or you might need to fetch the `currval` or `nextval` if explicit ID setting isn't desired. For consistency with existing data (id 1 and 2), explicit setting to 3 is shown.
*   **`feature_enum` values:** The script uses 'active_wizard', 'image_generation', and 'ai_chat_message'. These must match the actual enum values defined in your database (`feature_enum`).
*   **Conflict Handling:** `ON CONFLICT DO NOTHING` is used as a basic way to make the script idempotent. You might need a different conflict resolution strategy (e.g., `DO UPDATE`) depending on your requirements.
*   **`time_window` for `active_wizard`:** The example uses '0 hours' for the `active_wizard` limit's time window, assuming it's a total cap rather than a timed one. The existing data uses '00:00:00', which PostgreSQL interprets as a zero-duration interval. Using '0 hours' or '0 seconds' should also work. Consistency with existing interpretation is key.
*   **`exports.down`:** The `down` migration is provided to revert the changes. Care should be taken if other data depends on these entries. 