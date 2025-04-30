# Common Ground Plugin Research

This document outlines the mechanism by which the sample plugin interacts with the Common Ground (CG) application environment and provides recommendations for extending it into a modern mini-app.

## How the Plugin Interacts with Common Ground

The sample plugin utilizes libraries provided by Common Ground (`@common-ground-dao/cg-plugin-lib` on the frontend and `@common-ground-dao/cg-plugin-lib-host` on the backend) to facilitate communication and data exchange.

The key components involved are:

1.  **Frontend (`src/app/myInfo.tsx`):**
    *   Uses `CgPluginLib` from `@common-ground-dao/cg-plugin-lib`.
    *   Retrieves an `iframeUid` from URL parameters, uniquely identifying this plugin instance.
    *   Initializes `CgPluginLib` using the `iframeUid`, the plugin's public key (`NEXT_PUBLIC_PUBKEY`), and a backend signing endpoint (`/api/sign`).
    *   Calls methods like `getUserInfo()`, `getCommunityInfo()`, `getUserFriends()`, and `giveRole()` on the initialized library instance.

2.  **Backend Signing Endpoint (`src/app/api/sign/route.ts`):**
    *   Uses `CgPluginLibHost` from `@common-ground-dao/cg-plugin-lib-host`.
    *   Initializes `CgPluginLibHost` using the plugin's private key (`NEXT_PRIVATE_PRIVKEY`) and public key (`NEXT_PUBLIC_PUBKEY`).
    *   Receives request payloads (presumably from the frontend library).
    *   Uses `cgPluginLibHost.signRequest()` to sign the payload with the private key.
    *   Returns the original payload along with the generated signature.

3.  **Communication Flow (Inferred):**
    *   The frontend library (`CgPluginLib`) prepares a request (e.g., for user info).
    *   It sends this request payload to the plugin's backend signing endpoint (`/api/sign`).
    *   The backend signs the payload using the plugin's private key and returns the signed request.
    *   The frontend library receives the signed request.
    *   It then likely uses a mechanism like `window.postMessage` to send the signed request to the parent Common Ground application window/iframe host.
    *   The Common Ground host verifies the signature using the plugin's registered public key and processes the request (e.g., returns user info or performs an action like giving a role).
    *   The response is sent back to the plugin's iframe, again likely via `postMessage`, where the frontend library receives it and resolves the initial promise (e.g., `getUserInfo().then(...)`).

This mechanism ensures that requests allegedly coming from the plugin are authenticated using the key pair associated with the plugin.

## Recommendations for Extension into a Modern Mini-App

This sample provides a solid foundation. To build a more complex, modern mini-app within Common Ground, consider the following:

1.  **Component Structure:** Break down the UI into smaller, reusable React components. Instead of having all logic in `myInfo.tsx`, create dedicated components for different features (e.g., `UserProfile`, `FriendList`, `RoleManager`, `FeatureSpecificComponent`).
2.  **State Management:** For managing state beyond simple `useState` (especially if shared across multiple components), consider:
    *   **React Context API:** Suitable for passing CG data (like `userInfo`, `communityInfo`) down the component tree without prop drilling.
    *   **State Management Libraries (Zustand, Jotai, Redux Toolkit):** If the app becomes complex with intricate state logic and updates, these offer more robust solutions. Zustand or Jotai are often preferred for their simplicity in Next.js/React compared to Redux.
3.  **Styling:** Tailwind CSS is already set up, which is great for modern UI development. Leverage a component library compatible with Tailwind (like Shadcn/UI, Headless UI, Radix UI) to accelerate development and ensure accessible, consistent UI elements.
4.  **Routing (If Applicable):** If your mini-app needs multiple views or pages *within* the plugin iframe, use a client-side routing solution. Since this is Next.js App Router, you might explore parallel routes or intercepting routes if appropriate, or stick to simple conditional rendering based on state for simpler cases. Avoid full page reloads within the iframe.
5.  **Data Fetching & Caching:** The current approach fetches data in `useEffect`. For more complex scenarios:
    *   Consider libraries like **SWR** or **React Query (TanStack Query)**. They simplify data fetching, caching, revalidation, and handling loading/error states, integrating well with the `async/await` pattern used by `cg-plugin-lib`.
    *   Wrap the `CgPluginLib` calls within custom hooks (e.g., `useUserInfo`, `useCommunityInfo`) that utilize these libraries for cleaner data fetching logic in your components.
6.  **Error Handling:** Implement robust error handling around the `CgPluginLib` calls. Display informative messages to the user if data fetching or actions fail.
7.  **TypeScript:** Continue leveraging TypeScript for type safety, especially when dealing with the data structures returned by the `cg-plugin-lib`. Ensure you have accurate types for payloads.
8.  **Backend Logic:** Keep the `/api/sign` route minimal and focused solely on signing. If your plugin requires its own backend logic (e.g., storing plugin-specific settings, interacting with external APIs), create separate API routes within the Next.js app.

By adopting these practices, you can extend the sample into a scalable, maintainable, and user-friendly mini-app operating within the Common Ground ecosystem.

## Securing Custom Backend API Routes

As the plugin evolves to include its own backend logic and database (e.g., for managing onboarding wizards via endpoints like `/api/wizards`), a critical question arises: **How should these custom API routes be authenticated and authorized?**

We need to ensure that only legitimate administrators, operating within the authenticated context provided by Common Ground, can perform sensitive actions like creating or modifying wizard configurations.

**Initial Investigation & Thought Process:**

1.  **Problem:** Standard API routes in Next.js execute server-side and don't automatically inherit the client-side authentication context established by `CgPluginLib` (which involves the `iframeUid` and communication with the CG host).
2.  **Hypothesis 1:** Could `CgPluginLibHost` (used in `/api/sign`) be leveraged by custom API routes to validate incoming requests? Perhaps it has methods to:
    *   Verify a session token passed from the client?
    *   Verify a signature generated by the client (`CgPluginLib`) for the custom request?
    *   Fetch user/community info directly using an `iframeUid` from the request to perform server-side authorization checks?
3.  **Research:** Codebase searches were performed focusing on `CgPluginLibHost` usage, specifically looking for methods related to signature verification (`verifySignature`) or direct data fetching (`getUserInfo`, `getCommunityInfo` based on `iframeUid` alone).
4.  **Findings:**
    *   The only observed use of `CgPluginLibHost` is within the `/api/sign` route, where it uses `signRequest` to sign payloads originating from the client library (`CgPluginLib`).
    *   There was no evidence in the codebase or existing documentation (`docs/research.md` initial analysis) suggesting `CgPluginLibHost` provides methods for custom backend routes to independently verify signatures or fetch user context based solely on an `iframeUid`.
    *   The inferred communication flow suggests signature verification is handled by the *Common Ground host application*, not the plugin's backend. `CgPluginLibHost` primarily acts as a signing oracle for `CgPluginLib`.

**Revised Approach & Recommendation (Trust-Based):**

Given the apparent limitations, a simpler, trust-based approach is recommended for securing custom backend API routes:

1.  **Client-Side Gatekeeping:** The primary authorization check happens on the client-side *before* calling the custom API route. The React component uses `useAdminStatus` (which relies on data fetched securely via `CgPluginLib`) to determine if the current user is an admin.
2.  **Contextual Information:** If the client confirms the user is an admin, it proceeds to call the custom backend API route (e.g., `POST /api/wizards`). It includes necessary contextual information in the request, specifically the `iframeUid` and the `community_id` (obtained client-side via `useCgLib` and `useCgQuery`). This information could be passed in headers (e.g., `X-IFrame-UID`, `X-Community-ID`) or the request body.
3.  **Server-Side Trust Assumption:** The custom API route handler (e.g., `/api/wizards/route.ts`) receives the request.
    *   It extracts the `iframeUid` and `community_id`.
    *   It **trusts** that the request is legitimate and authorized because the client-side check (Step 1) should have prevented unauthorized users from reaching this point.
    *   It uses the provided `community_id` to scope its database operations (e.g., `SELECT * FROM onboarding_wizards WHERE community_id = $1`).
4.  **Middleware:** This logic can be encapsulated in middleware applied to the relevant API routes to extract and potentially lightly validate the presence of `iframeUid` and `community_id`.

**Security Considerations:**

*   This model relies on the client-side admin check. A technically savvy user could potentially bypass the client-side UI and call the backend API directly if they can guess/obtain a valid `iframeUid` and `community_id`.
*   **Mitigation:** The potential impact is limited. Such direct calls could only affect the plugin's *own* database tables (like `onboarding_wizards`) within the scope of the provided `community_id`. Critical actions managed directly by Common Ground (like assigning roles via `giveRole`) are still protected by the original `CgPluginLib` signing mechanism.
*   This trade-off prioritizes pragmatism based on the observed library capabilities over implementing a potentially complex, custom cryptographic verification layer within the plugin's backend that might duplicate or conflict with the main CG host verification.

**Conclusion:** For custom backend API routes managing plugin-specific data, we recommend relying on client-side admin checks and passing necessary context (`iframeUid`, `community_id`) to the backend, which operates under a trust assumption based on the client's verification. 