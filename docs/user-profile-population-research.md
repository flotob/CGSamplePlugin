# Research: User Profile Population Logic

## 1. Goal

Ensure that the `user_profiles` table is automatically populated and kept reasonably up-to-date with basic display information (`username`, `profile_picture_url`) for users interacting with the plugin via authenticated API calls.

## 2. Data Source & Prerequisite

*   **Primary Source:** The user's authentication provider (the source of the JWT).
*   **Assumption:** The JWT payload (`JwtPayload` defined in/used by `src/lib/withAuth.ts`) contains claims that hold the user's display name and profile picture URL.
*   **Prerequisite/Investigation:** We **must** confirm the exact structure of `JwtPayload` to identify the correct claims. Common claims include:
    *   `sub`: Subject (User ID - already assumed)
    *   `name`: Full name
    *   `nickname`: Display name/username
    *   `preferred_username`: Often used in OIDC
    *   `picture`: URL to profile picture
    *(Action: Inspect the definition/source of `JwtPayload` or the auth provider documentation).* 

## 3. Trigger Point

The most logical and efficient place to trigger the profile update is within the existing authentication flow, specifically after a user's JWT has been successfully validated but before the actual API route handler logic proceeds.

This ensures that profile data is captured/updated for any authenticated API interaction, keeping it relatively fresh without requiring explicit frontend actions.

## 4. Proposed Implementation: Modify `withAuth` HOC

The existing Higher-Order Component `withAuth` (likely in `src/lib/withAuth.ts`) appears to be the central point for handling authentication for API routes. Modifying this seems the most appropriate approach.

**Proposed Logic within `withAuth`:**

1.  **Location:** Inside the `withAuth` function, *after* the JWT is successfully verified and the `payload` (containing user claims) is available.
2.  **Data Extraction:**
    *   Extract `userId = payload.sub`.
    *   Extract `username` from the relevant claim (e.g., `payload.name`, `payload.nickname`, `payload.preferred_username`). Handle potential null/undefined values.
    *   Extract `profilePictureUrl` from the relevant claim (e.g., `payload.picture`). Handle potential null/undefined values.
3.  **Database Upsert:** Perform an `UPSERT` operation on the `user_profiles` table using the extracted data.
    *   Use the `query` function from `src/lib/db`.
    *   SQL Statement:
        ```sql
        INSERT INTO user_profiles (user_id, username, profile_picture_url, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) -- If user_id already exists...
        DO UPDATE SET           -- ...update these fields
          username = EXCLUDED.username,             -- Use the value we tried to insert
          profile_picture_url = EXCLUDED.profile_picture_url,
          updated_at = NOW()
        -- Optional: Prevent unnecessary updates if data hasn't changed
        -- WHERE user_profiles.username IS DISTINCT FROM EXCLUDED.username 
        --    OR user_profiles.profile_picture_url IS DISTINCT FROM EXCLUDED.profile_picture_url;
        ```
    *   Pass `[userId, username, profilePictureUrl]` as parameters.
4.  **Error Handling:**
    *   Wrap the `UPSERT` logic in a `try...catch` block.
    *   Log any database errors encountered during the profile update.
    *   **Crucially:** Do *not* let errors in the profile update block the original API request. The profile sync should be best-effort and non-critical to the primary function of the API route being called. Allow the flow to continue even if the profile update fails.
5.  **Dependencies:** Ensure `withAuth` has access to the `query` function (it likely already does if used elsewhere, otherwise import it).

## 5. Example Code Snippet (Conceptual - for `withAuth`)

```typescript
// Inside withAuth, after payload validation

const userId = payload.sub;
// *** Replace with actual claim names after investigation ***
const username = payload.name || payload.nickname || null; 
const profilePictureUrl = payload.picture || null;

if (userId) { // Only proceed if we have a user ID
  try {
    // Use await if query is async, otherwise handle promise
    await query(
      `INSERT INTO user_profiles (user_id, username, profile_picture_url, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         username = EXCLUDED.username,
         profile_picture_url = EXCLUDED.profile_picture_url,
         updated_at = NOW();`,
      [userId, username, profilePictureUrl]
    );
    // console.log('User profile possibly updated:', userId); // Optional debug log
  } catch (profileError) {
    console.error('Error updating user profile (non-critical):', profileError);
    // Do not throw or return error here - allow original request to continue
  }
}

// ... continue with original handler logic ...
```

## 6. Alternatives Considered

*   **Dedicated API Endpoint (`/api/user/profile/sync`):**
    *   Frontend calls this endpoint after login.
    *   *Cons:* Requires extra frontend logic, adds another network request, might miss updates if login flow changes.
*   **Manual Update via Settings Page Only:**
    *   Users must manually enter/update their profile.
    *   *Cons:* Relies entirely on user action, profiles will be empty initially, poor UX for features needing profile data immediately.
*   **Server-Side Component Logic:** If using Next.js App Router heavily, could potentially happen during initial session creation/validation server-side.
    *   *Cons:* Might be less centralized than modifying `withAuth` if `withAuth` handles all API auth.

## 7. Recommendation

Modifying the central `withAuth` HOC to perform a best-effort `UPSERT` into `user_profiles` after successful token validation appears to be the most robust, efficient, and reliable approach. It ensures profile data is captured automatically for all authenticated interactions without requiring extra frontend calls or relying solely on manual user input.

**Next step requires investigating the exact structure of `JwtPayload` and the implementation details of `withAuth.ts`.** 