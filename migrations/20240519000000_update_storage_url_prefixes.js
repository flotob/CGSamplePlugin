/* eslint-disable @typescript-eslint/naming-convention */

// IMPORTANT: Replace these placeholder values with your actual old and new URL prefixes.
const OLD_URL_PREFIX_PLACEHOLDER = 'https://bucket-production-b5a4.up.railway.app/user-images/';
const NEW_URL_PREFIX_PLACEHOLDER = 'https://assets.commonground.cg/user-images/';

exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.up = async (pgm) => {
  console.log("Updating storage_url in 'generated_images' table...");
  await pgm.sql(`
    UPDATE "public"."generated_images"
    SET "storage_url" = REPLACE("storage_url", '${OLD_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}', '${NEW_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}')
    WHERE "storage_url" LIKE '${OLD_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}%';
  `);
  console.log("Finished updating 'generated_images'.");

  console.log("Updating config.presentation.backgroundValue in 'onboarding_steps' table...");
  await pgm.sql(`
    UPDATE "public"."onboarding_steps"
    SET "config" = jsonb_set(
        "config",
        '{presentation,backgroundValue}',
        to_jsonb(REPLACE("config" -> 'presentation' ->> 'backgroundValue', '${OLD_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}', '${NEW_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}')),
        true
    )
    WHERE "config" -> 'presentation' ->> 'backgroundValue' LIKE '${OLD_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}%';
  `);
  console.log("Finished updating 'onboarding_steps'.");
};

/**
 * @param {import("node-pg-migrate/dist/types").MigrationBuilder} pgm
 */
exports.down = async (pgm) => {
  console.log("Reverting storage_url in 'generated_images' table...");
  await pgm.sql(`
    UPDATE "public"."generated_images"
    SET "storage_url" = REPLACE("storage_url", '${NEW_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}', '${OLD_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}')
    WHERE "storage_url" LIKE '${NEW_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}%';
  `);
  console.log("Finished reverting 'generated_images'.");

  console.log("Reverting config.presentation.backgroundValue in 'onboarding_steps' table...");
  await pgm.sql(`
    UPDATE "public"."onboarding_steps"
    SET "config" = jsonb_set(
        "config",
        '{presentation,backgroundValue}',
        to_jsonb(REPLACE("config" -> 'presentation' ->> 'backgroundValue', '${NEW_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}', '${OLD_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}')),
        true
    )
    WHERE "config" -> 'presentation' ->> 'backgroundValue' LIKE '${NEW_URL_PREFIX_PLACEHOLDER.replace(/'/g, '\'\'')}%';
  `);
  console.log("Finished reverting 'onboarding_steps'.");
}; 