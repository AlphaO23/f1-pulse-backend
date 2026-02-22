const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// Fixed display order for category tabs
const CATEGORY_ORDER = [
  'Race Result',
  'Penalty',
  'Driver Transfer',
  'Contract News',
  'Technical Update',
  'Team News',
  'Practice & Testing',
  'Qualifying',
  'Official Statement',
  'Interesting',
];

// GET /api/categories — list all categories with event counts, ordered by relevance
router.get('/', async (req, res, next) => {
  try {
    const rows = await db('events')
      .select('category')
      .count('id as count')
      .whereNotNull('image_url')
      .where('image_url', '!=', '')
      .whereNotNull('link')
      .where('link', '!=', '')
      .groupBy('category')
      .orderBy('count', 'desc');

    const countMap = {};
    for (const row of rows) {
      countMap[row.category] = parseInt(row.count, 10);
    }

    // Return categories in fixed relevance order, only those with events
    const categories = CATEGORY_ORDER
      .filter((name) => countMap[name])
      .map((name) => ({ name, count: countMap[name] }));

    // Append any categories not in the fixed list (future-proofing)
    for (const row of rows) {
      if (!CATEGORY_ORDER.includes(row.category)) {
        categories.push({ name: row.category, count: parseInt(row.count, 10) });
      }
    }

    res.json(categories);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
