/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  // Adds 'LUKSO_UP' to the platform_enum type.
  pgm.sql("ALTER TYPE public.platform_enum ADD VALUE IF NOT EXISTS 'LUKSO_UP';");
  // Using IF NOT EXISTS for safety, though pgm.addTypeValue is often preferred with node-pg-migrate's JS API.
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  // Removing an ENUM value is complex and potentially destructive.
  // This down migration is intentionally a no-op for safety.
  // Manual database intervention would be required to safely remove 'LUKSO_UP'.
  // Consider what happens if data is using this enum value.
  // Example: You might need to update rows using 'LUKSO_UP' to 'OTHER' before attempting to remove the value.
  // pgm.sql("COMMENT ON COLUMN public.user_linked_credentials.platform IS 'Down migration for add_lukso_up_to_platform_enum: LUKSO_UP value was not automatically removed for safety.'");
  console.log("Down migration for '1747153103956_add-lukso-up-to-platform-enum.js': " +
              "Removing 'LUKSO_UP' from platform_enum requires manual DB intervention " +
              "to avoid data integrity issues if the value is in use. This migration does not perform the removal.");
};
