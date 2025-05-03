exports.shorthands = undefined;

exports.up = pgm => {
  // Drop the existing constraint
  pgm.sql(`
    ALTER TABLE public.onboarding_steps 
    DROP CONSTRAINT IF EXISTS uniq_step_order_per_wizard;
  `);

  // Add the constraint back as deferrable
  pgm.sql(`
    ALTER TABLE public.onboarding_steps 
    ADD CONSTRAINT uniq_step_order_per_wizard 
    UNIQUE (wizard_id, step_order) 
    DEFERRABLE INITIALLY DEFERRED;
  `);
};

exports.down = pgm => {
  // Drop the deferrable constraint
  pgm.sql(`
    ALTER TABLE public.onboarding_steps 
    DROP CONSTRAINT IF EXISTS uniq_step_order_per_wizard;
  `);

  // Add the original non-deferrable constraint back
  // Note: Ensure this matches the original definition if it wasn't exactly like this
  pgm.sql(`
    ALTER TABLE public.onboarding_steps 
    ADD CONSTRAINT uniq_step_order_per_wizard 
    UNIQUE (wizard_id, step_order);
  `);
}; 