/* eslint-disable @typescript-eslint/naming-convention */
exports.shorthands = undefined;

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = async (pgm) => {
  pgm.sql(`
    -- For Plan ID 1 (Free Plan) - 20 AI Chat Messages per day
    INSERT INTO public.plan_limits (plan_id, feature, time_window, hard_limit)
    VALUES (1, 'ai_chat_message', '1 day'::interval, 20)
    ON CONFLICT (plan_id, feature, time_window) DO UPDATE 
    SET hard_limit = EXCLUDED.hard_limit, time_window = EXCLUDED.time_window;
  `);

  pgm.sql(`
    -- For Plan ID 2 (Pro Plan) - 200 AI Chat Messages per day
    INSERT INTO public.plan_limits (plan_id, feature, time_window, hard_limit)
    VALUES (2, 'ai_chat_message', '1 day'::interval, 200)
    ON CONFLICT (plan_id, feature, time_window) DO UPDATE 
    SET hard_limit = EXCLUDED.hard_limit, time_window = EXCLUDED.time_window;
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = async (pgm) => {
  pgm.sql(`
    DELETE FROM public.plan_limits 
    WHERE feature = 'ai_chat_message' 
      AND plan_id IN (1, 2) 
      AND time_window = '1 day'::interval;
  `);
}; 