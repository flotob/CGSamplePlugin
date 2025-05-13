# Shared Credential Linking Service for Onboarding Wizards

## 1. Introduction & Goal

### Problem
Currently, when users verify credentials like an ENS name or connect a LUKSO Universal Profile (UP) within an onboarding wizard step, this information is primarily stored in the `user_wizard_progress.verified_data` field for that specific step instance. There isn't a consistent, centralized mechanism to also save these as persistent, globally usable linked credentials in the `user_linked_credentials` table. This capability previously existed for ENS but appears to have been lost.

### Goal
To design and implement a shared frontend service/hook and a robust backend API endpoint that allows various wizard step types (e.g., ENS verification, LUKSO UP connection, potentially Discord/Telegram linking in the future) to consistently save these verified identities as persistent entries in the `user_linked_credentials` table.

## 2. Backend API Endpoint (`POST /api/user/credentials`)

This endpoint will handle the creation and updating of linked credentials for a user.

*   **File:** `src/app/api/user/credentials/route.ts` (Add a `POST` handler to the existing file which currently only has a `GET` handler).
*   **Authentication:** The route must be protected and accessible only by authenticated users (e.g., using the existing `withAuth` higher-order component).

### Request Body (`LinkCredentialPayload`)

The `POST` request should expect a JSON body with the following structure:

```typescript
interface LinkCredentialPayload {
  platform: string;      // E.g., "ENS", "LUKSO_UP", "DISCORD", "TELEGRAM". Must match a value in the platform_enum.
  external_id: string; // The unique identifier for the credential on the platform (e.g., ENS name, UP address, Discord ID).
  username?: string | null; // A display name associated with the credential (e.g., ENS name, UP profile name, Discord username).
  // Optional: Consider adding a generic details field if platform-specific metadata needs to be stored with the credential itself.
  // details?: Record<string, any> | null; // Example: { "avatar_url": "..." }
}
```

### Logic

1.  **Authentication & User ID:** Extract `userId` from the authenticated session (e.g., `req.user.sub`).
2.  **Input Validation:**
    *   Ensure `platform` and `external_id` are provided and are non-empty strings.
    *   Validate that the provided `platform` string is a valid value within your `platform_enum` type in the database (this might require fetching enum values or relying on DB constraints to reject invalid ones, though explicit checking is better).
3.  **Database Operation (SQL):**
    *   Execute an `INSERT` statement with an `ON CONFLICT` clause to handle both new credential linking and updates to existing ones for a given platform.
    *   **Recommended SQL:**
        ```sql
        INSERT INTO user_linked_credentials 
          (user_id, platform, external_id, username, created_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id, platform) DO UPDATE SET
          external_id = EXCLUDED.external_id,
          username = EXCLUDED.username,
          updated_at = NOW()
        RETURNING *; -- Optional: return the created/updated record
        ```
        *   **Parameters:** `$1 = userId`, `$2 = platform`, `$3 = external_id`, `$4 = username`.
        *   **Conflict Target:** `(user_id, platform)` assumes a user can link one external ID per platform. If they try to link a different external ID for the same platform, it updates the existing one. This is generally a good default.
        *   Consider implications if `external_id` should be globally unique per platform (e.g., `ON CONFLICT (platform, external_id) DO UPDATE ...`). This would prevent two different users from linking the exact same external ID (like the same UP address), which might be desirable.

### Response

*   **Success (200 or 201):** Return the created/updated credential object or a success message.
*   **Error (400, 401, 500):** Return appropriate error responses for bad input, authentication issues, or server errors.

## 3. Frontend Shared Service/Hook (`useLinkCredential.ts`)

This service will encapsulate the logic for calling the backend API endpoint.

*   **File Location:** `src/hooks/useLinkCredential.ts` or `src/lib/services/credentialService.ts`.
*   **Type:** Can be a simple async function or a custom React Query mutation hook (`useMutation`) for better state management (isLoading, isError, isSuccess, error, mutate function).

### Functionality (if a simple async function)

```typescript
// Example: src/lib/services/credentialService.ts
import { authFetch } from '@/lib/authFetch'; // Assuming you have an authenticated fetch wrapper

interface LinkCredentialPayload {
  platform: string;
  external_id: string;
  username?: string | null;
}

interface LinkedCredential {
  id: string;
  user_id: string;
  platform: string;
  external_id: string;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export async function linkUserCredential(payload: LinkCredentialPayload): Promise<LinkedCredential> {
  try {
    const response = await authFetch('/api/user/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try to parse error, default to empty obj
      throw new Error(errorData.error || `Failed to link credential: ${response.statusText}`);
    }
    return await response.json(); // Assuming backend returns the credential object
  } catch (error) {
    console.error("Error linking user credential:", error);
    throw error; // Re-throw for the component to handle
  }
}
```

### Functionality (if a React Query `useMutation` hook)

```typescript
// Example: src/hooks/useLinkCredential.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetch } from '@/lib/authFetch'; // Assuming authenticated fetch wrapper
// Import LinkCredentialPayload and LinkedCredential types from above or a shared types file

async function postLinkCredential(payload: LinkCredentialPayload): Promise<LinkedCredential> {
  const response = await authFetch('/api/user/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to link credential');
  }
  return response.json();
}

export function useLinkCredential() {
  const queryClient = useQueryClient();

  return useMutation<LinkedCredential, Error, LinkCredentialPayload>({ 
    mutationFn: postLinkCredential,
    onSuccess: (data) => {
      // Invalidate queries that depend on user_linked_credentials to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['userCredentials'] }); 
      // Optionally, show a success toast notification
      console.log('Credential linked successfully:', data);
    },
    onError: (error) => {
      // Optionally, show an error toast notification
      console.error('Error linking credential:', error.message);
    },
  });
}
```

## 4. Database Migrations (Recap)

1.  **`platform_enum` Update:**
    *   Ensure the `platform_enum` type in PostgreSQL includes all required platform identifiers.
    *   A migration like `migrations/20240517000002_add_lukso_up_to_platform_enum.js` (to add `'LUKSO_UP'`) is necessary.
    *   If `'ENS'` is not already part of the enum from previous migrations (e.g., from `initial-setup.cjs`), a similar migration would be needed for it.
        ```sql
        -- Example for adding ENS if missing
        -- ALTER TYPE public.platform_enum ADD VALUE IF NOT EXISTS 'ENS';
        ```

## 5. Updating Step Display Components

Step display components will use the shared service/hook to link credentials.

### Example: `LuksoConnectProfileDisplay.tsx`

```typescript
// ... imports ...
import { useLinkCredential } from '@/hooks/useLinkCredential'; // Or your service path

// Inside the component:
const { mutate: linkCredential, isPending: isLinkingCredential } = useLinkCredential();

// After successful UP connection AND LSP3 metadata fetch (to get profileData.name):
const handleFinalizeLuksoConnection = async (upAddress: string, profileName: string | null) => {
  try {
    await linkCredential({
      platform: 'LUKSO_UP',
      external_id: upAddress,
      username: profileName || upAddress, // Fallback to address if name is null
    });
    // Proceed with onComplete for the wizard step itself
    onComplete({ upAddress }); // This marks the step complete in user_wizard_progress
  } catch (error) {
    // Handle linking error (e.g., show a message to the user)
    // The hook itself might show a toast, but you might want specific UI feedback here.
    console.error("Failed to save LUKSO UP as linked credential:", error);
    // Decide if onComplete should still be called if credential linking fails but step connection was OK.
    // For now, we assume step completion is primary.
    onComplete({ upAddress }); 
  }
};

// In handleConnect, after getting upAddress and fetching metadata successfully:
// Call handleFinalizeLuksoConnection(upAddress, fetchedProfileData?.name);
```

### Example: `EnsVerificationStepDisplay.tsx` (Re-introducing lost functionality)

```typescript
// ... imports ...
import { useLinkCredential } from '@/hooks/useLinkCredential';

// Inside the component:
const { mutate: linkCredential, isPending: isLinkingEns } = useLinkCredential();

// In the verifyCredential().then(() => { ... }) block of useCredentialVerification's success path, or directly in EnsVerificationStepDisplay:
const handleEnsVerified = (ensName: string, resolvedAddress: string) => {
  linkCredential(
    { platform: 'ENS', external_id: ensName, username: ensName }, 
    {
      onSuccess: () => {
        console.log('ENS credential linked to user_linked_credentials');
        onComplete(); // Original onComplete for wizard step progress
      },
      onError: () => {
        console.error('Failed to link ENS credential, but step verification was successful.');
        onComplete(); // Still mark step complete for wizard progress
      }
    }
  );
};

// When ENS is verified (e.g., userEnsName is confirmed):
// handleEnsVerified(userEnsName, userAddress);
```

## 6. Benefits

*   **Consistency:** All credential linking follows the same pattern.
*   **Reusability:** New credential step types can easily use the shared service/hook.
*   **Maintainability:** Logic for API interaction and error handling is centralized.
*   **Clear Separation:** Step completion (`user_wizard_progress`) is distinct from persistent credential linking (`user_linked_credentials`).

## 7. Future Considerations

*   **Deleting Linked Credentials:** Implement a `DELETE /api/user/credentials/:credentialId` endpoint and corresponding frontend service/UI.
*   **Displaying Linked Credentials:** Enhance the `GET /api/user/credentials` endpoint if needed, and build UI components to display all linked credentials on a user profile or settings page.
*   **Platform-Specific Icons/Display:** When displaying linked credentials, have a mapping from `platform_enum` values to icons and display formats.
*   **Data Sync:** Consider if/how `username` or other details in `user_linked_credentials` should be synced if they change on the external platform (e.g., user changes LUKSO profile name). This is often out of scope for basic linking.

---
This document outlines a path to a more robust and extensible credential linking system. 