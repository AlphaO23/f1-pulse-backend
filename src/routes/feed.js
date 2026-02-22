const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// GET /api/feed — paginated, filterable event feed for the mobile app
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

    let query = db('events')
      .select('id', 'title', 'category', 'timestamp', 'source', 'summary', 'link', 'image_url')
      .orderBy('timestamp', 'desc');

    let countQuery = db('events');

    if (category) {
      query = query.where('category', category);
      countQuery = countQuery.where('category', category);
    }

    if (date_from) {
      query = query.where('timestamp', '>=', new Date(date_from));
      countQuery = countQuery.where('timestamp', '>=', new Date(date_from));
    }

    const [events, [{ total }]] = await Promise.all([
      query.limit(limitNum).offset(offset),
      countQuery.count('id as total'),
    ]);

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
