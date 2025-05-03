// migrations/1746220123456_create_user_profiles.js

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('user_profiles', {
    user_id: { 
      type: 'text', 
      notNull: true,
      primaryKey: true // Set user_id as the primary key directly
    },
    username: {
      type: 'text',
      notNull: false // Allow null
    },
    profile_picture_url: {
      type: 'text',
      notNull: false // Allow null
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    }
    // No separate created_at needed if updated_at handles initial creation via default
  });

  // Optional: Index on username if frequent lookups by username are expected
  // pgm.createIndex('user_profiles', 'username'); 
};

exports.down = pgm => {
  pgm.dropTable('user_profiles');
}; 