# Custom JWT Authentication Plan for Plugin Backend

This document outlines the plan for implementing a custom JWT (JSON Web Token) based authentication system to secure the plugin's custom backend API routes (e.g., `/api/wizards/*`). This addresses the gap identified in `docs/cg-auth-custom-routes.md` where the default Common Ground libraries do not secure this specific communication channel.

## 1. Goal

To ensure that requests to the plugin's custom backend API routes can only be successfully processed if they originate from an authenticated user session within the plugin's frontend iframe context, particularly verifying admin privileges for sensitive operations.

## 2. Core Concept

We will implement a standard JWT flow:

1.  **Issuance:** After the plugin frontend successfully initializes within the Common Ground iframe and potentially verifies the user's identity/roles via `CgPluginLib`, it requests a JWT from the plugin's backend.
2.  **Transmission:** The backend issues a short-lived, signed JWT containing relevant claims (user ID, community ID, admin status, expiry).
3.  **Storage:** The frontend stores this JWT securely.
4.  **Usage:** The frontend includes the JWT in the `Authorization` header for subsequent requests to protected backend API routes.
5.  **Verification:** A backend middleware intercepts requests to protected routes, verifies the JWT's signature and expiry, and extracts the claims for authorization decisions.

## 3. Implementation Details

### 3.1. JWT Secret Key

*   A strong, secret key is required for signing and verifying JWTs.
*   **Action:** Generate a secure random string (e.g., using `openssl rand -hex 32`).
*   **Action:** Store this secret securely in an environment variable on the server (e.g., `JWT_SECRET`). **Do not expose this key to the client-side.**

### 3.2. JWT Issuance Endpoint

*   **Action:** Create a new API route, e.g., `POST /api/auth/session`.
*   **Trigger:** The plugin frontend calls this endpoint *after* `CgPluginLib` has initialized successfully and `useAdminStatus` has loaded.
*   **Request:** The frontend sends the `iframeUid` and potentially the fetched `userInfo` and `communityInfo` (or just relevant parts like `userId`, `communityId`, `isAdmin`) to this endpoint. *Note: This initial call is still based on trust, but its purpose is only to initiate the session and get a JWT.* Alternative: The backend could fetch user/community info itself using `iframeUid` if that becomes possible via `CgPluginLibHost` later, making this endpoint more secure.
*   **Backend Logic:**
    *   Initialize `CgPluginLibHost` (if needed for validation, though unlikely based on current knowledge).
    *   Validate the request minimally (e.g., check for `iframeUid`).
    *   Extract necessary user/community details from the request body.
    *   Define JWT payload (claims):
        *   `sub`: User ID (e.g., `userInfo.id`)
        *   `cid`: Community ID (e.g., `communityInfo.id`)
        *   `uid`: iframeUid
        *   `adm`: Boolean indicating admin status (derived from client or re-verified if possible)
        *   `exp`: Expiration timestamp (e.g., 15-60 minutes from now)
        *   `iat`: Issued at timestamp
    *   Sign the JWT using `jsonwebtoken` library and the `JWT_SECRET` (HS256 algorithm is common).
    *   Return the JWT to the client.

### 3.3. JWT Storage (Client-Side)

*   **Challenge:** Storing JWTs securely in the browser, especially within an iframe, requires care.
*   **Options:**
    *   **HTTP-Only Cookie:** Most secure against XSS. Backend sets `Set-Cookie` header with `HttpOnly`, `Secure`, `SameSite=Strict` (or `None` with `Secure` if cross-site context requires, but needs careful testing). Browser automatically includes it in subsequent requests to the same origin. Might be complex with iframe sandboxing and cross-origin considerations if the plugin backend domain differs from the main app.
    *   **In-Memory:** Store the token in a variable (e.g., React state, context). Secure against XSS/CSRF but lost on page refresh, requiring re-authentication.
    *   **localStorage/sessionStorage:** Vulnerable to XSS attacks (malicious scripts can read the token). Generally discouraged for sensitive tokens.
*   **Recommendation:** Start with **In-Memory** storage managed via React Context for simplicity and security against XSS. If token persistence across refreshes becomes crucial, investigate the feasibility and security implications of **HTTP-Only Cookies** within the Common Ground iframe context more deeply.
*   **Action:** Create a React context (e.g., `AuthContext`) to hold the JWT and provide functions to request/clear it.

### 3.4. JWT Usage (Client-Side)

*   **Action:** Modify client-side API fetching logic (e.g., custom `fetch` wrapper, Axios instance, or within `useCgMutation`/`useCgQuery` if adapted for custom backend) to automatically include the JWT.
*   **Mechanism:** Retrieve the token from the `AuthContext` (or wherever stored) and add it to the `Authorization` header: `Authorization: Bearer <jwt_token>`.
*   **Action:** Handle cases where the token is missing or expired (e.g., redirect to re-authenticate or clear state). Handle 401/403 responses from the backend by clearing the local token state.

### 3.5. JWT Verification Middleware (Backend)

*   **Action:** Create a middleware function (e.g., using Next.js middleware or a wrapper for route handlers).
*   **Applies To:** Protect relevant API routes (e.g., all routes under `/api/wizards/*` except potentially GET requests if they are public).
*   **Logic:**
    *   Extract the token from the `Authorization: Bearer <token>` header.
    *   If no token, return 401 Unauthorized.
    *   Verify the token's signature using `jsonwebtoken.verify()` and the `JWT_SECRET`.
    *   Verify standard claims (like `exp`).
    *   If verification fails (invalid signature, expired), return 401 Unauthorized.
    *   If valid, decode the payload.
    *   Attach the decoded payload (or relevant parts like `userId`, `communityId`, `isAdmin`) to the `request` object for downstream handlers.
    *   Call the next handler in the chain.
*   **Route Handler Logic:** Protected route handlers can now trust the user information attached to the request by the middleware (e.g., `req.user = { userId: '...', communityId: '...', isAdmin: true }`). They perform actions based on this verified context. Admin-only routes should explicitly check `req.user.isAdmin`.

## 4. Libraries

*   **Backend:** `jsonwebtoken` (npm package) for signing and verifying tokens.
*   **Frontend:** Standard `fetch` or libraries like `axios` for making requests.

## 5. Workflow Summary

1.  Plugin loads in iframe.
2.  `CgLibProvider` initializes, `useAdminStatus` determines admin state.
3.  Client calls `POST /api/auth/session` with context info.
4.  Backend validates, creates JWT payload (claims: sub, cid, uid, adm, exp, iat), signs it with `JWT_SECRET`, returns token.
5.  Client stores token (e.g., in `AuthContext`).
6.  Client needs to call `POST /api/wizards`.
7.  API client logic retrieves token from `AuthContext`, adds `Authorization: Bearer <token>` header.
8.  Backend API route `/api/wizards` receives request.
9.  JWT verification middleware extracts token, verifies signature & expiry using `JWT_SECRET`.
10. Middleware decodes token, attaches claims (`req.user = { userId, communityId, isAdmin }`) to request.
11. Route handler checks `req.user.isAdmin`. If true, proceeds with creating wizard for `req.user.communityId`.

## 6. Security Considerations

*   **JWT Secret:** Must be kept confidential and be sufficiently complex.
*   **HTTPS:** All communication must be over HTTPS to prevent token interception.
*   **Expiry:** Use short expiry times for JWTs (e.g., 15-60 mins) to limit the window for replay attacks.
*   **Token Storage:** Be mindful of XSS risks if using `localStorage`. In-memory or secure HTTP-only cookies are preferred.
*   **Payload:** Don't put overly sensitive information directly in the JWT payload if not needed for authorization checks, as payloads are base64 encoded, not encrypted.
*   **CSRF:** If using cookies for storage, CSRF protection (e.g., SameSite attribute, potentially CSRF tokens) is necessary.

This plan provides a significantly more secure approach than the basic trust model by adding a layer of verifiable, short-lived sessions managed by the plugin itself. 