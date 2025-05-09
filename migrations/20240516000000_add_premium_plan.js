exports.shorthands = undefined;

exports.up = async (pgm) => {
  // Plan Details:
  // - Plan ID: 3
  // - Plan Code: 'premium'
  // - Plan Name: 'Premium Tier'
  // - Price (cents): 2500
  // - Stripe Price ID: 'price_1RMx4LQ6xikS4G1HjX0CN9A2'
  //
  // Limits:
  //   - Active Wizards: 25
  //   - Image Generations: 500 per '30 days'
  //   - AI Chat Messages: 1000 per '1 day'

  // Production vs. Env - This should really not be in the DB but in an env variable
  // const premiumPlanStripePriceId = 'price_1RMx1QLyBwPLzTIn4Y7Tw4r8'; // Production
  const premiumPlanStripePriceId = 'price_1RMx4LQ6xikS4G1HjX0CN9A2';

  // Insert the new Premium Plan
  // Assuming plan ID 3 is the next available ID.
  await pgm.db.query(
    `INSERT INTO plans (id, code, name, price_cents, stripe_price_id, is_active)
     VALUES (3, 'premium', 'Premium Tier', 2500, $1, true)
     ON CONFLICT (id) DO NOTHING;`,
    [premiumPlanStripePriceId]
  );

  // Insert limits for the Premium Plan (plan_id = 3)
  const planLimits = [
    { plan_id: 3, feature: 'active_wizard',    time_window: '0 hours', hard_limit: 25 },
    { plan_id: 3, feature: 'image_generation', time_window: '30 days', hard_limit: 500 },
    { plan_id: 3, feature: 'ai_chat_message',  time_window: '1 day',   hard_limit: 1000 },
  ];

  for (const limit of planLimits) {
    await pgm.db.query(
      `INSERT INTO plan_limits (plan_id, feature, time_window, hard_limit)
       VALUES ($1, $2, $3::interval, $4)
       ON CONFLICT (plan_id, feature, time_window) DO NOTHING;`,
      [limit.plan_id, limit.feature, limit.time_window, limit.hard_limit]
    );
  }
};

exports.down = async (pgm) => {
  // Remove Premium Plan limits
  await pgm.db.query(`DELETE FROM plan_limits WHERE plan_id = 3;`);

  // Remove the Premium Plan itself
  await pgm.db.query(`DELETE FROM plans WHERE code = 'premium' AND id = 3;`);
}; 