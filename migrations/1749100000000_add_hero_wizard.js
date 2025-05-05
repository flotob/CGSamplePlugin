/* eslint-disable @typescript-eslint/naming-convention */

exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  // 1. Add the is_hero column
  pgm.addColumn('onboarding_wizards', {
    is_hero: {
      type: 'boolean',
      notNull: true,
      default: false, 
    }
  });

  // 2. Add the partial unique index to enforce only one hero per community
  pgm.createIndex(
    'onboarding_wizards',
    ['community_id', 'is_hero'], 
    {
      unique: true,
      name: 'only_one_hero_wizard_per_community', // Explicit index name
      where: 'is_hero = true' // The partial condition
    }
  );
};

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  // Drop the index first
  pgm.dropIndex('onboarding_wizards', ['community_id', 'is_hero'], { name: 'only_one_hero_wizard_per_community' });
  
  // Then drop the column
  pgm.dropColumn('onboarding_wizards', 'is_hero');
}; 