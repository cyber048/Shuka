const express = require('express');
const { getDb } = require('../db');
const { sendError } = require('../errors');
const { requireAuth } = require('../auth');

const router = express.Router();

// POST /products/:id/reviews
router.post('/products/:id/reviews', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const productId = parseInt(req.params.id, 10);
  const { rating, body } = req.body || {};

  if (isNaN(productId)) {
    return sendError(res, 400, 'INVALID_ID', 'Invalid product id.');
  }

  const ratingVal = parseInt(rating, 10);
  if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
    return sendError(res, 400, 'INVALID_RATING', 'Rating must be an integer between 1 and 5.');
  }

  if (!body || typeof body !== 'string' || !body.trim()) {
    return sendError(res, 400, 'INVALID_BODY', 'Review text cannot be empty.');
  }

  // 1. Check if product exists
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product) {
    return sendError(res, 404, 'NOT_FOUND', 'Product not found.');
  }

  // 2. Check if buyer has a delivered order for this product
  const deliveredOrder = db.prepare(`
    SELECT oi.id
    FROM order_items oi
    JOIN seller_orders so ON oi.seller_order_id = so.id
    JOIN orders o ON so.order_id = o.id
    WHERE oi.product_id = ? AND o.buyer_id = ? AND so.status = 'delivered'
    LIMIT 1
  `).get(productId, userId);

  if (!deliveredOrder) {
    return sendError(res, 403, 'NOT_ELIGIBLE', 'You can only review products from orders that have been delivered to you.');
  }

  // 3. Check if buyer already reviewed this product
  const existingReview = db.prepare('SELECT id FROM reviews WHERE product_id = ? AND buyer_id = ?').get(productId, userId);
  if (existingReview) {
    return sendError(res, 409, 'ALREADY_REVIEWED', 'You have already reviewed this product.');
  }

  const now = new Date().toISOString();

  const reviewTx = db.transaction(() => {
    // Insert review
    const insert = db.prepare(`
      INSERT INTO reviews (product_id, buyer_id, rating, body, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(productId, userId, ratingVal, body.trim(), now);

    // Update product rating_avg and rating_count
    const stats = db.prepare(`
      SELECT 
        ROUND(AVG(rating), 1) as avg_rating,
        COUNT(*) as count
      FROM reviews 
      WHERE product_id = ?
    `).get(productId);

    db.prepare(`
      UPDATE products 
      SET rating_avg = ?, rating_count = ?, updated_at = ?
      WHERE id = ?
    `).run(stats.avg_rating || 0.0, stats.count || 0, now, productId);

    return insert.lastInsertRowid;
  });

  try {
    const reviewId = reviewTx.immediate();
    return res.status(201).json({
      id: Number(reviewId),
      product_id: productId,
      buyer_id: userId,
      rating: ratingVal,
      body: body.trim(),
      created_at: now
    });
  } catch (err) {
    console.error('Review submission error:', err);
    return sendError(res, 500, 'REVIEW_FAILED', 'Failed to submit review.');
  }
});

module.exports = router;
