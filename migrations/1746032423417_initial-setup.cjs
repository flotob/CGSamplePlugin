/* eslint-disable @typescript-eslint/naming-convention */
// Using require for CommonJS compatibility
const { MigrationBuilder } = require('node-pg-migrate');

// Removed shorthands definition
// export const shorthands: ColumnDefinitions | undefined = { ... };

// Using module.exports for CommonJS compatibility
module.exports.up = async (pgm) => {
  // --- ENUM Types ---
  pgm.createType('platform_enum', ['DISCORD', 'TELEGRAM', 'ENS', 'OTHER']);

  // --- Tables ---

  // 1. communities table
  pgm.createTable('communities', {
    id: { type: 'text', primaryKey: true },
    title: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // 2. step_types table
  pgm.createTable('step_types', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true, unique: true },
    requires_credentials: { type: 'boolean', notNull: true, default: false },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Seed initial step types
  pgm.sql(`
    INSERT INTO step_types (name, requires_credentials, description) VALUES
    ('discord', true, 'Verify Discord server membership or roles'),
    ('telegram', true, 'Verify Telegram group membership'),
    ('guild', false, 'Verify Guild.xyz membership criteria'),
    ('ens', false, 'Verify ENS domain ownership or primary name'),
    ('efp', false, 'Verify following an Ethereum address via EFP'),
    ('gitcoin_passport', true, 'Verify Gitcoin Passport score or stamps');
  `);

  // 3. onboarding_wizards table
  pgm.createTable('onboarding_wizards', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    community_id: {
      type: 'text',
      notNull: true,
      references: 'communities',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('onboarding_wizards', 'uniq_wizard_name_per_community', {
    unique: ['community_id', 'name'],
  });
  pgm.createIndex('onboarding_wizards', 'community_id');

  // 4. onboarding_steps table
  pgm.createTable('onboarding_steps', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    wizard_id: {
      type: 'uuid',
      notNull: true,
      references: 'onboarding_wizards',
      onDelete: 'CASCADE',
    },
    step_type_id: {
      type: 'uuid',
      notNull: true,
      references: 'step_types',
      onDelete: 'RESTRICT',
    },
    step_order: { type: 'integer', notNull: true },
    config: { type: 'jsonb', notNull: true, default: '{}' },
    target_role_id: { type: 'text', notNull: true },
    is_mandatory: { type: 'boolean', notNull: true, default: true },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('onboarding_steps', 'uniq_step_order_per_wizard', {
    unique: ['wizard_id', 'step_order'],
  });
  pgm.createIndex('onboarding_steps', ['wizard_id', 'step_order']);

  // 5. user_wizard_progress table
  pgm.createTable('user_wizard_progress', {
    user_id: { type: 'text', notNull: true },
    wizard_id: {
      type: 'uuid',
      notNull: true,
      references: 'onboarding_wizards',
      onDelete: 'CASCADE',
    },
    step_id: {
      type: 'uuid',
      notNull: true,
      references: 'onboarding_steps',
      onDelete: 'CASCADE',
    },
    verified_data: { type: 'jsonb' },
    completed_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.addConstraint(
    'user_wizard_progress',
    'user_wizard_progress_pkey',
    { primaryKey: ['user_id', 'wizard_id', 'step_id'] }
  );
  pgm.createIndex('user_wizard_progress', ['user_id', 'wizard_id']);

  // 6. user_linked_credentials table
  pgm.createTable('user_linked_credentials', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'text', notNull: true },
    platform: { type: 'platform_enum', notNull: true },
    external_id: { type: 'text', notNull: true },
    username: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('user_linked_credentials', 'uniq_user_platform', {
    unique: ['user_id', 'platform'],
  });
  pgm.addConstraint('user_linked_credentials', 'uniq_platform_id', {
    unique: ['platform', 'external_id'],
  });
  pgm.createIndex('user_linked_credentials', 'user_id');
  pgm.createIndex('user_linked_credentials', ['platform', 'external_id']);
};

// Using module.exports for CommonJS compatibility
module.exports.down = async (pgm) => {
  // Drop tables in reverse order of creation due to dependencies
  pgm.dropTable('user_linked_credentials');
  pgm.dropTable('user_wizard_progress');
  pgm.dropTable('onboarding_steps');
  pgm.dropTable('onboarding_wizards');
  pgm.dropTable('step_types'); // Includes implicit drop of seed data
  pgm.dropTable('communities');

  // Drop ENUM types
  pgm.dropType('platform_enum');
};
