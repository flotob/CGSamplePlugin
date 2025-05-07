# Roadmap: Refactoring Stripe Integration for New Tab Checkout/Portal Flow

## 1. Objective

To adapt the Stripe Checkout and Customer Portal integration within the Common Ground Wizard Plugin to align with new platform constraints. Specifically, the plugin can no longer use `window.top.location.href` for navigation. Instead, it must utilize a new `cglibinstance.navigate(url: string)` function provided by the Common Ground platform, which opens the specified URL in a new browser tab/window.

This refactor aims to:
- Maintain seamless Stripe Checkout and Billing Portal functionality.
- Implement an interstitial page pattern to manage the new-tab flow effectively.
- Ensure reliable communication of payment/portal outcomes back to the plugin iframe.
- Preserve or improve the user experience during these critical billing interactions.

## 2. Current Flow Issues & Motivation for Change

The existing Stripe integration relies on the ability to redirect the top-level window to Stripe's pages. The Common Ground platform has restricted this capability for security and UX consistency reasons, necessitating a new approach. The `cglibinstance.navigate()` function opens a new tab, which means the previous direct redirection and same-tab callback mechanisms are no longer viable.

The new flow, based on opening a new tab and communicating back, is described in `docs/new-checkout-flow.md` and is a standard pattern for such scenarios.

## 3. Proposed New End-to-End Flow

The new flow will proceed as follows:

1.  **User Action in Plugin**: User clicks an "Upgrade Plan" or "Manage Billing" button within the plugin iframe.
2.  **Plugin Backend Call**: The plugin frontend (e.g., `useCreateCheckoutSession.ts` or `useCreatePortalSession.ts`) calls its backend API (`/api/stripe/create-checkout-session` or `/api/stripe/create-portal-session`) to obtain a Stripe session URL or portal URL.
3.  **Plugin Calls `cglibinstance.navigate()`**:
    *   The plugin frontend receives the Stripe URL from its backend.
    *   It constructs a URL for a new "interstitial" page hosted by the plugin itself (e.g., `https://<plugin_domain>/stripe-handler`). This interstitial URL will include the actual Stripe URL as a query parameter (e.g., `?stripeTargetUrl=ENCODED_STRIPE_URL`).
    *   The plugin calls `cglibinstance.navigate(interstitialPageUrl)`.
4.  **Interstitial Page (`/stripe-handler`) in New Tab**:
    *   The Common Ground platform opens the interstitial page URL in a new browser tab.
    *   This page (e.g., `app/stripe-handler/page.tsx`) loads, extracts the `stripeTargetUrl` from its query parameters.
    *   It immediately redirects itself (the new tab) to this `stripeTargetUrl` using `window.location.href = stripeTargetUrl`.
5.  **Redirect to Stripe (Checkout/Portal)**: The new tab is now navigated to Stripe's checkout page or customer portal.
6.  **User Completes Action on Stripe**: The user interacts with Stripe (completes payment, manages subscription, etc.).
7.  **Stripe Redirects to Callback Page (`/stripe-callback`) in New Tab**:
    *   Upon completion/cancellation, Stripe redirects the new tab to the `success_url`, `cancel_url` (for checkout), or `return_url` (for portal) that was configured during the Stripe session creation.
    *   These URLs will now point to another new page hosted by the plugin itself (e.g., `https://<plugin_domain>/stripe-callback`), and will include status information from Stripe as query parameters (e.g., `?status=success&session_id=...` or `?status=portal_return`).
8.  **Callback Page Sends Message to Original Plugin Tab**:
    *   The callback page (e.g., `app/stripe-callback/page.tsx`) loads in the new tab.
    *   It parses the query parameters received from Stripe.
    *   It uses `BroadcastChannel` (e.g., with a channel name like `'stripe_payment_results'`) to send a message containing the outcome (e.g., `{ type: 'stripeCallback', status: 'success', data: { sessionId: '...' } }`) to any listening contexts on the same origin.
9.  **Callback Page Closes Itself**: After successfully posting the message, the callback page attempts to close the new tab using `window.close()`. It should also display a brief fallback message (e.g., "Processing... you can now close this tab.") in case the automatic closure is blocked or delayed.
10. **Original Plugin Tab Receives Message and Updates UI**:
    *   The main plugin component (e.g., `PluginContainer.tsx`) in the original tab will have a `BroadcastChannel` listener.
    *   Upon receiving the message from the callback page, it processes the data.
    *   It updates the UI accordingly (e.g., shows a success/failure toast, invalidates relevant React Query keys like `communityBillingInfo` to refetch data, potentially navigates the user within the plugin).

## 4. Affected Components and Modules

The following existing files/modules will require modification:

*   `src/app/api/auth/session/route.ts` (and the client-side code that calls it, likely in `src/context/AuthContext.tsx` or related login logic)
*   `src/hooks/useCreateCheckoutSession.ts`
*   `src/hooks/useCreatePortalSession.ts`
*   `src/app/api/stripe/create-checkout-session/route.ts`
*   `src/app/api/stripe/create-portal-session/route.ts`
*   `src/app/PluginContainer.tsx` (or wherever the message listener for Stripe callbacks is/should be centralized)

New files/modules to be created:

*   `src/app/stripe-handler/page.tsx` (Next.js App Router page for the interstitial step)
*   `src/app/stripe-callback/page.tsx` (Next.js App Router page for handling Stripe's redirect and messaging back)

## 5. Detailed Implementation Steps (Tasks)

### Task 0: JWT Payload Enhancement (Prerequisite)

*   **Sub-task 0.1: Update Client-Side JWT Request Logic**
    *   Identify the client-side code that calls the `/api/auth/session` endpoint (likely within `src/context/AuthContext.tsx` or a related login function).
    *   Modify this logic to first fetch `communityInfo` (using `cgInstance.getCommunityInfo()`) and `pluginContextData` (using `cgInstance.getContextData()`).
    *   Extract `communityUrlIdentifier = communityInfo.url` and `pluginIdentifier = pluginContextData.pluginId`.
        *   *Note: Confirmed during implementation that `cgInstance.getContextData()` returns an object with a `pluginId` property containing the plugin definition ID.*
    *   Include these identifiers in the request body sent to `/api/auth/session`.

*   **Sub-task 0.2: Modify `/api/auth/session/route.ts`**
    *   Update the `SessionRequestBody` interface to include `communityUrlIdentifier` and `pluginIdentifier`.
    *   Modify the handler to receive these new values from the request body.
    *   Update the `JwtPayload` interface to include new claims, for example, `curl` (for community URL identifier) and `pid` (for plugin ID).
    *   Add these new claims to the JWT payload when the token is signed.
        *   Example: `curl: communityUrlIdentifier`, `pid: pluginIdentifier`.

### Task 1: Backend API Modifications (Stripe Routes)

*   **Sub-task 1.1: Modify `create-checkout-session` API (`src/app/api/stripe/create-checkout-session/route.ts`)**
    *   The API handler will now access `communityUrlIdentifier` and `pluginIdentifier` from the JWT claims (e.g., `req.user.curl`, `req.user.pid`) instead of the direct request body.
    *   Change the response to return the full `session.url` from the Stripe session object instead of (or in addition to) `session.id`.
        *   Current: `return NextResponse.json({ sessionId: session.id });`
        *   New: `return NextResponse.json({ sessionId: session.id, sessionUrl: session.url });`
    *   Update the `success_url` and `cancel_url` parameters passed to `stripe.checkout.sessions.create`. They must now point to the new plugin-hosted callback page and include the identifiers sourced from the JWT.
        *   Requires an environment variable `NEXT_PUBLIC_PLUGIN_URL` (e.g., `http://localhost:5000` in dev, actual plugin deployment URL in prod).
        *   Example new `success_url`: `${process.env.NEXT_PUBLIC_PLUGIN_URL}/stripe-callback?status=success&session_id={CHECKOUT_SESSION_ID}&community_identifier=${req.user.curl}&plugin_identifier=${req.user.pid}`
        *   Example new `cancel_url`: `${process.env.NEXT_PUBLIC_PLUGIN_URL}/stripe-callback?status=cancel&community_identifier=${req.user.curl}&plugin_identifier=${req.user.pid}`

*   **Sub-task 1.2: Modify `create-portal-session` API (`src/app/api/stripe/create-portal-session/route.ts`)**
    *   The API handler will now access `communityUrlIdentifier` and `pluginIdentifier` from the JWT claims (e.g., `req.user.curl`, `req.user.pid`) instead of the direct request body.
    *   Update the `return_url` parameter passed to `stripe.billingPortal.sessions.create`. It must now point to the new plugin-hosted callback page and include the identifiers sourced from the JWT.
        *   Example new `return_url`: `${process.env.NEXT_PUBLIC_PLUGIN_URL}/stripe-callback?status=portal_return&community_identifier=${req.user.curl}&plugin_identifier=${req.user.pid}`

### Task 2: Create New Frontend Pages

*   **Sub-task 2.1: Implement Interstitial Page (`src/app/stripe-handler/page.tsx`)**
    *   This page should be a simple client component.
    *   On load (`useEffect`), it reads a `stripeTargetUrl` query parameter.
    *   It performs a `window.location.href = stripeTargetUrl` to redirect the current (new) tab.
    *   Include minimal UI (e.g., "Redirecting to Stripe...").

*   **Sub-task 2.2: Implement Callback Page (`src/app/stripe-callback/page.tsx`)**
    *   This page should be a client component.
    *   On load (`useEffect`):
        *   Parse query parameters from Stripe (e.g., `status`, `session_id`, any error codes).
        *   Initialize a `BroadcastChannel` (e.g., `new BroadcastChannel('stripe_payment_results')`).
        *   Post a message to the channel with the parsed status and data. Example message: `{ type: 'stripeCallback', status: 'success', data: { sessionId: 'cs_123' } }` or `{ type: 'stripeCallback', status: 'cancel' }` or `{ type: 'stripeCallback', status: 'portal_return' }`.
        *   Call `bc.close()` after posting.
        *   Attempt to `window.close()` the tab.
    *   Display a user-friendly message (e.g., "Payment processing complete. You can now close this tab." or "Returning to application...").

### Task 3: Update Client-Side Hooks for Stripe Interaction

*   **Sub-task 3.1: Refactor `useCreateCheckoutSession.ts`**
    *   This hook will no longer need to fetch `communityInfo.url` or `pluginContextData.id` itself, nor send them in the request body to its backend API. The backend will obtain these from the JWT.
    *   When the mutation is called:
        *   It should now expect `sessionUrl` (and optionally `sessionId`) from the backend response.
        *   Construct the interstitial URL: `const interstitialUrl = \`\${process.env.NEXT_PUBLIC_PLUGIN_URL}/stripe-handler?stripeTargetUrl=\${encodeURIComponent(sessionUrl)}\`;`
        *   Call `cglibinstance.navigate(interstitialUrl)`.
        *   Remove the direct call to `stripe.redirectToCheckout()`.

*   **Sub-task 3.2: Refactor `useCreatePortalSession.ts`**
    *   This hook will no longer need to fetch `communityInfo.url` or `pluginContextData.id` itself, nor send them in the request body to its backend API. The backend will obtain these from the JWT.
    *   When the mutation is called:
        *   It receives `portalUrl` from the backend (this part is likely unchanged).
        *   Construct the interstitial URL: `const interstitialUrl = \`\${process.env.NEXT_PUBLIC_PLUGIN_URL}/stripe-handler?stripeTargetUrl=\${encodeURIComponent(portalUrl)}\`;`
        *   Call `cglibinstance.navigate(interstitialUrl)`.
        *   Remove the direct call to `window.top.location.href`.

### Task 4: Implement/Update Plugin Message Listener

*   **Sub-task 4.1: Modify/Add Listener in `src/app/PluginContainer.tsx` (or a more suitable centralized location)**
    *   Set up a `BroadcastChannel` listener in a `useEffect` hook, listening to the same channel name used by `/stripe-callback` (e.g., `'stripe_payment_results'`).
    *   The message handler should:
        *   Verify the message structure (e.g., `event.data.type === 'stripeCallback'`).
        *   Extract `status` and any associated `data` from `event.data`.
        *   Call `queryClient.invalidateQueries({ queryKey: ['communityBillingInfo', communityId] })` to refresh billing status from the backend (which is updated by Stripe webhooks).
        *   Show appropriate toast notifications based on the status (success, cancellation, portal return) using `useToast()`.
    *   Ensure the listener is properly cleaned up (`bc.close()`, `bc.onmessage = null`) when the component unmounts.
    *   The existing `postMessage` listener (which expects messages from `PARENT_APP_URL`) can remain for other purposes if any, but the Stripe callback logic should primarily use the `BroadcastChannel` for this new flow.

### Task 5: Environment Variables

*   **Sub-task 5.1: Add and Configure `NEXT_PUBLIC_PLUGIN_URL`**
    *   Define this environment variable in `.env.example` and ensure it's set in local `.env` files (e.g., `NEXT_PUBLIC_PLUGIN_URL=http://localhost:5000`).
    *   Ensure this variable is correctly configured in all deployment environments (Vercel, etc.) to the plugin's actual public URL.

### Task 6: Testing

*   Thoroughly test the end-to-end checkout flow:
    *   Successful payment.
    *   Cancelled payment from Stripe's page.
*   Thoroughly test the end-to-end customer portal flow:
    *   Opening the portal.
    *   Returning from the portal.
*   Verify:
    *   New tabs open and close as expected.
    *   The original plugin tab receives messages and updates its UI (toasts, data refresh) correctly.
    *   Backend database (plan status, Stripe customer IDs) is correctly updated via webhooks (this part of the system should remain largely unaffected but needs to be confirmed).
    *   Test in different browsers if feasible (Chrome, Firefox, Safari).

### Task 7: Documentation

*   Update the Stripe Integration section in `README.md` to reflect the new new-tab flow if details there are now outdated.
*   This roadmap document will serve as the primary planning document for this refactor.

## 6. Inter-Tab Communication Strategy

*   **Primary Method:** `BroadcastChannel` API.
    *   **Channel Name:** `stripe_payment_results` (or similar, to be finalized).
    *   This is suitable as both the plugin iframe and the `/stripe-callback` page are served from the same origin. It's a modern API designed for this kind of same-origin, cross-tab communication.
*   **Fallback Method (If Needed):** `window.opener.postMessage()`. While `BroadcastChannel` is preferred, `postMessage` could be a fallback. If used, the `/stripe-callback` page would use `window.opener.postMessage(message, process.env.NEXT_PUBLIC_PLUGIN_URL)`. The `PluginContainer.tsx` would need its `message` listener adjusted to accept messages from its own origin for this specific message type.

## 7. Open Questions & Considerations

*   **Error Handling**:
    *   What if `cglibinstance.navigate()` fails to open a new tab (e.g., aggressive popup blockers, though less likely for user-initiated actions through a platform API)? The plugin should ideally show an error to the user.
    *   How to handle errors if the `/stripe-handler` page fails to receive `stripeTargetUrl` or if the URL is invalid?
    *   How to handle errors if the `/stripe-callback` page fails to post its message or if `window.close()` is blocked? (The fallback UI text helps here).
*   **Security of Interstitial Page**: Ensure `stripeTargetUrl` is properly encoded/decoded and that the interstitial page only redirects to legitimate Stripe URLs if any validation is added (though direct redirection of the provided URL is simplest).
*   **User Experience Details**:
    *   Loading states/spinners on the interstitial and callback pages.
    *   Clarity of messages shown to the user on these pages.
*   **Final Naming**: Confirm final names for new routes (e.g., `/stripe-handler`, `/stripe-callback`) and the BroadcastChannel.

## 8. Success Criteria

*   Stripe Checkout flow (initiating subscription) is fully functional using the new-tab mechanism.
*   Stripe Customer Portal flow (managing existing subscription) is fully functional using the new-tab mechanism.
*   The user is returned to the plugin iframe with clear UI feedback (toasts, updated billing information) after completing actions in Stripe.
*   The new tab used for Stripe interaction closes automatically.
*   The solution is robust and handles common scenarios (success, cancellation, portal return).
*   Backend data integrity (via existing webhooks) is maintained.
*   The implementation adheres to the constraints imposed by the Common Ground platform. 