exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('community_api_keys', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    community_id: { type: 'text', notNull: true, references: 'communities', onDelete: 'CASCADE' },
    token_hash: { type: 'text', notNull: true, unique: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('community_api_keys', 'community_id');
};

exports.down = (pgm) => {
  pgm.dropTable('community_api_keys');
};
