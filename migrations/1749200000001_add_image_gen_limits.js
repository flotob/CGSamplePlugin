/* eslint-disable @typescript-eslint/naming-convention */

exports.shorthands = undefined;

/**
 * Adds default limits for the 'image_generation' feature to existing plans.
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = async (pgm) => {
  // Use db.query for potentially cleaner async handling if needed, or raw SQL
  console.log("Adding default image generation limits...");

  // Add limit for Free plan (ID 1)
  await pgm.sql(`
    INSERT INTO plan_limits (plan_id, feature, time_window, hard_limit)
    VALUES (1, 'image_generation', '30 days'::interval, 5)
    ON CONFLICT (plan_id, feature, time_window) DO NOTHING;
  `);
  console.log("- Added limit for Free plan (ID 1).");

  // Add limit for Pro plan (ID 2)
  await pgm.sql(`
    INSERT INTO plan_limits (plan_id, feature, time_window, hard_limit)
    VALUES (2, 'image_generation', '30 days'::interval, 100)
    ON CONFLICT (plan_id, feature, time_window) DO NOTHING;
  `);
  console.log("- Added limit for Pro plan (ID 2).");
};

/**
 * Removes the default limits for the 'image_generation' feature.
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = async (pgm) => {
  console.log("Removing default image generation limits...");
  await pgm.sql(`
    DELETE FROM plan_limits 
    WHERE feature = 'image_generation' 
      AND time_window = '30 days'::interval 
      AND plan_id IN (1, 2);
  `);
  console.log("- Removed limits for Free (1) and Pro (2) plans.");
}; 