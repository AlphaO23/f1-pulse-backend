/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('events', (table) => {
    table.string('image_url', 2000).nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('events', (table) => {
    table.dropColumn('image_url');
  });
};
