/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  // Add password_hash to users (nullable so existing users aren't broken)
  await knex.schema.alterTable('users', (table) => {
    table.string('password_hash', 255);
    table.boolean('onboarded').notNullable().defaultTo(false);
  });

  // Refresh tokens table
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 500).notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('token');
    table.index('user_id');
    table.index('expires_at');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('onboarded');
    table.dropColumn('password_hash');
  });
};
