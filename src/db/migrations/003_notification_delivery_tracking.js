/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('notifications', (table) => {
    table.string('delivery_status', 20).notNullable().defaultTo('sent');
    table.text('failure_reason');
    // Composite index for rate-limit lookups: "count notifications for user X in last hour"
    table.index(['user_id', 'sent_at']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('notifications', (table) => {
    table.dropIndex(['user_id', 'sent_at']);
    table.dropColumn('failure_reason');
    table.dropColumn('delivery_status');
  });
};
