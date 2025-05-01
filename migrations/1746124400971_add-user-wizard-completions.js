/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Create user_wizard_completions table
  pgm.createTable('user_wizard_completions', {
    user_id: { 
      type: 'text', 
      notNull: true 
    },
    wizard_id: {
      type: 'uuid',
      notNull: true,
      references: 'onboarding_wizards',
      onDelete: 'CASCADE'
    },
    completed_at: { 
      type: 'timestamptz', 
      notNull: true, 
      default: pgm.func('now()') 
    },
    version: { 
      type: 'integer', 
      notNull: true, 
      default: 1 
    }
  });

  // Add a primary key constraint
  pgm.addConstraint(
    'user_wizard_completions',
    'user_wizard_completions_pkey',
    { primaryKey: ['user_id', 'wizard_id'] }
  );

  // Add an index for faster lookups by user_id
  pgm.createIndex('user_wizard_completions', 'user_id');
  
  // Add an index for faster lookups by wizard_id
  pgm.createIndex('user_wizard_completions', 'wizard_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Drop the table and its constraints
  pgm.dropTable('user_wizard_completions');
};
