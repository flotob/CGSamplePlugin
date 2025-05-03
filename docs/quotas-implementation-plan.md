# Quotas System: Implementation Plan

## 1. Goal

Implement a general-purpose, multi-tenant quota system based on the concepts outlined in `docs/future features/quotas.md`. This system will track usage of various features against limits defined by plans associated with customer accounts (currently represented as `communities`). This foundational system should be built before or in parallel with features requiring granular usage tracking and limits, such as the proposed AI Quizmaster.

## 2. Current State Analysis & Integration Points

Based on `docs/current-db-schema.db`:

*   **Accounts:** The existing `communities` table (with `id` of type `text`) serves as the primary customer/account entity. We will adapt this table rather than creating a separate `accounts` table.
*   **Users:** The existing `user_profiles` table (with `user_id` of type `text`) holds user profile data. It lacks a direct foreign key to `communities`. The linkage appears to be contextual (via JWT claims `sub` for user ID and `cid` for community ID). For the quota system, we will rely on this contextual link when logging events, storing both `community_id` and `user_id` in the `usage_events` table. We will *not* initially modify `user_profiles` to add a `community_id` column, assuming a user's community context is always available during requests that need quota checks.
*   **Missing Elements:** Plans, plan limits, and usage event tracking tables are currently absent.

## 3. Proposed Schema Changes

We will introduce new tables and modify the existing `communities` table.

```sql
--------------------------------------------------------------------
-- 0. Handy extensions (Assuming already present or add if needed)
--------------------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS pgcrypto; -- If UUIDs are needed elsewhere
-- CREATE EXTENSION IF NOT EXISTS citext; -- If case-insensitive emails needed later

--------------------------------------------------------------------
-- 1. Plans & per-plan hard limits (NEW)
--------------------------------------------------------------------
CREATE TABLE plans (
    id               SERIAL  PRIMARY KEY,          -- Simple integer ID for plans
    code             TEXT    UNIQUE NOT NULL,      -- e.g., 'free', 'pro_v1', 'enterprise'
    name             TEXT    NOT NULL,             -- User-friendly name
    price_cents      INTEGER NOT NULL DEFAULT 0,   -- Price in cents
    stripe_price_id  TEXT    UNIQUE,               -- Link to Stripe Price object (optional for now)
    is_active        BOOLEAN NOT NULL DEFAULT TRUE -- Allows retiring old plans
);

-- Define the trackable features (NEW ENUM TYPE)
-- Add new features here as needed (e.g., 'dalle_image_generation')
CREATE TYPE feature_enum AS ENUM (
    'ai_chat_message',
    'wizard_step_completion',
    'api_call_generic' -- Example for other potential tracked calls
    -- Add other features as needed
);

CREATE TABLE plan_limits (
    plan_id     INTEGER      REFERENCES plans(id) ON DELETE CASCADE,
    feature     feature_enum NOT NULL,
    time_window INTERVAL     NOT NULL,        -- e.g., '1 day', '30 days', '1 hour'
    hard_limit  BIGINT       NOT NULL,        -- Use BIGINT for potentially large limits. NULL could mean unlimited, but explicit large numbers are safer.
    PRIMARY KEY (plan_id, feature, time_window) -- Allows different limits for the same feature over different windows (e.g., daily and monthly)
);

--------------------------------------------------------------------
-- 2. Accounts (MODIFY existing 'communities' table)
--------------------------------------------------------------------
-- Add a column to link communities to their current plan
ALTER TABLE communities ADD COLUMN current_plan_id INTEGER;

-- Add a foreign key constraint AFTER populating the column
-- ALTER TABLE communities ADD CONSTRAINT fk_communities_plan
--    FOREIGN KEY (current_plan_id) REFERENCES plans(id);

-- Consider adding stripe_customer_id if/when Stripe integration happens
-- ALTER TABLE communities ADD COLUMN stripe_customer_id TEXT UNIQUE;


--------------------------------------------------------------------
-- 3. Usage events (NEW TABLE)
--------------------------------------------------------------------
CREATE TABLE usage_events (
    id           BIGSERIAL    PRIMARY KEY,
    community_id TEXT         NOT NULL,         -- References communities.id (keeping type 'text')
    user_id      TEXT         NOT NULL,         -- References user_profiles.user_id (keeping type 'text')
    feature      feature_enum NOT NULL,
    occurred_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    idempotency_key TEXT      UNIQUE            -- Optional: For preventing duplicate event logging from retries
);

-- Index for fast lookups by community, feature, within a time window
CREATE INDEX idx_usage_events_community_feature_time
          ON usage_events (community_id, feature, occurred_at DESC);

-- Optional: Index for user-specific feature usage if needed later
-- CREATE INDEX idx_usage_events_user_feature_time
--           ON usage_events (user_id, feature, occurred_at DESC);

--------------------------------------------------------------------
-- 4. (Optional Future) Cached counters
--------------------------------------------------------------------
-- As described in quotas.md, only implement if COUNT(*) becomes a bottleneck.
/*
CREATE TABLE usage_counters (
    community_id TEXT         NOT NULL, -- REFERENCES communities(id) ON DELETE CASCADE,
    feature      feature_enum NOT NULL,
    window_end   TIMESTAMPTZ  NOT NULL, -- End of the window this count represents
    used         BIGINT       NOT NULL,
    PRIMARY KEY (community_id, feature, window_end)
);
*/
```

## 4. Implementation Roadmap

1.  **Schema Definition & Migration:**
    *   Define the new `feature_enum` type.
    *   Create the `plans` table.
    *   Create the `plan_limits` table.
    *   Create the `usage_events` table with its index.
    *   Add the `current_plan_id` column to the `communities` table.
    *   Write and apply the database migration script (`node-pg-migrate`).
2.  **Seed Initial Data:**
    *   Insert default plans (e.g., 'free', 'pro') into the `plans` table.
    *   Define and insert initial limits for these plans into `plan_limits` (e.g., free plan gets 100 `ai_chat_message` per '1 day').
    *   Update existing `communities` to assign a default `current_plan_id` (likely the 'free' plan ID). Add the foreign key constraint.
3.  **Core Enforcement Logic:**
    *   Create a reusable function/middleware (`enforceQuota` or similar) in the backend (`src/lib/quotas.ts`?).
    *   This function takes `communityId`, `userId`, and `feature` as input.
    *   It queries `plan_limits` to find the relevant limit(s) for the community's plan and the given feature.
    *   It queries `usage_events` using `COUNT(*)` within the specified `time_window` (e.g., `occurred_at >= now() - plan_limits.time_window`).
    *   It compares the count against the `hard_limit`.
    *   If the limit is exceeded, it throws a specific error (e.g., `QuotaExceededError`).
    *   **Crucially:** This check should happen *before* the action consuming the quota is performed.
4.  **Event Logging:**
    *   Create a function (`logUsageEvent`) to insert records into `usage_events`.
    *   Integrate `logUsageEvent` into the first feature that needs tracking (e.g., the AI Chat API route). This call should happen *after* the action has been successfully performed (or is about to be). Ensure the `community_id` and `user_id` from the request context (e.g., `req.user`) are logged.
5.  **Integrate Enforcement & Logging:**
    *   In the target API route/middleware (e.g., `/api/quiz/route.ts` for AI chat):
        *   Call `enforceQuota` at the beginning.
        *   If it passes, proceed with the core logic (e.g., calling OpenAI).
        *   If the core logic succeeds, call `logUsageEvent`.
        *   Handle `QuotaExceededError` by returning an appropriate response (e.g., HTTP 429).
6.  **(Future) Admin UI:** Develop UI for managing plans and limits.
7.  **(Future) Stripe Integration:** Connect plan changes and potentially `stripe_customer_id` via Stripe Checkout and webhooks.
8.  **(Future) User-Facing UI:** Display usage/limits to users/admins.
9.  **(Future) Performance Optimization:** Implement caching (`usage_counters` or Redis) if `COUNT(*)` performance degrades significantly under load.

## 5. Open Questions & Research Needed

*   **User<>Community Linkage:** Confirm that relying solely on JWT context (`cid`, `sub`) for linking usage events is sufficient, or if a persistent link in `user_profiles` (or a separate mapping table) is eventually needed for other use cases (e.g., admin dashboards viewing all users in a community).
*   **Initial `feature_enum` Set:** Finalize the list of features to track initially.
*   **Specific Limits & Windows:** Define the actual numerical limits and time windows for initial plans.
*   **Concurrency Handling:** Investigate if `SERIALIZABLE` transaction isolation or alternative locking mechanisms (like Redis `INCR`) are needed around the check-then-log pattern, especially under high concurrency, to prevent race conditions where usage might slightly exceed the limit. Start simple and add complexity only if necessary.
*   **Error Handling & User Experience:** How should quota errors (429) be presented to the user? Should the AI respond differently, or should the UI show a modal/toast?
*   **Performance Testing:** Plan how to load-test the `COUNT(*)` query on `usage_events` as the table grows.
*   **Stripe Integration Details:** Research best practices for syncing Stripe plans/customers with the local DB schema. (`Vercel's Next.js Subscription Payments starter` mentioned in `ai-features.md` is a good starting point).
*   **Data Retention:** Define a policy for purging old `usage_events` if storage becomes a concern.

## 6. Next Steps

1.  Review and refine this proposed schema and roadmap.
2.  Finalize decisions on open questions, particularly the initial `feature_enum` list and limits.
3.  Begin implementing Step 1: Schema Definition & Migration.
4.  Proceed with Step 2: Seeding Initial Data. 