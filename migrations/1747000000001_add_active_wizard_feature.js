/* eslint-disable @typescript-eslint/naming-convention */
exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  console.log(
    "Ensuring 'active_wizard' value exists in feature_enum type (using IF NOT EXISTS)..."
  );
  // Use raw SQL with IF NOT EXISTS for idempotency
  pgm.sql("ALTER TYPE feature_enum ADD VALUE IF NOT EXISTS 'active_wizard';");
  console.log("'active_wizard' value ensured in feature_enum.");
};

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  // PostgreSQL does not support removing enum values directly or easily.
  // Attempting to remove 'active_wizard' would require complex checks
  // to ensure the value is not in use in plan_limits or usage_events,
  // potentially followed by recreating the enum, which is risky.
  // Therefore, this down migration is intentionally left empty.
  // If absolutely necessary, manual intervention or a more complex data migration
  // strategy would be required.
  console.warn(
    "'Down' migration for adding 'active_wizard' to feature_enum is not supported."
  );
  // To make the migration reversible in theory (but DANGEROUS if value used):
  // pgm.sql("ALTER TYPE feature_enum RENAME VALUE 'active_wizard' TO '_obsolete_active_wizard'");
  // Or potentially try to delete rows using the value first, then remove.
}; 