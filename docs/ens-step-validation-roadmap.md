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

*   **Verify Config Availability:** Ensure the `step.config.specific` object containing `domain_name` and `minimum_age_days` is correctly fetched and passed down to `EnsVerificationStepDisplay.tsx`. (The `useUserWizardStepsQuery` likely already provides this via the `step` prop).
*   **Validate Regex Input on Save (Security):** 
    *   Identify the API endpoint responsible for saving/updating step configurations (Likely `PUT /api/wizards/[id]/steps/[stepId]`, but verify).
    *   In the backend handler for that endpoint, **before** saving the step configuration:
        *   Check if `config.specific.domain_name` is present and intended to be a regex (e.g., based on format or a separate flag if added later).
        *   If it is a regex, attempt to compile it using `new RegExp(config.specific.domain_name)` within a `try...catch` block.
        *   If the constructor throws an error, reject the request with a 400 Bad Request status, indicating an invalid regex pattern.
        *   If successful, proceed to save the *original string* representation.

### 4.2. Frontend Logic (`EnsStepConfig.tsx` - Admin UI)

*   **Add Regex Format Hint:** Update the label or description for the `domain_name` input in `EnsStepConfig.tsx` to clearly indicate the expected format (e.g., "Enter exact domain or JS regex like `/^.+\.eth$/`").
*   **Add Frontend Regex Validation (UX - Optional but Recommended):**
    *   In `EnsStepConfig.tsx`, when the `domain_name` input changes and is likely intended as a regex:
        *   Attempt to compile it using `new RegExp(domain_name)` within a `try...catch` block.
        *   If it fails, update the `domainError` state to show an immediate "Invalid regex pattern" message to the admin.

### 4.3. Frontend Logic (`EnsVerificationStepDisplay.tsx` - User UI)

*   **Modify Verification Effect:** Adjust the `useEffect` hook that currently triggers automatic verification.
*   **Access Step Config:** Inside the effect, safely access `step.config?.specific?.domain_name` and `step.config?.specific?.minimum_age_days`.
*   **Implement Domain Name Check:**
    *   If `domain_name` is configured:
        *   Determine if it's a regex pattern or a literal string (e.g., check for `/.../` delimiters or assume regex if it contains special characters that aren't typical domain chars).
        *   **Safely Create RegExp:** If it's a regex pattern, create the `RegExp` object *within a `try...catch` block*: `try { const pattern = new RegExp(domain_name); /* use pattern */ } catch (e) { /* handle error - e.g., treat as non-match or show config error */ }`.
        *   Compare `ensDetails.name` against the `domain_name` (literal string comparison or `pattern.test()`).
        *   If the check fails:
            *   Set a specific error state (e.g., `setValidationError("ENS name does not match required pattern.")`).
            *   Prevent calling `verifyCredential`.
            *   Ensure the UI displays this specific error.
*   **Implement Minimum Age Check:**
    *   If `minimum_age_days` is configured and greater than 0:
        *   **Research & Integration:** Find and integrate a method to fetch the registration or expiry date for the given `ensDetails.name`. Potential options:
            *   **ENS Subgraph:** Query the official ENS subgraph for registration/expiry data. This is the most likely approach. (Requires adding a GraphQL client or using a simple fetch).
            *   **Direct Contract Calls:** Use `wagmi`/`viem` to call ENS registry/registrar contract functions (potentially more complex).
            *   **Third-party API/Library:** Check if `ethereum-identity-kit` or another library offers this.
        *   Add necessary state to handle loading of registration date data.
        *   Once the registration date is fetched:
            *   Calculate the name's age in days.
            *   Compare the age against `minimum_age_days`.
        *   If the check fails:
            *   Set a specific error state (e.g., `setValidationError("ENS name does not meet the minimum age requirement.")`).
            *   Prevent calling `verifyCredential`.
            *   Ensure the UI displays this specific error.
*   **Conditional Verification:** Only call `verifyCredential({ ensName: ensDetails.name, address: address })` if *all* configured checks (domain and age) pass *and* the base condition (has primary ENS) is met.
*   **UI Feedback (`EnsStatusView` / `CredentialVerificationBase`):**
    *   Modify the UI components to display specific validation error messages passed from the parent.
    *   Update loading states to account for fetching registration dates if applicable.
    *   Ensure the "Verifying..." state is only shown when *all* preliminary checks have passed and the actual `verifyCredential` call is pending.

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

## 5. Future Considerations

*   Refine error message display for clarity.
*   Consider caching ENS registration data to reduce external calls.
*   Explore adding other validation options (e.g., specific records set on the ENS name).
*   **ReDoS Prevention:** Investigate libraries or techniques for detecting potentially harmful regex patterns (catastrophic backtracking) if performance becomes a concern with complex admin-supplied patterns. 