/* eslint-disable @typescript-eslint/naming-convention */
exports.shorthands = undefined;

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = async (pgm) => {
  pgm.sql(`
    INSERT INTO public.step_types (
      id, 
      name, 
      label, 
      description, 
      requires_credentials, 
      updated_at, 
      created_at
    )
    VALUES (
      gen_random_uuid(),
      'quizmaster_ai', 
      'AI Quizmaster',
      'An interactive quiz powered by AI, with dynamic questions and chat.',
      false, -- Set to true if an API key were managed per step, but usually global
      NOW(),
      NOW()
    );
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = async (pgm) => {
  pgm.sql(`
    DELETE FROM public.step_types WHERE name = 'quizmaster_ai';
  `);
}; 