exports.shorthands = {
  // Add any shorthands if needed, e.g., for UUID generation if not using pgm.func
};

exports.up = async (pgm) => {
  console.log("Starting sidequest refactor migration (no data preservation)...");

  // --- Step 1: Drop the old `sidequests` table --- 
  // Since no data needs to be preserved, we can drop it directly.
  console.log("Dropping existing 'sidequests' table (if it exists)...");
  await pgm.dropTable('sidequests', { ifExists: true });
  console.log("Old 'sidequests' table dropped.");

  // --- Step 2: Create the new `sidequests` table (global library) ---
  console.log("Creating new 'sidequests' (global library) table...");
  await pgm.createTable('sidequests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    title: { type: 'text', notNull: true },
    description: { type: 'text', notNull: false },
    image_url: { type: 'text', notNull: false },
    sidequest_type: {
      type: 'text',
      notNull: true,
      check: "sidequest_type IN ('youtube', 'link', 'markdown')",
    },
    content_payload: { type: 'text', notNull: true },
    creator_user_id: { type: 'text', notNull: true }, // Will be set by the application on creation
    community_id: {
      type: 'text',
      notNull: true,
      references: 'communities(id)',
      onDelete: 'CASCADE',
    },
    is_public: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  console.log("New 'sidequests' table created.");
  console.log("Creating indexes for new 'sidequests' table...");
  await pgm.createIndex('sidequests', 'community_id');
  await pgm.createIndex('sidequests', ['community_id', 'creator_user_id']);
  await pgm.createIndex('sidequests', ['community_id', 'is_public']);
  console.log("Indexes for new 'sidequests' table created.");

  // --- Step 3: Create the `onboarding_step_sidequests` junction table ---
  console.log("Creating 'onboarding_step_sidequests' junction table...");
  await pgm.createTable('onboarding_step_sidequests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    onboarding_step_id: {
      type: 'uuid',
      notNull: true,
      references: 'onboarding_steps(id)',
      onDelete: 'CASCADE',
    },
    sidequest_id: {
      type: 'uuid',
      notNull: true,
      references: 'sidequests(id)', // References the NEW sidequests table
      onDelete: 'CASCADE',
    },
    display_order: { type: 'integer', notNull: true, default: 0 },
    attached_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  console.log("'onboarding_step_sidequests' junction table created.");
  console.log("Creating indexes and constraints for junction table...");
  await pgm.createIndex('onboarding_step_sidequests', 'onboarding_step_id');
  await pgm.createIndex('onboarding_step_sidequests', 'sidequest_id');
  await pgm.addConstraint('onboarding_step_sidequests', 'uniq_step_sidequest_order', {
    unique: ['onboarding_step_id', 'display_order'],
  });
  await pgm.addConstraint('onboarding_step_sidequests', 'uniq_step_sidequest_link', {
    unique: ['onboarding_step_id', 'sidequest_id'],
  });
  console.log("Indexes and constraints for junction table created.");
  console.log("Sidequest refactor migration UP script finished (no data preservation path).");
};

exports.down = async (pgm) => {
  console.log("Starting sidequest refactor DOWN migration (no data preservation path)...");
  
  console.log("Dropping 'onboarding_step_sidequests' junction table...");
  await pgm.dropTable('onboarding_step_sidequests', { ifExists: true });
  
  console.log("Dropping new 'sidequests' (global library) table...");
  await pgm.dropTable('sidequests', { ifExists: true });
  
  // Recreate the original, simpler sidequests table if it was dropped in UP.
  // This structure matches your original schema snippet.
  console.log("Re-creating the original structure of 'sidequests' table...");
  await pgm.createTable('sidequests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    onboarding_step_id: { type: 'uuid', notNull: true, references: 'onboarding_steps', onDelete: 'CASCADE'},
    title: { type: 'text', notNull: true },
    description: { type: 'text' }, 
    image_url: { type: 'text' }, 
    sidequest_type: {
      type: 'text',
      notNull: true,
      check: "sidequest_type IN ('youtube', 'link', 'markdown')",
    },
    content_payload: { type: 'text', notNull: true },
    display_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  await pgm.createIndex('sidequests', 'onboarding_step_id');
  await pgm.addConstraint('sidequests', 'sidequests_onboarding_step_id_display_order_unique_index', {
    unique: ['onboarding_step_id', 'display_order'],
  });
  console.log("Original 'sidequests' table structure re-created.");
  console.log("Sidequest refactor DOWN migration finished.");
}; 