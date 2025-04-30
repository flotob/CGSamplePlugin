Great. I’ll generate a PostgreSQL schema for the Common Ground onboarding wizard plugin based on your full technical and design requirements, incorporating your preferences for using reference tables, enforcing uniqueness, keeping things simple for now regarding versioning and failure tracking, and using ENUM types for validation.

I’ll share a set of commented `CREATE TABLE` statements with clear relationships, constraints, suggested indexes, and notes on data types and modularity.

# Common Ground Onboarding Wizard Schema Design

The following database schema supports a modular onboarding wizard plugin for the Common Ground platform. It is designed to handle multiple communities and flexible, multi-step onboarding flows where each step can grant a user role upon successful verification. We use **UUID** primary keys for global uniqueness (suitable for a multi-tenant platform) ([Leveraging UUIDs as Primary Keys in Your Applications | by Seliesh Jacob | Medium](https://medium.com/@selieshjksofficial/leveraging-uuids-as-primary-keys-in-your-applications-85efcd0163bb#:~:text=6.%20Multi)), **JSONB** for dynamic configuration data, and strict referential constraints to maintain data integrity. Key design features include:

- **Multi-Community Support:** Every relevant table includes a `community_id` to scope data to a Common Ground community. Onboarding wizards are linked to communities, and each wizard’s name is unique within its community to avoid conflicts.
- **Onboarding Wizards:** Each community can have one or more onboarding wizards, identified by a unique name per community. Wizards serve as containers for an ordered sequence of steps.
- **Wizard Steps:** Wizards consist of ordered steps, each defined by a `step_type` and a configuration blob. Steps are linked to a **step type** reference (e.g. Discord verification, Telegram verification, etc.) and have a sequence number (`step_order`) to enforce the flow order. A step is associated with a `role_id` (a role to grant the user upon completion) and includes flags like `is_mandatory` (if the step is required) and `is_active` (if the step is currently enabled).
- **Step Types Reference:** A separate `step_types` table enumerates the allowed types of steps. This allows validation of `step_type` and storage of metadata like whether a step type requires external credentials (for example, a Discord bot token) to operate. Marking a step type as requiring credentials (via a boolean flag) lets us handle integrations without storing secrets in the database, in line with best practices to avoid persisting sensitive keys ([passwords - Is there something insecure about storing secrets in plain text on the host FS? - Information Security Stack Exchange](https://security.stackexchange.com/questions/223945/is-there-something-insecure-about-storing-secrets-in-plain-text-on-the-host-fs#:~:text=Ideally%2C%20you%20don%27t%20store%20them,host)).
- **Flexible Step Configuration:** Each step has a `config` field (JSONB) to hold arbitrary parameters needed for that step. Using JSONB allows different step types to store varying data (API endpoints, messages, IDs, etc.) without altering the schema for each new parameter ([A practical guide to using the JSONB type in PostgreSQL](https://wirekat.com/a-practical-guide-to-using-the-jsonb-type-in-postgres/#:~:text=JSONB%20is%20ideal%20for%20storing,fly%20without%20database%20migrations)). This design accommodates on-the-fly changes and new step types without requiring new columns or migrations.
- **Role Assignment:** The `role_id` in each step links to a community role (from the platform’s roles table) that should be granted to the user when they successfully complete that step. This allows the platform to automatically assign roles (permissions, badges, etc.) as users verify various credentials or complete onboarding tasks.
- **User Progress Tracking:** A `user_wizard_progress` table records each step a user has completed in a given wizard, including the user ID, the step (and wizard) ID, the timestamp of completion, and any relevant data verified in that step. Storing the progress enables the application to know which steps are done, to prevent repetition and to allow users to resume incomplete wizards. The `verified_data` (JSONB) column can hold details like an external account ID or other proof collected during verification.
- **External Credentials (Verified Accounts):** For future integration, a `user_linked_credentials` table (optional) stores mappings of users to external platform identities (such as Discord, Telegram, ENS, etc.) that have been verified. This table is separate from the step progress, allowing reuse of these verified links outside the onboarding flow. The `platform` field uses an **ENUM** type for the set of supported platforms (e.g. 'DISCORD', 'TELEGRAM', 'ENS') ([PostgreSQL: Documentation: 17: 8.7. Enumerated Types](https://www.postgresql.org/docs/current/datatype-enum.html#:~:text=Enumerated%20,for%20a%20piece%20of%20data)). We do **not** store sensitive tokens or secrets here – only identifiers and display names – and instead simply mark that credentials are required for certain verifications (so that actual secrets can be managed via external secure storage rather than in the database) ([passwords - Is there something insecure about storing secrets in plain text on the host FS? - Information Security Stack Exchange](https://security.stackexchange.com/questions/223945/is-there-something-insecure-about-storing-secrets-in-plain-text-on-the-host-fs#:~:text=Ideally%2C%20you%20don%27t%20store%20them,host)).
- **Timestamps and Audit Info:** Every table includes `created_at` and `updated_at` timestamps to track when records are added or modified. This is useful for auditing and debugging the onboarding flows over time.
- **Referential Integrity & Cascade Rules:** Foreign key constraints ensure all references are valid. We use `ON DELETE CASCADE` on relationships where child records should be removed if the parent is deleted (e.g., if a wizard is deleted, its steps and user progress entries are automatically removed) ([sql - PostgreSQL: FOREIGN KEY/ON DELETE CASCADE - Stack Overflow](https://stackoverflow.com/questions/14141266/postgresql-foreign-key-on-delete-cascade#:~:text=A%20foreign%20key%20with%20a,is%20called%20a%20cascade%20delete)). For references to shared entities like roles or step types, we use restrictive deletion (`ON DELETE RESTRICT` or the default) to prevent removing a role or step type that is in use by an onboarding step. This combination of cascades and restrictions maintains consistency and prevents orphaned data.
- **Indexes for Performance:** To optimize common queries, indexes are created on key columns. For example, we index wizards by `community_id` to quickly retrieve all wizards in a community, index steps by `wizard_id` and `step_order` to fetch the ordered steps efficiently, index user progress by `user_id` and `wizard_id` to lookup a user’s progress in a given wizard, and index linked credentials by `user_id` to fetch all external accounts linked to a user. These indexes support fast lookups and enforce uniqueness where appropriate.

Below are the SQL `CREATE TABLE` statements for the schema, with inline comments explaining each column and constraint:

## Onboarding Wizards

This table stores the onboarding wizards defined for communities. Each wizard is tied to a `community_id` and has a unique name within that community. It may also have an optional description and an active flag to enable/disable it without deletion.

```sql
CREATE TABLE onboarding_wizards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),        -- Unique wizard identifier (primary key)
    community_id UUID NOT NULL,                           -- Owning community (FK to communities table)
    name TEXT NOT NULL,                                   -- Name of the wizard (must be unique within the community)
    description TEXT,                                     -- Optional description of this onboarding wizard
    is_active BOOLEAN NOT NULL DEFAULT TRUE,              -- Flag to mark the wizard as active or disabled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),        -- Timestamp when the wizard was created
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),        -- Timestamp when the wizard was last updated
    CONSTRAINT uniq_wizard_name_per_community UNIQUE (community_id, name),       -- Ensure each community has a unique wizard name
    CONSTRAINT fk_wizard_community FOREIGN KEY (community_id) 
        REFERENCES communities(id) ON DELETE CASCADE      -- Link to Communities table; cascade delete wizards if community is removed
);
```

> **Note:** The `communities` table is part of the broader platform and is referenced here via `community_id`. The `ON DELETE CASCADE` ensures all wizards for a community are removed if that community is deleted, preventing orphaned records ([sql - PostgreSQL: FOREIGN KEY/ON DELETE CASCADE - Stack Overflow](https://stackoverflow.com/questions/14141266/postgresql-foreign-key-on-delete-cascade#:~:text=A%20foreign%20key%20with%20a,is%20called%20a%20cascade%20delete)).

## Step Types Reference

The `step_types` table defines the allowed types of onboarding steps. Each step type might correspond to a kind of verification or action (for example, verifying a Discord account, linking a Telegram, checking an ENS domain, etc.). This reference table helps validate `step_type` entries in the steps table and can store metadata about each type, such as whether it requires external credentials (API keys, bot tokens) to function. Using a reference table (instead of free-form text) ensures consistency and makes it easy to manage or describe step behaviors.

```sql
CREATE TABLE step_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),    -- Unique identifier for the step type
    name TEXT NOT NULL UNIQUE,                        -- Human-readable name or code for this step type (must be unique)
    requires_credentials BOOLEAN NOT NULL DEFAULT FALSE, -- True if this step type needs external credentials (tokens/API keys)
    description TEXT,                                 -- Optional description of what this step type entails
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),    -- When this step type was created/added
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()     -- Last update timestamp for this step type
);
```

> **Note:** The `requires_credentials` flag is used to indicate step types that need integration with external services (for example, a Discord verification step likely needs a Discord bot token configured). We **do not** store the actual secrets in the database for security reasons – instead, this flag informs the system that an external credential is needed, which should be provided via secure configuration outside the DB ([passwords - Is there something insecure about storing secrets in plain text on the host FS? - Information Security Stack Exchange](https://security.stackexchange.com/questions/223945/is-there-something-insecure-about-storing-secrets-in-plain-text-on-the-host-fs#:~:text=Ideally%2C%20you%20don%27t%20store%20them,host)). This approach keeps sensitive data out of the table while still tracking the requirement.

## Wizard Steps

The `onboarding_steps` table defines the individual steps for each wizard. Each step belongs to a wizard (`wizard_id` foreign key) and is of a certain type (`step_type_id` referencing the `step_types` table). The `step_order` field determines the sequence of steps in the wizard. We store a JSONB `config` for any step-specific settings or parameters (this could include things like messages to display, IDs of external resources to verify against, etc., depending on the step type). A `role_id` is associated with the step – this is the role granted to the user upon completing the step (referencing a roles table in the platform). Flags `is_mandatory` and `is_active` control whether the step must be completed to finish the wizard and whether the step is currently active (in case an admin wants to temporarily disable a step).

```sql
CREATE TABLE onboarding_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),     -- Unique step identifier
    wizard_id UUID NOT NULL,                           -- Parent onboarding wizard (FK to onboarding_wizards)
    step_type_id UUID NOT NULL,                        -- Type of this step (FK to step_types reference table)
    step_order INT NOT NULL,                           -- Sequential order of this step in the wizard
    config JSONB NOT NULL DEFAULT '{}',                -- Configuration parameters for the step (varies by step type)
    role_id UUID NOT NULL,                             -- Role to grant user upon successful completion (FK to roles)
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,        -- Whether this step is mandatory for completing the wizard
    is_active BOOLEAN NOT NULL DEFAULT TRUE,           -- Whether this step is currently active (enabled)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),     -- Timestamp when this step was created
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),     -- Timestamp when this step was last updated
    CONSTRAINT fk_step_wizard FOREIGN KEY (wizard_id) REFERENCES onboarding_wizards(id) ON DELETE CASCADE,   -- Cascade delete steps if wizard is deleted
    CONSTRAINT fk_step_type FOREIGN KEY (step_type_id) REFERENCES step_types(id) ON DELETE RESTRICT,        -- Prevent deleting a step type in use by steps
    CONSTRAINT fk_step_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,                  -- Prevent deleting a role that is assigned to a step
    CONSTRAINT uniq_step_order_per_wizard UNIQUE (wizard_id, step_order)                                   -- Ensure no duplicate step order within the same wizard
);
```

Each step’s `config` is a JSONB field to accommodate different data needs per step type. This design provides flexibility: for example, a "Discord verification" step’s config might contain a Discord server ID or invite link, whereas an "ENS domain check" step’s config might contain a contract address or domain name to verify. Using JSONB for this configuration allows us to store these varied parameters without altering the table for each new type of step ([A practical guide to using the JSONB type in PostgreSQL](https://wirekat.com/a-practical-guide-to-using-the-jsonb-type-in-postgres/#:~:text=JSONB%20is%20ideal%20for%20storing,fly%20without%20database%20migrations)). 

The foreign keys enforce that a step cannot exist without its parent wizard, and that the `step_type` and `role` referenced are valid. Deleting a wizard will automatically remove its steps (and related progress records via cascade rules), whereas deleting a step type or role that is in use will be blocked (`RESTRICT`), since those are fundamental to the definition of an existing step.

> **Note:** The `roles` table (referenced by `role_id`) is assumed to exist in the Common Ground platform schema (holding community roles). The `role_id` here links a step to a community-specific role (e.g., "Discord Verified" or "Onboarding Complete"). By granting this role when the step is completed, the system can mark users as verified or give them appropriate permissions. We use a foreign key to ensure the role exists, but choose not to cascade deletes – if a role is removed, any step granting it would become invalid and should be updated or removed manually, rather than automatically dropped.

## User Progress Tracking

The `user_wizard_progress` table tracks the completion of wizard steps by users. Each record represents a user successfully completing a specific step in a specific wizard. We store the `user_id`, the `wizard_id` (for clarity, even though it can be inferred from the step), the `step_id` that was completed, a JSONB blob of any `verified_data`, and a timestamp of completion. The combination of **user + wizard + step** is the primary key, ensuring a user cannot have two separate completion records for the same step. This also inherently means each step is recorded once per user (if a user were to redo a step, the same record could be updated or overwritten rather than duplicating).

```sql
CREATE TABLE user_wizard_progress (
    user_id UUID NOT NULL,                           -- User who completed the step (FK to users table)
    wizard_id UUID NOT NULL,                         -- The onboarding wizard in which the step is contained (FK to onboarding_wizards)
    step_id UUID NOT NULL,                           -- The specific step that was completed (FK to onboarding_steps)
    verified_data JSONB,                             -- Any data/credentials verified during this step (stored for record)
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Timestamp when the user completed this step
    PRIMARY KEY (user_id, wizard_id, step_id),
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,         -- Remove progress if user is deleted
    CONSTRAINT fk_progress_wizard FOREIGN KEY (wizard_id) REFERENCES onboarding_wizards(id) ON DELETE CASCADE, -- Remove progress if wizard is deleted
    CONSTRAINT fk_progress_step FOREIGN KEY (step_id) REFERENCES onboarding_steps(id) ON DELETE CASCADE      -- Remove progress if the step is deleted
);
```

**Purpose:** This table lets us query which steps a user has finished. For example, to check if a user has completed all mandatory steps of a wizard, we can query this table for that user and wizard. The `verified_data` column can store evidence from the verification (for instance, it might contain `{"discord_id": "123456789", "discord_username": "Alice#1234"}` for a Discord step, or an ENS name or wallet address for an ENS verification step). This is stored as JSONB to accommodate different data for different steps. Storing this data can be useful for audit or for reuse (e.g., showing the user what account they linked), but the primary linkage for reuse is the separate credentials table (described next).

The foreign keys ensure that progress records cannot exist without the corresponding user, wizard, and step. If a wizard or step is deleted or a user account is removed, the relevant progress entries will be automatically deleted as well (cascade), keeping the database clean. Conversely, if we want to preserve a record of what steps were completed even after a wizard is gone, we might choose to handle deletions differently; but in this design we opt for automatic cleanup to avoid orphaned progress.

## Verified External Credentials (User-Linked Accounts)

The `user_linked_credentials` table is an optional table to persist verified external identities for users. When a user completes certain verification steps (Discord, Telegram, ENS, etc.), we may want to store the mapping between the user’s Common Ground identity and their external account ID for future use (for example, to automate giving Discord roles, or to avoid asking the user to verify the same account again in another context). This table is not strictly required for the functioning of the onboarding wizard, but it extends the utility by keeping a record of external accounts that have been linked and verified.

Each record in this table represents one external account linked to a user. It includes a unique `id`, the `user_id`, the `platform` (type of external service), an `external_id` (the unique identifier of the user on that platform, such as a Discord user ID, Telegram ID, or an ENS domain/account), and an optional `username` or display name for convenience. We also include timestamps for auditing.

We use a PostgreSQL **ENUM** type for the `platform` field to restrict it to a fixed set of values (e.g. 'DISCORD', 'TELEGRAM', 'ENS', etc.) ([PostgreSQL: Documentation: 17: 8.7. Enumerated Types](https://www.postgresql.org/docs/current/datatype-enum.html#:~:text=Enumerated%20,for%20a%20piece%20of%20data)). This makes queries and maintenance easier, as the allowed platforms are predefined. If new integration types are added in the future, the enum can be altered to include them, or this design could be adjusted to a reference table similar to `step_types`. Two uniqueness constraints enforce that each user can link at most one account of a given platform, and that each external account (platform + external ID) is linked to at most one user (preventing two users from claiming the same external identity).

```sql
-- Define an ENUM type for supported external platforms
CREATE TYPE platform_enum AS ENUM ('DISCORD', 'TELEGRAM', 'ENS', 'OTHER');

CREATE TABLE user_linked_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- Unique identifier for this linked credential record
    user_id UUID NOT NULL,                           -- User who owns this external account (FK to users table)
    platform platform_enum NOT NULL,                 -- External platform type (allowed values defined by platform_enum)
    external_id TEXT NOT NULL,                       -- Unique identifier on the external platform (e.g. user ID, handle, or address)
    username TEXT,                                   -- Optional username or display name on the external platform
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- Timestamp when this link was created (verification time)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- Timestamp when this link was last updated
    CONSTRAINT fk_credentials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,  -- Cascade delete if user is removed
    CONSTRAINT uniq_user_platform UNIQUE (user_id, platform),    -- A user can have only one linked account per platform
    CONSTRAINT uniq_platform_id UNIQUE (platform, external_id)   -- An external account (platform+ID) can only be linked to one user
);
```

In this design, we do not store any sensitive access tokens or secrets for the external accounts, only the identifiers and names needed to recognize the user. For example, we might store that user `abc123` is linked to Discord ID `111222333444555`, but not store the OAuth token used during verification. This keeps sensitive credentials out of the database, which is a conscious security decision – if such tokens are needed, they should be stored securely (e.g., encrypted or in a secrets manager) or not at all ([passwords - Is there something insecure about storing secrets in plain text on the host FS? - Information Security Stack Exchange](https://security.stackexchange.com/questions/223945/is-there-something-insecure-about-storing-secrets-in-plain-text-on-the-host-fs#:~:text=Ideally%2C%20you%20don%27t%20store%20them,host)). The boolean `requires_credentials` in the `step_types` table helps signal which steps involve such tokens so that the system can handle them appropriately outside the DB.

The ENUM `platform_enum` limits the `platform` field to known values. Enumerated types in PostgreSQL are ideal for representing a fixed set of constants like this ([PostgreSQL: Documentation: 17: 8.7. Enumerated Types](https://www.postgresql.org/docs/current/datatype-enum.html#:~:text=Enumerated%20,for%20a%20piece%20of%20data)). In our case we've included a generic 'OTHER' value as well, to allow flexibility for any future platforms not originally anticipated.

## Indexes and Constraints

To ensure efficient querying and enforce business rules, we have added indexes and constraints beyond the basic primary keys and foreign keys:

- **Unique Constraints:** We have unique constraints such as `uniq_wizard_name_per_community` on `(community_id, name)` to guarantee no duplicate wizard names in a community, and `uniq_step_order_per_wizard` on `(wizard_id, step_order)` so that step ordering within a wizard is unambiguous. In the `user_linked_credentials` table, `uniq_user_platform` and `uniq_platform_id` ensure one-to-one relationships between users and their external accounts per platform.
- **Foreign Key Cascades/Restricts:** As explained, foreign keys use cascade deletes for hierarchical data. For instance, deleting a wizard cascades to its steps (and those cascades further to progress), and deleting a user cascades to their progress records and linked credentials. This **ON DELETE CASCADE** behavior automatically cleans up child records when a parent is removed ([sql - PostgreSQL: FOREIGN KEY/ON DELETE CASCADE - Stack Overflow](https://stackoverflow.com/questions/14141266/postgresql-foreign-key-on-delete-cascade#:~:text=A%20foreign%20key%20with%20a,is%20called%20a%20cascade%20delete)). For foreign keys to shared reference data (like roles or step types), we do not cascade but instead restrict deletion, since those should not be removed while in use by active wizards/steps.
- **Indexes:** We create additional indexes on columns that are frequently used in lookups or sorting, to improve performance. These indexes complement the unique indexes (some of which the database creates implicitly for unique constraints) and ensure the system can scale to many communities, users, and steps. The key indexes include:

```sql
-- Index to quickly retrieve all wizards for a given community
CREATE INDEX idx_wizard_by_community ON onboarding_wizards (community_id);

-- Index to fetch steps of a wizard in order without an extra sort
CREATE INDEX idx_steps_by_wizard_order ON onboarding_steps (wizard_id, step_order);

-- Index to query a user's progress in a specific wizard efficiently
CREATE INDEX idx_progress_by_user_wizard ON user_wizard_progress (user_id, wizard_id);

-- Index to lookup all linked credentials for a particular user quickly
CREATE INDEX idx_credentials_by_user ON user_linked_credentials (user_id);
```

Each of the above indexes targets common query patterns. For example, `idx_wizard_by_community` supports listing or searching wizards within a community, `idx_steps_by_wizard_order` helps retrieve the steps of a wizard already sorted by their order, and `idx_progress_by_user_wizard` is useful when checking if a user (user_id) has completed steps in a given wizard (wizard_id) – this index can significantly speed up that check. Similarly, `idx_credentials_by_user` allows quick retrieval of all external accounts linked to a user (for example, when the user logs in, the system can find all their verified external identities).

Finally, by using **UUID** for all primary keys (and foreign keys referencing them), we ensure that identifiers are globally unique and non-sequential, which is suitable for distributed systems and multi-tenant environments ([Leveraging UUIDs as Primary Keys in Your Applications | by Seliesh Jacob | Medium](https://medium.com/@selieshjksofficial/leveraging-uuids-as-primary-keys-in-your-applications-85efcd0163bb#:~:text=6.%20Multi)). This avoids any collisions across communities and makes it easier to merge data or operate in a sharded environment if needed. It also adds a layer of security by making it difficult to guess IDs (compared to simple incremental IDs). 

In summary, this schema provides a robust framework for a multi-community onboarding wizard with modular steps. It emphasizes flexibility (through JSONB configs and reference tables for types), integrity (through foreign keys and constraints), and performance (through appropriate indexing). Each part of the schema corresponds to the requirements: community-scoped wizards, ordered step configurations with role grants, user progress tracking, and optional storage of verified external credentials – all while adhering to security best practices like not storing sensitive secrets in the database.