exports.shorthands = {};

exports.up = (pgm) => {
  pgm.createTable('sidequests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    onboarding_step_id: {
      type: 'uuid',
      notNull: true,
      // This will automatically create a foreign key constraint
      // named sidequests_onboarding_step_id_fkey to onboarding_steps(id)
      references: 'onboarding_steps',
      onDelete: 'CASCADE',
    },
    title: { type: 'text', notNull: true },
    description: { type: 'text' }, // Nullable
    image_url: { type: 'text' }, // Nullable
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

  // Index for faster lookups by onboarding_step_id
  pgm.createIndex('sidequests', 'onboarding_step_id');

  // Unique index to ensure display_order is unique per onboarding_step_id
  pgm.createIndex('sidequests', ['onboarding_step_id', 'display_order'], { unique: true });

  // Optional: Index for filtering by sidequest_type within a step if frequently needed
  // pgm.createIndex('sidequests', ['onboarding_step_id', 'sidequest_type']);
};

exports.down = (pgm) => {
  pgm.dropTable('sidequests');
}; 