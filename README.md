<div align='center'>
    <h1>🚀 OnBoard: Common Ground Wizard Plugin 🚀</h1>
    <p>A configurable onboarding wizard system for the Common Ground platform.</p>
</div>

This plugin allows community admins to create step-by-step flows (Wizards) to guide users through processes like credential verification, content consumption, and role acquisition.

---

## Table of Contents

- [1. High-Level Goal](#1-high-level-goal)
- [2. Key Concepts](#2-key-concepts)
- [3. Core Flows](#3-core-flows)
- [4. Architecture & Tech Stack](#4-architecture--tech-stack)
- [5. Data Flow Summary](#5-data-flow-summary)
- [6. Environment Variables](#6-environment-variables)
- [7. Database & Migrations](#7-database--migrations)
- [8. Getting Started (Local Development)](#8-getting-started-local-development)
  - [Docker Setup](#docker-setup)
  - [Manual Setup](#manual-setup)
- [9. Usage & Deployment](#9-usage--deployment)
- [10. Key Features & Implementation Notes](#10-key-features--implementation-notes)
  - [Authentication (`withAuth`)](#authentication-withauth)
  - [ENS Verification](#ens-verification)
  - [Stripe Integration (Subscription Billing)](#stripe-integration-subscription-billing)
- [11. Notes for Contributors](#11-notes-for-contributors)

---

## 1. High-Level Goal

This plugin provides a configurable onboarding wizard system designed to be embedded within the main Common Ground platform. Its primary purpose is to allow community administrators to create step-by-step flows (Wizards) that guide end-users through processes like verifying credentials (e.g., ENS), consuming informational content, answering questionnaires (future), and potentially earning community roles upon successful completion.

## 2. Key Concepts

*   **Wizards (`onboarding_wizards` table):** The top-level container for an onboarding flow. Each wizard belongs to a specific community and has a name, description, and active status.
*   **Steps (`onboarding_steps` table):** Ordered units within a wizard. Each step has configuration (`config` JSONB), references a `step_type_id`, defines a `step_order`, can optionally grant a `target_role_id`, and has `is_mandatory` / `is_active` flags. Drag-and-drop reordering is supported in the admin UI.
*   **Step Types (`step_types` table):** Define the *kind* of step. These are stored in the database and fetched dynamically. Key properties include:
    *   `name`: A unique identifier (e.g., `ens`, `content`). Used internally for logic.
    *   `label`: A user-friendly display name (e.g., "ENS Verification", "Content Slide"). Used in UI.
    *   `description`: A brief explanation shown to admins/users.
    *   `requires_credentials`: A boolean flag indicating if the step involves credential verification.
*   **User Progress (`user_wizard_progress` table):** Records *when* a user successfully completes a specific step within a wizard, storing any relevant `verified_data` (like a verified ENS name). This is the historical record of achievement.
*   **User Sessions (`user_wizard_sessions` table):** Tracks the *last step viewed* by a user within a specific wizard. This acts as a bookmark to allow accurate resumption of the wizard flow.
*   **User Profiles (`user_profiles` table):** Stores basic, public-facing user information (`username`, `profile_picture_url`) synced automatically from the authentication provider via the JWT. Used for display purposes like the social proof widget.
*   **Wizard Completion (`user_wizard_completions` table):** Tracks which users have successfully completed an entire wizard.

## 3. Core Flows

*   **Admin Configuration Flow:**
    1.  Admin accesses the plugin interface (likely through the main Common Ground platform).
    2.  Admin views/creates/manages Wizards.
    3.  Within a wizard (`WizardStepEditorPage`), the admin uses the sidebar (`StepSidebar`) to add, delete, and reorder steps via drag-and-drop.
    4.  When adding a step, the admin selects a `StepType` from a categorized dropdown menu (using `label` for display).
    5.  The admin configures the selected step (`StepEditor`) including: common presentation settings, optional target role assignment, step-type-specific settings (e.g., Markdown content, ENS parameters), and mandatory/active status.
    6.  Admin can preview the configured outcomes (step types, roles) via a static "Summary Preview" item.
*   **User Completion Flow:**
    1.  User launches a wizard.
    2.  The `WizardSlideshowModal` displays, resuming the user on their `last_viewed_step_id` (fetched from `user_wizard_sessions`) or starting at step 0.
    3.  The modal renders the current step via the `StepDisplay` component (router) and specific step components (`ContentStepDisplay`, `EnsVerificationStepDisplay`, etc.).
    4.  User interacts with the step. `content` steps auto-complete.
    5.  Successful step completion records progress in `user_wizard_progress`.
    6.  User navigation ("Next"/"Previous") updates the `last_viewed_step_id` in `user_wizard_sessions`.
    7.  A `SocialProofWidget` may display avatars of other users who have reached this step or beyond.
    8.  Upon completion, a `WizardSummaryScreen` is shown, completion is potentially recorded (`user_wizard_completions`), and roles may be granted.

## 4. Architecture & Tech Stack

*   **Framework:** Next.js (App Router), React, TypeScript.
*   **UI:** Tailwind CSS, `shadcn/ui` components.
*   **State Management/Data Fetching:** React Query (`useQuery`, `useMutation`), Context API (`AuthContext`, `CgLibContext`).
*   **Backend:** Next.js API Routes (`src/app/api/`).
*   **Authentication:** JWT-based via `withAuth` HOC (`src/lib/withAuth.ts`), syncing profile data to `user_profiles`.
*   **Database:** PostgreSQL (typically run via Docker locally).
*   **Migrations:** `node-pg-migrate`.
*   **Key Libraries:** `@common-ground-dao/cg-plugin-lib`, `@tanstack/react-query`, `jsonwebtoken`, `dnd-kit`, `react-markdown`.
*   **Containerization:** Docker (using `docker-compose.yml` for local development database).

## 5. Data Flow Summary

1.  Frontend uses `cg-plugin-lib` for initial user/community context.
2.  Frontend calls `POST /api/auth/session` with context data (including profile info) to get a JWT.
3.  Subsequent frontend API calls use React Query hooks and `authFetch` (adds Bearer token).
4.  `withAuth` middleware intercepts backend calls, verifies JWT, performs profile UPSERT into `user_profiles`.
5.  API route handlers use `query` utility to interact with PostgreSQL.
6.  Data returns through the chain.

## 6. Environment Variables

This project requires certain environment variables to be set. Create a `.env` file in the project root (copy from `.env.example` if one exists - **ensure `.env` is in your `.gitignore!**).

Key variables include:

*   `DATABASE_URL`: The connection string for your PostgreSQL database. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
    *   If using the provided Docker setup, this will likely be `postgresql://postgres:postgres@localhost:5432/cg_sample_plugin`.
*   `JWT_SECRET`: A strong, secret string used to sign and verify JWTs for session authentication. Generate a secure random string for this.
*   `NEXT_PUBLIC_...`: Any variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

Ensure all required variables are set before running the application or deploying.

## 7. Database & Migrations

*   **Database:** PostgreSQL.
*   **Schema Reference:** A snapshot of the current schema can be found in `docs/current-db-schema.db`. This file is for reference and may not always be perfectly up-to-date; the migrations are the source of truth.
*   **Migrations Tool:** We use `node-pg-migrate`.
*   **Location:** Migration files are located in the `migrations/` directory, prefixed with a timestamp.
*   **Running Migrations:** To apply pending migrations to your database (after setting the `DATABASE_URL` in `.env`), run:
    ```bash
    npm run migrate up
    # or
    yarn migrate up 
    ```
    (Verify the exact script name in `package.json` if this doesn't work).
*   **Creating Migrations:** Use the `node-pg-migrate` CLI or follow the pattern of existing files to create new migrations.

## 8. Getting Started (Local Development)

Install the dependencies:
```bash
npm install 
# or
yarn install
```
Then run the development server:
```bash
npm run dev
# or
yarn dev
```

The project will start running on [http://localhost:5000](http://localhost:5000) by default. As a plugin, running it standalone is limited as it requires data from the Common Ground host environment.

To test effectively, use a reverse proxy:

1.  **Use ngrok (or similar):**
    *   [Install ngrok](https://ngrok.com/docs/getting-started/).
    *   Start your local dev server: `npm run dev` / `yarn dev`.
    *   In a new terminal, start ngrok: `ngrok http 5000`.
    *   Copy the ngrok **HTTPS** URL (e.g. `https://abc123xyz.ngrok-free.app`).
    *   Register this HTTPS URL as your plugin on the Common Ground platform.
    *   Test the plugin functionality within the Common Ground interface.

    *Note: Only use ngrok for development/testing due to potential security risks.*

### Docker Setup (Recommended for Database)

The easiest way to run the required PostgreSQL database locally is using Docker.

1.  Ensure you have [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed.
2.  From the project root, run:
    ```bash
    docker-compose up -d
    ```
    This will start a PostgreSQL container in the background, configured according to `docker-compose.yml`. The database will be accessible at the default `DATABASE_URL` mentioned in the Environment Variables section.
3.  Create your `.env` file and set `DATABASE_URL` accordingly.
4.  Run database migrations: `npm run migrate up` / `yarn migrate up`.
5.  Start the development server: `npm run dev` / `yarn dev`.

To stop the database container:
```bash
docker-compose down
```

### Manual Setup

If you prefer not to use Docker:

1.  Install and run PostgreSQL locally or use a hosted instance.
2.  Create a database for this project.
3.  Create your `.env` file and set `DATABASE_URL` to your database connection string.
4.  Run database migrations: `npm run migrate up` / `yarn migrate up`.
5.  Start the development server: `npm run dev` / `yarn dev`.

### Testing with Common Ground

As a plugin, testing requires running it within the Common Ground host environment.

1.  **Use ngrok (or similar):**
    *   [Install ngrok](https://ngrok.com/docs/getting-started/).
    *   Start your local dev server (`npm run dev`).
    *   Start ngrok: `ngrok http 5000`.
    *   Register the ngrok **HTTPS** URL on the Common Ground platform.
    *   Test within the Common Ground interface.

## 9. Usage & Deployment

1.  **Development:** Use the ngrok method described above.
2.  **Production:**
    *   Deploy this project to a hosting provider (e.g., Vercel, Netlify, custom server) that provides a stable public HTTPS URL.
    *   Ensure all necessary environment variables (like `JWT_SECRET`, `DATABASE_URL`) are configured on the hosting provider.
    *   Register the public HTTPS URL of your deployed plugin on the Common Ground platform.
    *   Test thoroughly within Common Ground.
3.  **Reference:** Use this repository as a starting point or reference for building your own Common Ground plugins.

## 10. Key Features & Implementation Notes

### Authentication (`withAuth`)

This plugin uses a custom JWT-based system (`src/lib/withAuth.ts`) to secure API routes.

*   **Usage:** Wrap API route handlers with `withAuth`. Pass `true` as the second argument for admin-only routes.
    ```typescript
    // Example (Admin Route)
    import { withAuth } from '@/lib/withAuth';
    export const POST = withAuth(async (req) => { /* ... */ }, true); 
    ```
*   **JWT Claims:** Access decoded user info via `req.user` in your handler. Available claims include:
    *   `sub`: User ID
    *   `cid`: Community ID
    *   `uid`: Iframe session ID
    *   `adm`: Boolean (is admin?)
    *   `name?`: User's display name (optional)
    *   `picture?`: User's profile picture URL (optional)
*   **Profile Sync:** `withAuth` automatically performs a best-effort `UPSERT` to the `user_profiles` table using the `sub`, `name`, and `picture` claims on every authenticated request.
*   **Security:** Ensure `JWT_SECRET` is strong and kept private. Use HTTPS.

### ENS Verification

*   The plugin includes functionality to verify user ownership of ENS domains.
*   Utilizes RainbowKit for wallet connection, `wagmi`, and `ethereum-identity-kit`.
*   Checks for primary ENS name via reverse resolution.
*   Includes an ENS lookup tool (name → address).
*   **TODO:** Improve handling for users who own an ENS name but haven't set it as their primary reverse record. Provide clearer guidance and potentially link to the ENS app.

### Stripe Integration (Subscription Billing)

*   The plugin integrates with Stripe to handle paid subscription plans (e.g., a 'Pro' tier).
*   Uses Stripe Checkout for users to initiate subscriptions.
*   Relies on Stripe Webhooks to keep the application's state synchronized with the subscription status.
*   **Key Webhook Events Handled (`/api/webhooks/stripe`):**
    *   `checkout.session.completed`: To link a Stripe Customer and Subscription to a community upon successful checkout.
    *   `customer.subscription.created` / `customer.subscription.updated`: To update the community's `current_plan_id` based on the active subscription status and plan.
    *   `customer.subscription.deleted`: To downgrade the community back to the 'free' plan when a subscription is canceled or ends.
    *   `invoice.paid`: To confirm successful recurring payments.
    *   `invoice.payment_failed`: To log failed payment attempts and potentially notify admins.
*   Provides a Stripe Billing Portal session (`/api/stripe/create-portal-session`) for users to manage their subscriptions.
*   Enforces resource limits (e.g., max active wizards) based on the community's plan using functions in `src/lib/quotas.ts`.

## 11. Notes for Contributors

*   **Understand the JWT flow:** How the token is generated (`/api/auth/session`) and verified (`withAuth.ts`) is central.
*   **Review Data Models:** Check `docs/current-db-schema.db` and `migrations/` for database structure.
*   **Component Structure:**
    *   Admin UI: `WizardStepEditorPage.tsx`, `StepEditor.tsx`, `StepSidebar.tsx`.
    *   User UI: `WizardSlideshowModal.tsx`, `StepDisplay.tsx`, components in `steps/display/`.
*   **Hooks:** Core logic often resides in React Query hooks (`src/hooks/`).
*   **Context:** `AuthContext.tsx` and `CgLibContext.tsx` manage global state/instances.
*   **API Routes:** Backend logic lives in `src/app/api/`.
*   **Styling:** Uses Tailwind CSS and `shadcn/ui`.
*   **Run Migrations:** Use your migration tool (`npm run migrate` or similar) after pulling changes or creating new migrations.


old description:

This sample plugin demonstrates the core capabilities of the [Common Ground Plugin Library](https://github.com/Common-Ground-DAO/CGPluginLib).

It provides a practical example of integrating the plugin library, showcasing essential frontend-backend interactions and common use cases.

Use this as a reference implementation to understand how to leverage the full feature set of CG plugins in your own applications.

## Getting Started
Install the dependencies:
```bash
yarn
```
Then run the development server:
```bash
yarn dev
```

The project will start running on [http://localhost:5000](http://localhost:5000). Unfortunately, there's not a lot of use for running this project locally since, as a plugin, it requests all its data from Common Ground when running through an iframe.

To use this plugin, you have three options:

1. Use a reverse proxy (such as ngrok):
   - [Install ngrok](https://ngrok.com/docs/getting-started/)
   - Start your local dev server: `yarn dev` 
   - In a new terminal, start ngrok: `ngrok http 5000`
   - Copy the ngrok HTTPS URL (e.g. https://abc123.ngrok.io)
   - Register this URL as your plugin on Common Ground
   - Test the plugin functionality within Common Ground's interface

   Note: Only use ngrok for development/testing. Running a production plugin through ngrok could be a security risk.


2. Deploy and test it live:
   - Host this project on a server with a public URL (e.g. using Vercel, Netlify, etc.)
   - Register it as a plugin on Common Ground using your public URL
   - Test the plugin functionality within Common Ground's interface

3. Use it as a reference implementation:
   - Use it as a starting point for building your own custom plugin
   - Adapt the functionality to match your specific use case

## Next steps

For details on how the Plugin Library works and more, be sure to check [the repo for the Plugin Library](https://github.com/Common-Ground-DAO/CGPluginLib)

## Protected API Routes & Authentication

This plugin uses a custom JWT-based authentication system to secure backend API routes. This ensures that only authenticated users (and, for admin routes, only admins) can access sensitive endpoints.

### How It Works

1. **JWT Issuance:**
   - After the frontend initializes and verifies the user's admin status, it requests a JWT from `/api/auth/session`.
   - The backend issues a signed JWT containing claims such as `userId`, `communityId`, `iframeUid`, `isAdmin`, and an expiry.
   - The frontend stores the JWT in memory (via React context) and includes it in the `Authorization` header for all protected API calls.

2. **Backend Protection:**
   - Protected API routes use a `withAuth` middleware to verify the JWT and extract claims.
   - The middleware attaches the claims to the request object for use in your route handler.
   - You can check for properties like `isAdmin` to restrict access to certain endpoints.

### Example: Protecting an Admin Route

```typescript
// Example API route: src/pages/api/wizards/index.ts
import { withAuth } from '@/utils/withAuth';

export default withAuth(async (req, res) => {
  // req.auth contains the JWT claims
  if (!req.auth.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  // ...perform admin-only logic...
  res.json({ success: true });
});
```

### Adding New Protected Endpoints
- Use the `withAuth` middleware on any route that requires authentication.
- Check `req.auth` for properties like `userId`, `communityId`, `isAdmin`, etc.
- For admin-only routes, always check `req.auth.isAdmin` before proceeding.

### Security Notes
- **Never trust client-supplied values** (like `communityId` or `iframeUid`) without verifying them via the JWT.
- Keep your JWT secret safe and never commit it to version control.
- Use HTTPS in production to protect JWTs in transit.
- Keep JWT expiry short and refresh as needed.

## `withAuth` Middleware: Securing API Routes

The `withAuth` middleware (see `src/lib/withAuth.ts`) is a higher-order function for protecting API routes with JWT authentication and (optionally) admin-only access.

### Usage

Wrap your API route handler with `withAuth`:

```typescript
import { withAuth } from '@/lib/withAuth';

// Example: Protect a route for any authenticated user
export const GET = withAuth(async (req) => {
  // Access JWT claims via req.user
  const { sub: userId, communityId, isAdmin } = req.user;
  return NextResponse.json({ userId, communityId, isAdmin });
});

// Example: Protect a route for admins only
export const POST = withAuth(async (req) => {
  // Only admins reach this point
  // ...admin logic...
  return NextResponse.json({ success: true });
}, true); // Pass 'true' for adminOnly
```

### How It Works
- The middleware checks for a valid JWT in the `Authorization` header (`Bearer <token>`).
- If valid, it attaches the decoded JWT claims to `req.user`.
- If `adminOnly` is set to `true`, it checks the `adm` claim in the JWT and rejects non-admins.
- Handles token expiry and invalid tokens with appropriate HTTP status codes.

### Accessing JWT Claims
The decoded JWT payload is available on `req.user` in your handler. Example claims:
- `sub`: User ID
- `communityId`: Community ID
- `iframeUid`: Iframe session ID
- `adm`: Boolean, true if user is admin
- `exp`, `iat`: Token expiry and issued-at timestamps

### Example: Full Route Implementation
```typescript
import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
  if (!req.user.adm) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  // ...fetch and return admin data...
  return NextResponse.json({ data: 'secret admin stuff' });
});
```

### Notes
- Always use `withAuth` for any route that should not be public.
- For admin-only routes, pass `true` as the second argument.
- Never trust client-supplied values; always use values from `req.user`.
- The JWT secret must be set in your environment as `JWT_SECRET`.

## ENS Verification Feature

This plugin includes an Ethereum Name Service (ENS) verification feature, allowing users to verify ownership of ENS domains. The feature consists of:

1. **Wallet Connection:** Users connect their Ethereum wallet using RainbowKit.

2. **ENS Verification:** The system checks if the connected wallet has a primary ENS name set via reverse resolution.

3. **ENS Lookup Tool:** Users can search for any ENS name to find which Ethereum address owns it. This helps when users have multiple wallets and need to identify which one to connect.

4. **Modern UI:** Clean, Apple-inspired design with translucent elements, blur effects, and clear visual feedback during the verification process.

### Implementation Details

- Uses `wagmi`'s `useEnsAddress` hook for forward resolution (ENS name → address)
- Uses `ethereum-identity-kit`'s `useProfileDetails` for reverse resolution (address → ENS name)
- Integrates directly with the wallet connection flow
- Transforms verification into a clear two-step process (connect wallet → verify ENS)

### TODO: Handle ENS Forward/Reverse Resolution Edge Case

We've identified an edge case where users may own an ENS name (visible through our lookup tool), but have not set it as their primary ENS name for reverse resolution. This creates confusion as the user connects the correct wallet but still sees "No ENS Name Found".

**Planned Solution:**
- Check both forward and reverse resolution for ENS names
- When a wallet owns ENS names but has no primary ENS set, show a specific message
- Provide clear guidance to help users set their primary ENS name in the ENS app
- Potentially list ENS names owned by the wallet
- Add link/button to the ENS app with instructions