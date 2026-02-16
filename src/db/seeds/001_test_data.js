const bcrypt = require('bcrypt');

/**
 * Seed the database with sample data for development / QA.
 *
 * Run with:  npx knex seed:run
 * Idempotent: clears seeded rows before inserting.
 *
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  // Clean tables in FK-safe order
  await knex('notifications').del();
  await knex('refresh_tokens').del();
  await knex('events').del();
  await knex('users').del();

  // -------------------------------------------------------------------
  // Users — three profiles with different alert sensitivities
  // -------------------------------------------------------------------
  const passwordHash = await bcrypt.hash('testpassword123', 10);

  const [userAll] = await knex('users')
    .insert({
      email: 'max.fan@example.com',
      favorite_team: 'Red Bull Racing',
      favorite_driver: 'Max Verstappen',
      alert_sensitivity: 'all',
      fcm_token: 'test-fcm-token-all-alerts',
      password_hash: passwordHash,
      onboarded: true,
    })
    .returning('*');

  const [userBreaking] = await knex('users')
    .insert({
      email: 'lewis.fan@example.com',
      favorite_team: 'Ferrari',
      favorite_driver: 'Lewis Hamilton',
      alert_sensitivity: 'breaking',
      fcm_token: 'test-fcm-token-breaking-only',
      password_hash: passwordHash,
      onboarded: true,
    })
    .returning('*');

  const [userNoToken] = await knex('users')
    .insert({
      email: 'casual@example.com',
      favorite_team: 'McLaren',
      favorite_driver: 'Lando Norris',
      alert_sensitivity: 'all',
      fcm_token: null,
      password_hash: passwordHash,
      onboarded: false,
    })
    .returning('*');

  // -------------------------------------------------------------------
  // Events — one of each category
  // -------------------------------------------------------------------
  const now = new Date();
  const ago = (minutes) => new Date(now.getTime() - minutes * 60 * 1000);

  const events = await knex('events')
    .insert([
      {
        title: 'Verstappen wins the 2025 Monaco Grand Prix',
        category: 'Race Result',
        timestamp: ago(120),
        source: 'Formula 1',
        link: 'https://www.formula1.com/en/latest/article.html',
        summary: 'Max Verstappen crossed the line first in a dramatic Monaco GP.',
        raw_content: 'Max Verstappen crossed the line first in a dramatic Monaco Grand Prix, his fifth victory of the season.',
      },
      {
        title: 'Hamilton given 5-second time penalty for track limits',
        category: 'Penalty',
        timestamp: ago(90),
        source: 'FIA',
        link: 'https://www.fia.com/document/penalty-hamilton',
        summary: 'Stewards penalized Hamilton for repeated track-limit violations at turn 4.',
        raw_content: 'The stewards investigated car 44 for repeated track-limit infringements and handed down a 5-second time penalty.',
      },
      {
        title: 'Sainz signs with Williams for 2026 season',
        category: 'Driver Transfer',
        timestamp: ago(60),
        source: 'Autosport',
        link: 'https://www.autosport.com/f1/news/sainz-williams',
        summary: 'Carlos Sainz has signed a multi-year deal with Williams Racing.',
        raw_content: 'Carlos Sainz has confirmed his move to Williams Racing on a multi-year contract starting from 2026.',
      },
      {
        title: 'Red Bull extends Verstappen with multi-year contract renewal',
        category: 'Contract News',
        timestamp: ago(45),
        source: 'Motorsport.com',
        link: 'https://www.motorsport.com/f1/news/verstappen-extension',
        summary: 'Red Bull Racing have locked in Max Verstappen until 2030.',
        raw_content: 'Red Bull Racing announced a multi-year contract extension with Max Verstappen through the 2030 season.',
      },
      {
        title: 'McLaren reveals major aerodynamic upgrade package',
        category: 'Technical Update',
        timestamp: ago(30),
        source: 'The Race',
        link: 'https://the-race.com/f1/mclaren-upgrade',
        summary: 'McLaren brings a comprehensive upgrade including new floor and sidepod design.',
        raw_content: 'McLaren has unveiled a significant aerodynamic upgrade package featuring redesigned sidepods, a new floor, and revised rear wing.',
      },
      {
        title: 'FIA announces clarification on 2025 floor regulations',
        category: 'Official Statement',
        timestamp: ago(15),
        source: 'FIA',
        link: 'https://www.fia.com/regulation-clarification-2025',
        summary: 'The FIA has issued a technical directive clarifying floor flexibility tests.',
        raw_content: 'The FIA issued a new technical directive clarifying the interpretation of floor flexibility testing procedures for the 2025 season.',
      },
    ])
    .returning('*');

  // -------------------------------------------------------------------
  // Notifications — simulate some delivery history
  // -------------------------------------------------------------------
  const raceResultEvent = events.find((e) => e.category === 'Race Result');
  const penaltyEvent = events.find((e) => e.category === 'Penalty');
  const techEvent = events.find((e) => e.category === 'Technical Update');

  await knex('notifications').insert([
    {
      user_id: userAll.id,
      event_id: raceResultEvent.id,
      delivery_status: 'sent',
    },
    {
      user_id: userBreaking.id,
      event_id: raceResultEvent.id,
      delivery_status: 'sent',
    },
    {
      user_id: userAll.id,
      event_id: penaltyEvent.id,
      delivery_status: 'sent',
    },
    {
      user_id: userBreaking.id,
      event_id: penaltyEvent.id,
      delivery_status: 'sent',
    },
    {
      user_id: userAll.id,
      event_id: techEvent.id,
      delivery_status: 'sent',
    },
    {
      user_id: userAll.id,
      event_id: techEvent.id,
      delivery_status: 'failed',
      failure_reason: 'simulated_test_failure',
    },
  ]);

  console.log('Seed complete:');
  console.log(`  Users:         ${3}`);
  console.log(`  Events:        ${events.length}`);
  console.log(`  Notifications: ${6}`);
};
