/* eslint-disable @typescript-eslint/naming-convention */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumn('communities', {
        logo_url: { type: 'text', notNull: false } // Allows NULL
    });
};

exports.down = pgm => {
    pgm.dropColumn('communities', 'logo_url');
}; 