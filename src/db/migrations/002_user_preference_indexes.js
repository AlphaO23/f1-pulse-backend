/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.index('alert_sensitivity');
    table.index('favorite_team');
    table.index('favorite_driver');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex('alert_sensitivity');
    table.dropIndex('favorite_team');
    table.dropIndex('favorite_driver');
  });
};
