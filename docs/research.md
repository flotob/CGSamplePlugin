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