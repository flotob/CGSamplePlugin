/* eslint-disable @typescript-eslint/naming-convention */
exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = async (pgm) => {
  console.log('Applying migration: add_stripe_customer_id_column...');

  // 1. Add stripe_customer_id to communities table
  console.log('Adding stripe_customer_id column to communities...');
  pgm.addColumn('communities', {
    stripe_customer_id: {
      type: 'text',
      unique: true, // Ensure one Stripe customer per community
      // Initially nullable, will be populated when a community subscribes
    },
  });

  console.log('Migration add_stripe_customer_id_column applied successfully.');
};

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = async (pgm) => {
  console.log('Reverting migration: add_stripe_customer_id_column...');

  // 1. Remove stripe_customer_id from communities table
  console.log('Dropping stripe_customer_id column from communities...');
  pgm.dropColumn('communities', 'stripe_customer_id');

  console.log('Migration add_stripe_customer_id_column reverted successfully.');
}; 