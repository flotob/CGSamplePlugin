// migrations/1746218456789_create_user_wizard_sessions.js

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('user_wizard_sessions', {
    // --- Columns ---
    user_id: { 
      type: 'text', 
      notNull: true 
      // No explicit FK as user IDs might come from external system/auth provider
    },
    wizard_id: {
      type: 'uuid',
      notNull: true,
      references: '"onboarding_wizards"', // Ensure table name is quoted if needed by pg-migrate
      onDelete: 'CASCADE', // If a wizard is deleted, session state for it is irrelevant
    },
    last_viewed_step_id: {
      type: 'uuid',
      notNull: true,
      references: '"onboarding_steps"', // Ensure table name is quoted
      onDelete: 'CASCADE', // If a step is deleted, the session state pointing to it becomes invalid
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'), // Automatically set timestamp on creation/update via UPSERT logic
    },
  });

  // --- Constraints ---
  // Composite Primary Key to ensure only one session record per user per wizard
  pgm.addConstraint('user_wizard_sessions', 'user_wizard_sessions_pkey', {
    primaryKey: ['user_id', 'wizard_id'],
  });

  // --- Indexes ---
  // Index for potential lookups by user_id (though PK covers user_id + wizard_id)
  pgm.createIndex('user_wizard_sessions', 'user_id'); 
  // Index for FK relationship (often created automatically, but explicit doesn't hurt)
  pgm.createIndex('user_wizard_sessions', 'wizard_id'); 
  pgm.createIndex('user_wizard_sessions', 'last_viewed_step_id'); 
};

exports.down = pgm => {
  // Drop the table - constraints and indexes associated with it are dropped automatically
  pgm.dropTable('user_wizard_sessions');
}; 