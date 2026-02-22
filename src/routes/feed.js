const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// ---------------------------------------------------------------------------
// Relevance scoring — computed in SQL for efficient sorting
// ---------------------------------------------------------------------------
// Category importance (higher = more important)
const CATEGORY_SCORE = `
  CASE category
    WHEN 'Race Result'        THEN 50
    WHEN 'Penalty'            THEN 45
    WHEN 'Driver Transfer'    THEN 40
    WHEN 'Contract News'      THEN 35
    WHEN 'Technical Update'   THEN 25
    WHEN 'Practice & Testing' THEN 15
    WHEN 'Qualifying'         THEN 30
    WHEN 'Official Statement' THEN 20
    WHEN 'Team News'          THEN 20
    ELSE 10
  END`;

// Recency boost: last 6h = +40, last 24h = +25, last 3d = +10
const RECENCY_SCORE = `
  CASE
    WHEN timestamp > NOW() - INTERVAL '6 hours'  THEN 40
    WHEN timestamp > NOW() - INTERVAL '24 hours' THEN 25
    WHEN timestamp > NOW() - INTERVAL '3 days'   THEN 10
    ELSE 0
  END`;

// Top driver/team mentions in title boost
const DRIVER_TEAM_SCORE = `
  CASE WHEN LOWER(title) ~ '(verstappen|hamilton|leclerc|norris|red bull|ferrari|mercedes|mclaren)' THEN 15 ELSE 0 END`;

const RELEVANCE_SQL = `(${CATEGORY_SCORE} + ${RECENCY_SCORE} + ${DRIVER_TEAM_SCORE})`;

// GET /api/feed — paginated, filterable event feed sorted by relevance
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      date_from,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const baseFilters = (q) => {
      q = q
        .whereNotNull('image_url')
        .where('image_url', '!=', '')
        .whereNotNull('link')
        .where('link', '!=', '');
      if (category) q = q.where('category', category);
      if (date_from) q = q.where('timestamp', '>=', new Date(date_from));
      return q;
    };

    let query = baseFilters(db('events'))
      .select('id', 'title', 'category', 'timestamp', 'source', 'summary', 'link', 'image_url')
      .orderByRaw(`${RELEVANCE_SQL} DESC, timestamp DESC`)
      .limit(limitNum)
      .offset(offset);

    let countQuery = baseFilters(db('events')).count('id as total');

    const [events, [{ total }]] = await Promise.all([query, countQuery]);

    const totalNum = parseInt(total, 10);

    res.json({
      data: events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        totalPages: Math.ceil(totalNum / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
