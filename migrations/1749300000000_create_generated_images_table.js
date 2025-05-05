/* eslint-disable @typescript-eslint/naming-convention */

exports.shorthands = undefined;

/**
 * Creates the generated_images table to store metadata about AI-generated images.
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('generated_images', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'text',
      notNull: true,
      // Note: No FK to a specific users table, storing the ID from JWT directly
    },
    community_id: {
      type: 'text',
      notNull: true,
      references: 'communities(id)',
      onDelete: 'CASCADE',
    },
    storage_url: {
      type: 'text',
      notNull: true,
      unique: true, // Ensure we don't store the same image URL twice
    },
    prompt_structured: {
      type: 'jsonb',
      notNull: true,
    },
    is_public: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Index for fetching user's images efficiently
  pgm.createIndex('generated_images', ['user_id', 'created_at'], {
    name: 'idx_generated_images_user_created',
    // Specify DESC order for created_at if needed, depends on query patterns
    // method: 'BTREE', // Default
  });
  // Add DESC manually if `pgm.createIndex` doesn't support it directly in options
  pgm.sql('DROP INDEX IF EXISTS idx_generated_images_user_created;'); // Drop if exists from simple version
  pgm.sql('CREATE INDEX idx_generated_images_user_created ON generated_images (user_id, created_at DESC);');

  // Index for fetching public images within a community efficiently
  pgm.createIndex('generated_images', ['community_id', 'is_public', 'created_at'], {
    name: 'idx_generated_images_community_public',
    where: 'is_public = true',
  });
  // Add DESC manually if `pgm.createIndex` doesn't support it directly in options
  pgm.sql('DROP INDEX IF EXISTS idx_generated_images_community_public;'); // Drop if exists from simple version
  pgm.sql('CREATE INDEX idx_generated_images_community_public ON generated_images (community_id, is_public, created_at DESC) WHERE is_public = true;');

  console.log("Created generated_images table and indices.");
};

/**
 * Drops the generated_images table.
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable('generated_images');
  console.log("Dropped generated_images table.");
}; 