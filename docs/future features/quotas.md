**Überlegungen zur Benutzeranfrage**

Es scheint, dass der Nutzer eine Plattform betreibt, auf der Kunden "Unterbenutzer" haben könnten – also eine Art Multi-Tenant-Struktur. Vielleicht messen sie die API-Nutzung dieser Unterbenutzer und haben für jede "Top-Level"-Kunden einige Quoten. Sie bevorzugen eine einfachere Datenstruktur, ohne monatliche Tabellen, sondern eine, die tägliche oder gleitende Zeiträume verwendet. Wir sollten ein Schema entwickeln, das pro Aktion protokolliert und die Zählungen bei Bedarf dynamisch ableitet.

**Überlegungen zur Schema-Anpassung**

Ich plane eine überarbeitete Datenstruktur mit einer Tabelle für Ereignisprotokolle (Einzelaktionen wie API-Aufrufe mit Zeitstempel), die für schnelle Abfragen indiziert wird. Zur Unterstützung der Abfragegeschwindigkeit könnte ein Materialized View helfen. Wir müssen auch sicherstellen, dass Organisationen und Nutzer ordentlich getrennt werden. Im Vordergrund steht die Kontoverwaltung mit zugeordneten Nutzern und Plänen. Zusätzliche Tabellen wie z.B. für aggregierte Zähler oder Redis für Leistungsoptimierungen wären sinnvoll. Ein rollierendes Abfragefenster könnte die Anforderungen erfüllen.


Nachgedacht für 18 Sekunden


Below is a **lean, multi-tenant schema** that matches the model you just clarified:

1. **The paying entity is an `account`** (your customer).
2. Each account can have many **end-`users`**.
3. **Every action is written once** into a single fact table `usage_events`.
4. Your middleware enforces quotas by **counting rows in that table** inside whatever *rolling* or *fixed* window you choose (24 h, 7 d, 30 d, etc.).
5. No monthly “buckets” are required—but you can add a **cached counter** if the naïve `COUNT(*)` ever becomes too slow.

---

```sql
--------------------------------------------------------------------
-- 0. Handy extensions
--------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;

--------------------------------------------------------------------
-- 1.  Plans & per-plan hard limits  (unchanged, but tied to ACCOUNTS)
--------------------------------------------------------------------
CREATE TABLE plans (
    id               SERIAL  PRIMARY KEY,
    code             TEXT    UNIQUE NOT NULL,      -- 'free', 'basic', 'pro'
    name             TEXT    NOT NULL,
    price_cents      INTEGER NOT NULL DEFAULT 0,
    stripe_price_id  TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TYPE feature AS ENUM ('api_calls', 'wizard');  -- extend freely

CREATE TABLE plan_limits (
    plan_id     INTEGER  REFERENCES plans(id) ON DELETE CASCADE,
    feature     feature  NOT NULL,
    hard_limit  INTEGER  NOT NULL,        -- NULL ⇒ unlimited
    PRIMARY KEY (plan_id, feature)
);

--------------------------------------------------------------------
-- 2.  Accounts (the *customer*)  & their end-users
--------------------------------------------------------------------
CREATE TABLE accounts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    current_plan_id  INTEGER NOT NULL REFERENCES plans(id),
    stripe_customer_id TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    email      CITEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, email)                   -- no duplicates inside an account
);

--------------------------------------------------------------------
-- 3.  Usage events  (one row per action)
--------------------------------------------------------------------
CREATE TABLE usage_events (
    id           BIGSERIAL PRIMARY KEY,
    account_id   UUID     NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id      UUID     REFERENCES users(id) ON DELETE SET NULL,
    feature      feature  NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For fast “events in last N hours” look-ups
CREATE INDEX idx_usage_events_account_feature_time
          ON usage_events (account_id, feature, occurred_at DESC);

--------------------------------------------------------------------
-- 4.  (optional) Cached counters for hot paths
--------------------------------------------------------------------
CREATE TABLE usage_counters (
    account_id  UUID     NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    feature     feature  NOT NULL,
    window_end  TIMESTAMPTZ NOT NULL,     -- when this snapshot expires
    used        INTEGER  NOT NULL,
    PRIMARY KEY (account_id, feature)
);
```

---

## How enforcement works in code

```ts
/**
 * Pseudocode used at the very top of each API route or middleware
 */
async function enforceQuota(accountId: string, feature: 'api_calls' | 'wizard') {
  // 1️⃣  How many events in the rolling window?
  const windowStart = sql`now() - interval '30 days'`;     // or 24h, 7d, …
  const { rows: [{ used }] } = await db.query(sql`
    SELECT COUNT(*) AS used
      FROM usage_events
     WHERE account_id = ${accountId}
       AND feature     = ${feature}
       AND occurred_at >= ${windowStart}
  `);

  // 2️⃣  What is the plan’s hard limit?
  const { rows: [{ hard_limit }] } = await db.query(sql`
    SELECT hard_limit
      FROM plan_limits pl
      JOIN accounts a ON a.current_plan_id = pl.plan_id
     WHERE a.id = ${accountId}
       AND pl.feature = ${feature}
  `);

  if (hard_limit IS NOT NULL && used >= hard_limit) {
    throw new QuotaExceededError(hard_limit);   // respond 429 in the handler
  }

  // 3️⃣  If OK, immediately log the event for this request
  await db.query(sql`
    INSERT INTO usage_events (account_id, user_id, feature)
    VALUES (${accountId}, ${req.user.id}, ${feature});
  `);
}
```

*You query **first**, then write the new event, to avoid under-counting.
If you worry about two concurrent requests sneaking past the limit, wrap ①–③ in a transaction with `SERIALIZABLE` isolation or use Redis’ atomic `INCR` as a fast front-door counter.*

---

## Why a single **events** table instead of monthly buckets?

| You asked                                | Single-table answer                                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **“Just check every action in the DB.”** | `SELECT COUNT(*) … occurred_at >= now() - interval 'N'` is the simplest.  With the index above it’s fast for **tens of millions** of rows.            |
| **Fixed or rolling window**              | Same query; just change the `interval`.                                                                                                               |
| **Need daily/weekly analytics later**    | All raw events are already there.  You can aggregate as needed or build materialized views.                                                           |
| **No reset job to run**                  | Because you filter on timestamp, nothing to “zero out.” Old rows simply fall outside the window.                                                      |
| **Retention**                            | Add `ALTER TABLE usage_events SET (toast.autovacuum_enabled = …)` or run a nightly `DELETE` of rows older than, say, 90 days if storage is a concern. |

In short, **one append-only table keeps your logic trivial**, scales well with proper indexing, and preserves history for future analytics or debugging.

---

### When do you need the `usage_counters` table (or Redis)?

* When each request must be *ultra-low-latency* and a `COUNT(*)` is too slow.
* When you expect hundreds of writes/second and want to avoid hot-spotting the same index keys.

In that case, the flow becomes:

1. Try an atomic `INCR` in Redis (key: `"acct:${id}:${feature}"` with a 30-day TTL).
2. If Redis says the new count > limit, block immediately.
3. Async worker flushes Redis counts into `usage_counters` or directly into `usage_events` every few minutes for persistence.

But you don’t *have* to build that on day 1; start with the pure-SQL version and measure.

---

## Migrating this into Prisma

```prisma
model Account {
  id              String   @id @default(uuid())
  name            String
  currentPlanId   Int
  plan            Plan     @relation(fields: [currentPlanId], references: [id])
  users           User[]
  // …
}

model User {
  id         String    @id @default(uuid())
  accountId  String
  account    Account   @relation(fields: [accountId], references: [id])
  email      String
  // …
}

enum Feature {
  api_calls
  wizard
}

model UsageEvent {
  id         BigInt   @id @default(autoincrement())
  accountId  String
  userId     String?
  feature    Feature
  occurredAt DateTime @default(now())

  @@index([accountId, feature, occurredAt(sort: Desc)])
}
```

*(Add `Plan`, `PlanLimit`, etc., analogously.)*

---

### TL;DR

* **One table `usage_events`** + a good index lets a middleware “just count the last N days” with minimal schema complexity.
* Tie quotas to the **`accounts`** table so all their sub-users share a single allowance.
* Upgrade path: add Redis or a cached `usage_counters` table **only when** the raw `COUNT(*)` isn’t fast enough.

This keeps your Next.js code straightforward today and still leaves room to scale or offer detailed analytics tomorrow.
