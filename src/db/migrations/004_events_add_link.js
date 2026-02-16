/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('events', (table) => {
    table.string('link', 1000).after('source');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('events', (table) => {
    table.dropColumn('link');
  });
};
