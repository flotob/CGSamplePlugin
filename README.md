<div align='center'>
    <h1>CG Sample Plugin</h1>
</div>

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