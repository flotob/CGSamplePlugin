exports.shorthands = undefined;

exports.up = async (pgm) => {
  pgm.sql(`
    INSERT INTO public.step_types (id, name, label, description, requires_credentials, updated_at, created_at)
    VALUES (
      gen_random_uuid(),
      'animated_text',
      'Animated Text',
      'Displays user-defined text with a drawing animation.',
      false,
      NOW(),
      NOW()
    );
  `);
};

exports.down = async (pgm) => {
  pgm.sql(`
    DELETE FROM public.step_types WHERE name = 'animated_text';
  `);
}; 