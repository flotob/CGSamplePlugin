# Schema Research & Design

This document details the investigation into Common Ground (CG) data types and outlines the proposed database schema for the onboarding wizard plugin, focusing on multi-community support.

## Investigation: Common Ground Data Types

Based on the type definitions in `@common-ground-dao/cg-plugin-lib/dist/index.d.ts`, the key data structures provided by the CG platform are:

**1. `CommunityInfoResponsePayload`**
   - Provides information about the community where the plugin is currently running.
   - Key Fields:
     - `id: string`: The unique identifier for the community (crucial for scoping data).
     - `title: string`: The name of the community.
     - `roles: Array<{ id: string; title: string; ... }>`: A list of roles defined within this community, each with its own unique `id`.

**2. `UserInfoResponsePayload`**
   - Provides information about the user currently interacting with the plugin.
   - Key Fields:
     - `id: string`: The unique identifier for the user within CG.
     - `name: string`: User's display name.
     - `roles: string[]`: An array of `role.id` strings representing the roles the user currently holds in the community.
     - `imageUrl: string`: URL for the user's avatar.
     - Optional linked account info (Twitter, Farcaster, etc.).

## Schema Implications & Design

The core principle is that **all plugin-specific data must be scoped by the `community_id` obtained from `CommunityInfoResponsePayload`**. This ensures data isolation between different communities using potentially cloned instances of the plugin.

### Proposed Core Tables:

**(Note: SQL syntax below is conceptual; `node-pg-migrate` uses a JavaScript/TypeScript API)**

**1. `communities`**
   - Stores a record for each CG community that has interacted with the plugin.
   - Purpose: Acts as the central anchor for all community-specific data.

   ```sql
   CREATE TABLE communities (
       -- Use the ID provided by Common Ground as the primary key
       id VARCHAR(255) PRIMARY KEY,
       -- Store the community title for reference/display
       title VARCHAR(255) NOT NULL,
       -- Timestamps
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   ```
   *Consideration: We might only need the `id`. Storing `title` could be useful but might become stale if changed in CG.* The plugin should probably upsert (insert or update) into this table whenever it initializes in a new community context based on `getCommunityInfo()`.

**2. `step_types`**
   - Defines the available types of verification steps.
   - Purpose: Enforces valid step types and allows associating metadata.

   ```sql
   CREATE TABLE step_types (
       type_id VARCHAR(50) PRIMARY KEY, -- e.g., 'discord', 'ens', 'guild'
       description TEXT,
       -- Potentially add icon name or other metadata later
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   -- Pre-populate with initial types: discord, telegram, guild, ens, efp, gitcoin_passport
   ```

**3. `wizards`**
   - Defines the onboarding wizards configured by an admin for a specific community.

   ```sql
   CREATE TABLE wizards (
       wizard_id SERIAL PRIMARY KEY, -- Internal primary key
       community_id VARCHAR(255) NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
       name VARCHAR(255) NOT NULL,
       description TEXT,
       is_active BOOLEAN NOT NULL DEFAULT true,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       -- Ensure wizard names are unique within a community
       UNIQUE (community_id, name)
   );
   ```

**4. `wizard_steps`**
   - Defines the individual steps within a specific wizard, including their order and configuration.

   ```sql
   -- Define ENUM types first (if using)
   CREATE TYPE ens_requirement_enum AS ENUM ('any_primary', 'specific_domain');
   -- Add other ENUMs as needed

   CREATE TABLE wizard_steps (
       step_id SERIAL PRIMARY KEY, -- Internal primary key
       wizard_id INTEGER NOT NULL REFERENCES wizards(wizard_id) ON DELETE CASCADE,
       step_type_id VARCHAR(50) NOT NULL REFERENCES step_types(type_id),
       step_order INTEGER NOT NULL,
       is_mandatory BOOLEAN NOT NULL DEFAULT true,
       -- Store the CG Role ID to be granted upon completion
       target_role_id VARCHAR(255) NOT NULL,
       -- Flexible JSONB column for step-specific configuration
       config JSONB NOT NULL DEFAULT '{}',
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       -- Ensure step order is unique within a wizard
       UNIQUE (wizard_id, step_order)
   );
   ```
   *Example `config` JSONB content:*
   *   For ENS: `{ "requirement_type": "any_primary" }` or `{ "requirement_type": "specific_domain", "domain_name": "mydomain.eth" }`
   *   For Discord: `{ "server_id": "12345", "role_id": "67890" }`
   *   For Guild: `{ "guild_id": "555", "role_id": "777" }`

**5. `user_progress`**
   - Tracks successful completion of wizard steps by users within a community.

   ```sql
   CREATE TABLE user_progress (
       progress_id SERIAL PRIMARY KEY, -- Internal primary key
       community_id VARCHAR(255) NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
       -- Use the User ID provided by Common Ground
       user_id VARCHAR(255) NOT NULL,
       step_id INTEGER NOT NULL REFERENCES wizard_steps(step_id) ON DELETE CASCADE,
       completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       -- Optional: Store verified data (e.g., ENS name, score)
       verified_data JSONB,
       -- Ensure a user can only complete a specific step once
       UNIQUE (user_id, step_id)
   );
   CREATE INDEX idx_user_progress_user_step ON user_progress (user_id, step_id);
   CREATE INDEX idx_user_progress_community_user ON user_progress (community_id, user_id);
   ```

**6. `linked_credentials` (Optional but Recommended)**
   - Stores verified links between CG users and external identifiers.
   - Purpose: Avoids redundant checks, potential future use.

   ```sql
   CREATE TYPE credential_type_enum AS ENUM ('discord_id', 'telegram_id', 'wallet_address', 'ens_name');

   CREATE TABLE linked_credentials (
       credential_id SERIAL PRIMARY KEY,
       community_id VARCHAR(255) NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
       user_id VARCHAR(255) NOT NULL,
       credential_type credential_type_enum NOT NULL,
       credential_value TEXT NOT NULL, -- e.g., Discord ID, wallet address
       verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       -- Ensure unique credential per user/community/type
       UNIQUE (community_id, user_id, credential_type)
   );
   CREATE INDEX idx_linked_credentials_user ON linked_credentials (community_id, user_id);
   CREATE INDEX idx_linked_credentials_value ON linked_credentials (credential_type, credential_value);
   ```

## Summary & Next Steps

This schema design centers around the `communities` table, using the `community_id` from CG as the primary means of data scoping. It incorporates the recommendations regarding step types, uniqueness constraints, and the use of ENUMs and JSONB for flexibility.

The immediate next step is to translate this conceptual schema into actual migration code within the `migrations/<timestamp>_initial-setup.ts` file using the `node-pg-migrate` API. 