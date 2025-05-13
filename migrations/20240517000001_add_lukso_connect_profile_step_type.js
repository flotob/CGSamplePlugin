/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.sql(`
    INSERT INTO public.step_types (id, name, label, description, requires_credentials, updated_at, created_at)
    VALUES (gen_random_uuid(), 'lukso_connect_profile', 'Connect LUKSO Profile', 'Allows users to connect their LUKSO Universal Profile.', true, NOW(), NOW());
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  pgm.sql(`
    DELETE FROM public.step_types WHERE name = 'lukso_connect_profile';
  `);
};
