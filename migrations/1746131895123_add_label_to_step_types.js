exports.shorthands = undefined;

exports.up = pgm => {
  // 1. Add the nullable label column
  pgm.addColumn('step_types', {
    label: { type: 'text', notNull: false } // Allow null initially
  });

  // 2. Populate the new label column with existing names as default
  //    Use COALESCE to handle potential null names if that's possible, though name is NOT NULL
  pgm.sql(`
    UPDATE step_types 
    SET label = COALESCE(name, 'Default Label') 
    WHERE label IS NULL; 
  `);

  // Optional: If you want the label to be NOT NULL eventually, 
  // you could add a separate migration later after ensuring all labels are set,
  // or add the NOT NULL constraint here if confident about the initial population.
  // For now, leaving it nullable is safer.
  // pgm.alterColumn('step_types', 'label', { notNull: true });
};

exports.down = pgm => {
  // Drop the label column
  pgm.dropColumn('step_types', 'label');
}; 