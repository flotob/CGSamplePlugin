/* eslint-disable @typescript-eslint/naming-convention */
exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = async (pgm) => {
  console.log('Applying migration: set_stripe_price_ids...');

  // IMPORTANT: Replace 'price_placeholder_replace_me' with your actual Stripe Price ID 
  //            for the Pro plan (use the TEST Price ID for development/staging).
  const proPlanStripePriceId = 'price_1RL3KdLyBwPLzTInBmRdiIS8'; 
  
  if (proPlanStripePriceId === 'price_placeholder_replace_me') {
      console.warn('Placeholder Stripe Price ID found. Skipping update for \'pro\' plan.');
      console.warn('Please replace the placeholder in migrations/1747000000003_set_stripe_price_ids.js and re-run migrations.');
  } else {
      console.log(`Updating plans table to set stripe_price_id for 'pro' plan to: ${proPlanStripePriceId}`);
      const escapedPriceId = proPlanStripePriceId.replace(/'/g, "''"); // Escape single quotes
      await pgm.sql(`
        UPDATE plans
        SET stripe_price_id = '${escapedPriceId}'
        WHERE code = 'pro';
      `);
  }

  // Add updates for other plans here if needed in the future

  console.log('Migration set_stripe_price_ids applied (or skipped if placeholder was present).');
};

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = async (pgm) => {
  console.log('Reverting migration: set_stripe_price_ids...');

  console.log("Setting stripe_price_id back to NULL for 'pro' plan...");
  // This query doesn't use parameters, so it should be fine as is.
  await pgm.sql(`
    UPDATE plans
    SET stripe_price_id = NULL
    WHERE code = 'pro';
  `);

  console.log('Migration set_stripe_price_ids reverted successfully.');
}; 