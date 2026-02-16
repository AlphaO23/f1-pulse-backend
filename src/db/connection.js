const knex = require('knex');
const config = require('../config');
const knexfile = require('../../knexfile');

const environment = config.nodeEnv;
const db = knex(knexfile[environment] || knexfile.development);

module.exports = db;
