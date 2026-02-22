const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// ---------------------------------------------------------------------------
// Relevance scoring — computed in SQL for efficient sorting
// ---------------------------------------------------------------------------
const CATEGORY_SCORE = `
  CASE category
    WHEN 'Race Result'        THEN 50
    WHEN 'Penalty'            THEN 45
    WHEN 'Driver Transfer'    THEN 40
    WHEN 'Contract News'      THEN 35
    WHEN 'Qualifying'         THEN 30
    WHEN 'Technical Update'   THEN 25
    WHEN 'Official Statement' THEN 20
    WHEN 'Team News'          THEN 20
    WHEN 'Practice & Testing' THEN 15
    ELSE 10
  END`;

const RECENCY_SCORE = `
  CASE
    WHEN timestamp > NOW() - INTERVAL '6 hours'  THEN 40
    WHEN timestamp > NOW() - INTERVAL '24 hours' THEN 25
    WHEN timestamp > NOW() - INTERVAL '3 days'   THEN 10
    ELSE 0
  END`;

const DRIVER_TEAM_SCORE = `
  CASE WHEN LOWER(title) ~ '(verstappen|hamilton|leclerc|norris|red bull|ferrari|mercedes|mclaren)' THEN 15 ELSE 0 END`;

const RELEVANCE_SQL = `(${CATEGORY_SCORE} + ${RECENCY_SCORE} + ${DRIVER_TEAM_SCORE})`;

// ---------------------------------------------------------------------------
// Diversify: reorder so no more than 2 consecutive same-category articles
// ---------------------------------------------------------------------------
function diversify(events, maxConsecutive = 2) {
  if (events.length <= maxConsecutive) return events;

  const result = [];
  const remaining = [...events];

  while (remaining.length > 0) {
    // Count consecutive same-category at tail of result
    let streak = 0;
    let lastCat = null;
    if (result.length > 0) {
      lastCat = result[result.length - 1].category;
      for (let i = result.length - 1; i >= 0 && result[i].category === lastCat; i--) {
        streak++;
      }
    }

    if (streak >= maxConsecutive) {
      // Find the first item in remaining that has a different category
      const diffIdx = remaining.findIndex((e) => e.category !== lastCat);
      if (diffIdx >= 0) {
        result.push(remaining.splice(diffIdx, 1)[0]);
      } else {
        // All remaining are same category — just append
        result.push(remaining.shift());
      }
    } else {
      result.push(remaining.shift());
    }
  }

  return result;
}

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

    // Fetch extra rows so diversification has enough to swap with
    const fetchLimit = category ? limitNum : Math.min(limitNum * 3, 60);

    let query = baseFilters(db('events'))
      .select('id', 'title', 'category', 'timestamp', 'source', 'summary', 'link', 'image_url')
      .orderByRaw(`${RELEVANCE_SQL} DESC, timestamp DESC`)
      .limit(fetchLimit)
      .offset(offset);

    let countQuery = baseFilters(db('events')).count('id as total');

    const [rawEvents, [{ total }]] = await Promise.all([query, countQuery]);

    // Diversify only when not filtering by a single category
    const events = category ? rawEvents : diversify(rawEvents).slice(0, limitNum);

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
