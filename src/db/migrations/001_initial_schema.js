/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('title', 500).notNullable();
    table.string('category', 100).notNullable();
    table.timestamp('timestamp', { useTz: true }).notNullable();
    table.string('source', 255).notNullable();
    table.text('summary');
    table.text('raw_content');
    table.timestamps(true, true);

    table.index('category');
    table.index('timestamp');
    table.index('source');
  });

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email', 255).notNullable().unique();
    table.string('favorite_team', 100);
    table.string('favorite_driver', 100);
    table.string('alert_sensitivity', 20).notNullable().defaultTo('medium');
    table.string('fcm_token', 500);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    table.timestamp('sent_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('opened_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('event_id');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('events');
};
