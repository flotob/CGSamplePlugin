# ENS Integration Roadmap (using Ethereum Identity Kit)

This document outlines the steps required to integrate Ethereum Name Service (ENS) verification into the Common Ground onboarding wizard plugin, utilizing the `ethereum-identity-kit` library.

## Phase 1: Setup and Configuration

1.  **Install Dependencies:**
    *   Add required packages: `npm install ethereum-identity-kit wagmi viem@2.x @tanstack/react-query` (or yarn/pnpm equivalent).
    *   Verify peer dependency compatibility (`react`, `next`, etc.).
2.  **Configure `wagmi`:**
    *   Ensure `wagmi` is configured correctly (likely in `src/lib/wagmi.ts` or similar). Define chains, transports, and connectors needed for wallet interaction. Refer to `wagmi` documentation if setup is incomplete.
3.  **Set up Providers:**
    *   Instantiate `QueryClient` from `@tanstack/react-query`.
    *   In the main application layout (likely `src/app/layout.tsx`), wrap the core content with:
        *   `QueryClientProvider`
        *   `WagmiProvider`
        *   `TransactionProvider` (from `ethereum-identity-kit`)
4.  **Import Styles:**
    *   Import the necessary CSS in the layout file: `import 'ethereum-identity-kit/css';`
5.  **Update Next.js Config:**
    *   Modify `next.config.ts` (or `.mjs`) to include `transpilePackages: ['ethereum-identity-kit']` to prevent potential module errors.

## Phase 2: Implementation

1.  **Wallet Connection Component:**
    *   Implement or verify a component that handles wallet connection using `wagmi` (e.g., a `ConnectWalletButton`).
    *   Ensure the connected wallet address is stored and accessible within the onboarding wizard's state or context.
2.  **ENS Verification Step Component:**
    *   Create a new React component: `src/components/onboarding/steps/EnsVerificationStep.tsx`.
    *   Pass the connected wallet address to this component.
    *   Use the `useProfileDetails` hook from `ethereum-identity-kit`, providing the connected address.
    *   Implement loading state based on `detailsLoading` from the hook.
    *   Retrieve the `ens` object from the hook's return value.
3.  **Verification Logic:**
    *   Determine how admin configuration (require *any* ENS vs. *specific* ENS) is passed to the component.
    *   **"Any ENS" Check:** Verify if `ens?.name` (or a similar field indicating a primary name exists) is present and non-empty after loading completes.
    *   **"Specific ENS" Check:** Compare `ens?.name` against the required name specified in the admin config. Handle normalization if needed. (Alternatively, use `resolveName` from `viem`/`wagmi` if the kit doesn't directly support checking ownership of a *specific* name easily).
4.  **UI Feedback:**
    *   Display clear feedback to the user: loading indicator, success message (potentially showing the detected ENS name), or failure message with guidance (e.g., "No primary ENS name set for this address. Please set one via ens.domains.").
5.  **Wizard Integration:**
    *   Incorporate `EnsVerificationStep.tsx` into the main onboarding flow/component structure.
    *   Manage the step's completion status based on the verification outcome. Allow proceeding only on success if the step is mandatory.
6.  **Role Assignment:**
    *   Upon successful ENS verification, call the appropriate function provided by the `CGPluginLib` to assign the configured Common Ground role to the user.

## Phase 3: Testing

1.  **Wallet Scenarios:**
    *   Test with a wallet that has a primary ENS name set.
    *   Test with a wallet that does *not* have a primary ENS name set.
    *   Test with a wallet connected to a non-mainnet network (confirm ENS lookup still targets mainnet or handles appropriately).
2.  **Specific ENS Scenario (If Implemented):**
    *   Test with a wallet that owns the specific required ENS name.
    *   Test with a wallet that does *not* own the specific required ENS name.
3.  **UI/UX:**
    *   Verify loading states, success messages, and error messages are clear and user-friendly.
    *   Ensure smooth integration within the overall wizard flow. 