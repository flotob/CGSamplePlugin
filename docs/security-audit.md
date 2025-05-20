# API Security Audit

This document summarizes a quick audit of all Next.js API routes under `src/app/api`.

## Authentication checks

Most routes use the `withAuth` helper which validates a JWT from the `Authorization` header. Admin-only endpoints call `withAuth` with the `adminOnly` flag enabled. The following routes do **not** use `withAuth`:

- `api/step_types` – returns public information about available step types.
- `api/auth/session` – issues JWT tokens and must remain public.
- `api/sign` – signs payloads using a server key and currently has **no authentication**.
- `api/webhooks/stripe` – Stripe webhooks require no authentication but verify a Stripe signature.

The `/api/sign` endpoint exposes signing capabilities without any permission checks. If exposed publicly it could be abused to generate arbitrary signatures. Restricting this route or requiring authentication is recommended.

## Authorization logic

Admin routes use the `adminOnly` option in `withAuth` ensuring the `adm` claim is present in the token. User routes verify that the requested resource belongs to the user’s community. Example: `api/user/wizards/[id]/steps` checks that the wizard’s `community_id` matches the token’s community ID.

No other missing permission checks were found during this cursory review.

## Other considerations

- Rate limiting is applied to some endpoints via the quota utilities but not all. Consider adding generic rate limiting middleware.
- Input validation is handled with `zod` in many endpoints. Ensure all user‑supplied parameters are validated to avoid SQL injection or crashes.
- Sensitive operations such as Stripe webhooks use secrets from environment variables and verify incoming signatures.

Overall the API implements authentication consistently. The main issue discovered is the unauthenticated `/api/sign` route which should be restricted or removed in production.
