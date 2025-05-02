/* eslint-disable @typescript-eslint/naming-convention */

exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  // Make the column nullable
  pgm.alterColumn('onboarding_steps', 'target_role_id', {
    allowNull: true,
  });
  // Set the default value to NULL (explicitly)
  pgm.alterColumn('onboarding_steps', 'target_role_id', {
    default: null,
  });
};

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
   // Remove the explicit NULL default (it becomes implicit when NOT NULL is added)
   pgm.alterColumn('onboarding_steps', 'target_role_id', {
     default: null, // Keep this to ensure it's null before setting NOT NULL if needed
   });
   // Add the NOT NULL constraint back
   // Note: This will fail if any rows have NULL in target_role_id
   pgm.alterColumn('onboarding_steps', 'target_role_id', {
     allowNull: false,
   });
}; 