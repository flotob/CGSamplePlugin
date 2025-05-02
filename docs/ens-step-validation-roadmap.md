# Roadmap: Enhanced ENS Step Validation

## 1. Goal

Enhance the user-facing ENS verification step within the wizard slideshow modal to validate the user's primary ENS name against specific policies configured by the admin (domain name/pattern matching, minimum registration age), instead of just checking for its existence.

## 2. Current State

*   Admins can configure ENS steps via `EnsStepConfig.tsx` to require a specific `domain_name` (string or regex) and/or a `minimum_age_days`.
*   This configuration is stored in the `config.specific` field of the `onboarding_steps` record.
*   The user-facing `EnsVerificationStepDisplay.tsx` uses `useProfileDetails` to get the primary ENS name for the connected wallet.
*   An effect in `EnsVerificationStepDisplay.tsx` currently triggers `verifyCredential` as soon as a primary ENS name is detected, marking the step complete without checking the specific configured policies.

## 3. Proposed Changes

Modify the verification logic in `EnsVerificationStepDisplay.tsx` to incorporate checks against the configured `domain_name` and `minimum_age_days` before marking the step as complete. Provide specific feedback to the user based on the validation results.

## 4. Detailed Tasks

### 4.1. Backend / Data Preparation

*   **Verify Config Availability:** Ensure `step.config.specific` is available in `EnsVerificationStepDisplay.tsx`. (Verified)
*   **Validate Regex Input on Save (Security):** Add server-side `new RegExp()` validation to `PUT /api/wizards/[id]/steps/[stepId]`. (Implemented)
*   **Create Backend Proxy for ENS Subgraph Query (Security & Age Check):**
    *   Create a new API route (e.g., `GET /api/ens-age?name=[ensName]`).
    *   This route will receive an ENS name as a query parameter.
    *   Securely load The Graph API Key from server-side environment variables (e.g., `process.env.GRAPH_API_KEY`). **Action:** Add `GRAPH_API_KEY` to `.env.example` and documentation.
    *   Implement logic using `fetch` to send the GraphQL query (`query { registrations(first: 1, where: { domain_: { name: $name } }) { registrationDate } }`) to the ENS Subgraph endpoint (`https://gateway.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH`).
    *   Parse the response and return the `registrationDate` (as a number or string) or an appropriate error status (e.g., 404 if not found, 500 on fetch error).

### 4.2. Frontend Logic (`EnsStepConfig.tsx` - Admin UI)

*   **Add Regex Format Hint:** Add description for domain/regex input. (Implemented)
*   **Add Frontend Regex Validation (UX):** Add immediate `try/catch` validation for regex input. (Implemented via shared util)

### 4.3. Frontend Logic (`EnsVerificationStepDisplay.tsx` - User UI)

*   **Modify Verification Effect:** Adjust the `useEffect` hook.
*   **Access Step Config:** Access `step.config?.specific?.domain_name` and `minimum_age_days`.
*   **Implement Domain Name Check:** Compare `ensDetails.name` using literal string or safe `new RegExp()` from shared util.
*   **Implement Minimum Age Check:**
    *   If `minimum_age_days` is configured:
        *   **Call Backend Proxy:** Fetch the registration date by calling our new backend API route (`GET /api/ens-age?name=${ensDetails.name}`).
        *   **State Management:** Add state variables to track the loading and potential errors from this fetch call (e.g., `isFetchingAge`, `ageFetchError`).
        *   **Calculate Age:** Once `registrationDate` is successfully fetched, calculate the age: `(Date.now()/1000 - registrationDate) / 86400;`.
        *   **Compare:** Compare calculated age against `minimum_age_days`.
        *   Handle errors from the proxy route (e.g., name not found).
*   **Set Validation Error State:** If domain or age check fails, set a specific validation error message.
*   **Conditional Verification:** Only call `verifyCredential(...)` if user has primary ENS AND *all* configured checks (domain, age) pass AND age data has finished loading without errors.
*   **UI Feedback (`EnsStatusView` / `CredentialVerificationBase`):**
    *   Display specific validation errors (from domain check, age check, or age fetch errors).
    *   Show loading state while fetching age data.
    *   Ensure "Verifying..." state reflects waiting for `verifyCredential` *after* all checks pass.

### 4.4. Testing

*   **Add Regex Validation Tests:**
    *   Admin saves step with valid regex -> Success.
    *   Admin saves step with invalid regex (e.g., `/[a-z`) -> Fails with 400 error.
    *   Admin saves step with non-regex string -> Success.
    *   User verification with valid regex config that matches -> Success.
    *   User verification with valid regex config that doesn't match -> Fails (shows specific error).
    *   User verification with stored *invalid* regex config (edge case) -> Handles gracefully (e.g., shows config error or fails check).
*   Test cases for domain name matching (exact string, valid regex, invalid regex).
*   Test cases for minimum age (passes, fails just under, fails way under).
*   Test cases combining both domain and age checks.
*   Test cases where no specific policies are configured (should behave as currently).
*   Test cases where the user has no primary ENS.
*   **Add Age Check Tests:**
    *   Test calling the proxy route directly.
    *   Test frontend handling of age loading, success (passes/fails), and fetch errors.

## 5. Future Considerations

*   Refine error message display for clarity.
*   Consider caching ENS registration data to reduce external calls.
*   Explore adding other validation options (e.g., specific records set on the ENS name).
*   **ReDoS Prevention:** Investigate libraries or techniques for detecting potentially harmful regex patterns (catastrophic backtracking) if performance becomes a concern with complex admin-supplied patterns. 