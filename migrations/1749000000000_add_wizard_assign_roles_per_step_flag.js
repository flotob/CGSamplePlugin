/* eslint-disable @typescript-eslint/naming-convention */

exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.addColumn('onboarding_wizards', {
    assign_roles_per_step: {
      type: 'boolean',
      notNull: true,
      default: false, 
    }
  });
};

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropColumn('onboarding_wizards', 'assign_roles_per_step');
}; 