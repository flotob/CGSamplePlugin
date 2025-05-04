/* eslint-disable @typescript-eslint/naming-convention */

exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.addColumn('onboarding_wizards', {
    required_role_id: {
      type: 'text', // Assuming role IDs are text
      notNull: false, // Make the column optional
      default: null,
      // If there was a central 'roles' table, we could add a foreign key here:
      // references: 'roles', 
      // onDelete: 'SET NULL' // Or cascade, restrict, etc.
    }
  });

  // Optional: Add an index if we expect to query frequently based on required_role_id
  // pgm.createIndex('onboarding_wizards', 'required_role_id');
};

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  // pgm.dropIndex('onboarding_wizards', 'required_role_id'); // Drop index if created
  pgm.dropColumn('onboarding_wizards', 'required_role_id');
}; 