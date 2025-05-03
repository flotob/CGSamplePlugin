/* eslint-disable @typescript-eslint/naming-convention */
exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = async (pgm) => {
  console.log('Applying migration: create_quota_tables...');

  // 1. Create ENUM feature_enum
  console.log('Creating feature_enum type...');
  pgm.createType('feature_enum', [
    'ai_chat_message',
    'wizard_step_completion',
    'api_call_generic',
    // Add other features here as needed in future migrations
  ]);

  // 2. Create plans table
  console.log('Creating plans table...');
  pgm.createTable('plans', {
    id: 'id', // serial PRIMARY KEY
    code: { type: 'text', notNull: true, unique: true },
    name: { type: 'text', notNull: true },
    price_cents: { type: 'integer', notNull: true, default: 0 },
    stripe_price_id: { type: 'text', unique: true },
    is_active: { type: 'boolean', notNull: true, default: true },
    // created_at/updated_at could be added if needed
  });

  // 3. Create plan_limits table
  console.log('Creating plan_limits table...');
  pgm.createTable('plan_limits', {
    plan_id: {
      type: 'integer',
      notNull: true,
      references: '"plans"', // Reference the plans table
      onDelete: 'CASCADE',
    },
    feature: { type: 'feature_enum', notNull: true },
    time_window: { type: 'interval', notNull: true },
    hard_limit: { type: 'bigint', notNull: true },
    // Define composite primary key
    // constraint: 'plan_limits_pkey', // Optional constraint name
  });
  // Add composite primary key separately for clarity
  pgm.addConstraint('plan_limits', 'plan_limits_pkey', {
    primaryKey: ['plan_id', 'feature', 'time_window'],
  });

  // 4. Create usage_events table
  console.log('Creating usage_events table...');
  pgm.createTable('usage_events', {
    id: 'id', // bigserial PRIMARY KEY
    community_id: { type: 'text', notNull: true }, // No FK initially, assumes 'text' matches communities.id
    user_id: { type: 'text', notNull: true }, // No FK initially, assumes 'text' matches user_profiles.user_id
    feature: { type: 'feature_enum', notNull: true },
    occurred_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    idempotency_key: { type: 'text', unique: true }, // Optional
  });

  // Add index for usage_events
  pgm.createIndex('usage_events', ['community_id', 'feature', 'occurred_at'], {
    name: 'idx_usage_events_community_feature_time',
    // method: 'btree', // Default
    // order: 'DESC' // Note: node-pg-migrate might not directly support DESC in createIndex like this for all columns easily.
    // The raw SQL version in the plan handles DESC. We might need raw SQL here if DESC is critical.
    // Let's try without DESC first, or adjust if performance dictates.
    // For now, index includes occurred_at for filtering, sorting handled in query.
  });
  // If DESC is strictly needed for occurred_at:
  // pgm.sql('CREATE INDEX idx_usage_events_community_feature_time ON usage_events (community_id, feature, occurred_at DESC);');

  // 5. Add current_plan_id to communities
  console.log('Adding nullable current_plan_id column to communities...');
  pgm.addColumn('communities', {
    current_plan_id: { type: 'integer' /* No references here yet */ },
  });
  // Note: The FK constraint itself ('fk_communities_plan') should be added in a *separate* migration
  // AFTER the current_plan_id column has been populated for all existing communities.

  // 6. Insert Default Plans using raw SQL
  console.log('Inserting default plans...');
  // Using sql injection protection helper if available, otherwise ensure strings are safe
  await pgm.sql(`
    INSERT INTO plans (code, name, price_cents, is_active) VALUES
    ('free', 'Free Tier', 0, true),
    ('pro', 'Pro Tier', 1000, true); -- Example $10/month
  `);

  // 7. Update existing communities to use the 'free' plan ID
  console.log('Updating existing communities to default free plan...');
  // Fetch the ID of the 'free' plan we just inserted
  // Note: Depending on transaction isolation, SELECT might need specific handling,
  // but typically within the same transaction this should work.
  await pgm.sql(`
    UPDATE communities
    SET current_plan_id = (SELECT id FROM plans WHERE code = 'free' LIMIT 1)
    WHERE current_plan_id IS NULL; -- Only update those not already set (if any)
  `);

  // 8. Make the column NOT NULL
  console.log('Setting communities.current_plan_id to NOT NULL...');
  pgm.alterColumn('communities', 'current_plan_id', {
    allowNull: false,
  });

  // 9. Add the Foreign Key constraint
  console.log('Adding foreign key constraint fk_communities_plan...');
  pgm.addConstraint('communities', 'fk_communities_plan', {
    foreignKeys: {
      columns: 'current_plan_id',
      references: 'plans(id)',
      // Consider onDelete behavior, e.g., RESTRICT or SET NULL (if nullable again)
      // For now, default RESTRICT is fine.
      // onDelete: 'RESTRICT',
    },
  });

  console.log('Migration create_quota_tables applied successfully.');
};

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = async (pgm) => {
  console.log('Reverting migration: create_quota_tables...');

  // Reverse order of 'up'

  // 9. Remove Foreign Key constraint
  console.log('Dropping foreign key constraint fk_communities_plan...');
  pgm.dropConstraint('communities', 'fk_communities_plan');

  // 8. Make the column nullable again (optional but good practice for rollback)
  console.log('Setting communities.current_plan_id to NULLABLE...');
   pgm.alterColumn('communities', 'current_plan_id', {
    allowNull: true, // Explicitly set back to allow null if needed
   });
   // Note: The NOT NULL constraint is implicitly dropped when the FK is dropped if it was part of it,
   // or needs explicit dropping depending on DB. `alterColumn` handles making it nullable here.

  // 5. Remove current_plan_id column
  console.log('Dropping column communities.current_plan_id...');
  pgm.dropColumn('communities', 'current_plan_id');

  // 7. & 6. No explicit down for INSERT/UPDATE needed as tables are dropped

  // 4. Drop usage_events table and its index
  console.log('Dropping usage_events table...');
  // If raw SQL was used for index creation:
  // pgm.sql('DROP INDEX IF EXISTS idx_usage_events_community_feature_time;');
  pgm.dropIndex('usage_events', ['community_id', 'feature', 'occurred_at'], {
    name: 'idx_usage_events_community_feature_time',
  });
  pgm.dropTable('usage_events');

  // 3. Drop plan_limits table
  console.log('Dropping plan_limits table...');
  pgm.dropConstraint('plan_limits', 'plan_limits_pkey'); // Drop constraint first if named
  pgm.dropTable('plan_limits');

  // 2. Drop plans table
  console.log('Dropping plans table...');
  pgm.dropTable('plans'); // Cascading delete should handle plan_limits FK

  // 1. Drop ENUM feature_enum
  console.log('Dropping feature_enum type...');
  pgm.dropType('feature_enum');

  console.log('Migration create_quota_tables reverted successfully.');
}; 