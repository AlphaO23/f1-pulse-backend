const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// GET /api/categories — list all categories with event counts
router.get('/', async (req, res, next) => {
  try {
    const rows = await db('events')
      .select('category')
      .count('id as count')
      .groupBy('category')
      .orderBy('count', 'desc');

    const categories = rows.map((row) => ({
      name: row.category,
      count: parseInt(row.count, 10),
    }));

    res.json(categories);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
