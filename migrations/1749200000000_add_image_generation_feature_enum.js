/* eslint-disable @typescript-eslint/naming-convention */

exports.shorthands = undefined;

/**
 * Adds 'image_generation' to the feature_enum type.
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.addTypeValue('feature_enum', 'image_generation');
};

/**
 * Note: Removing enum values in PostgreSQL is complex, especially if the value
 * might be in use. This down migration is intentionally left minimal.
 * Reverting might require manual checks and potentially data migration.
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  // pgm.sql("DELETE FROM pg_enum WHERE enumlabel = 'image_generation' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'feature_enum')");
  // ^^ This SQL would remove the value, but is dangerous if the value is used anywhere.
  // Leaving this commented out as the safest default.
  console.warn("Rolling back 'add_image_generation_feature_enum' migration is complex and not automatically handled. Manual intervention may be required if the 'image_generation' enum value needs to be removed.");
}; 