const express = require('express');
const { getDb } = require('../db');
const { sendError } = require('../errors');

const router = express.Router();

// GET /categories
router.get('/categories', (req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT id, name, slug FROM categories ORDER BY name ASC').all();
  return res.json(categories);
});

// GET /products?q=&category=&minPrice=&maxPrice=&sort=&page=
router.get('/products', (req, res) => {
  const db = getDb();
  const {
    q,
    category,
    minPrice,
    maxPrice,
    sort = 'newest',
    page = 1,
    limit = 12
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * pageSize;

  const conditions = ['p.is_published = 1'];
  const params = [];

  if (q && q.trim()) {
    conditions.push('(p.title LIKE ? OR p.description LIKE ?)');
    const searchTerm = `%${q.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (category) {
    if (/^\d+$/.test(category)) {
      conditions.push('p.category_id = ?');
      params.push(parseInt(category, 10));
    } else {
      conditions.push('c.slug = ?');
      params.push(category.trim());
    }
  }

  if (minPrice !== undefined && minPrice !== '') {
    const minVal = parseInt(minPrice, 10);
    if (!isNaN(minVal)) {
      conditions.push('p.price_amd >= ?');
      params.push(minVal);
    }
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    const maxVal = parseInt(maxPrice, 10);
    if (!isNaN(maxVal)) {
      conditions.push('p.price_amd <= ?');
      params.push(maxVal);
    }
  }

  let orderBy = 'p.created_at DESC';
  if (sort === 'price_asc') {
    orderBy = 'p.price_amd ASC';
  } else if (sort === 'price_desc') {
    orderBy = 'p.price_amd DESC';
  } else if (sort === 'rating') {
    orderBy = 'p.rating_avg DESC, p.rating_count DESC';
  } else {
    // default newest
    orderBy = 'p.created_at DESC';
  }

  const whereClause = conditions.join(' AND ');

  const countQuery = `
    SELECT COUNT(*) as total
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE ${whereClause}
  `;
  const totalRow = db.prepare(countQuery).get(...params);
  const totalCount = totalRow ? totalRow.total : 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const itemsQuery = `
    SELECT 
      p.id,
      p.title,
      p.description,
      p.price_amd,
      p.stock,
      p.rating_avg,
      p.rating_count,
      p.created_at,
      p.category_id,
      c.name as category_name,
      c.slug as category_slug,
      u.store_name,
      (
        SELECT file_path 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY position ASC 
        LIMIT 1
      ) as main_image
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN users u ON p.seller_id = u.id
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const products = db.prepare(itemsQuery).all(...params, pageSize, offset);

  return res.json({
    products,
    totalCount,
    page: pageNum,
    pageSize,
    totalPages
  });
});

// GET /products/:id
router.get('/products/:id', (req, res) => {
  const db = getDb();
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) {
    return sendError(res, 400, 'INVALID_ID', 'Invalid product id.');
  }

  const product = db.prepare(`
    SELECT 
      p.id,
      p.seller_id,
      p.category_id,
      p.title,
      p.description,
      p.price_amd,
      p.stock,
      p.is_published,
      p.rating_avg,
      p.rating_count,
      p.created_at,
      p.updated_at,
      c.name as category_name,
      c.slug as category_slug,
      u.store_name,
      u.name as seller_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN users u ON p.seller_id = u.id
    WHERE p.id = ?
  `).get(productId);

  if (!product) {
    return sendError(res, 404, 'NOT_FOUND', 'Product not found.');
  }

  const images = db.prepare(`
    SELECT id, file_path, position
    FROM product_images
    WHERE product_id = ?
    ORDER BY position ASC
  `).all(productId);

  // Derive stock status label as defined in specs: "In stock", "Only 2 left", "Out of stock"
  let stock_status = 'In stock';
  if (product.stock === 0) {
    stock_status = 'Out of stock';
  } else if (product.stock <= 2) {
    stock_status = `Only ${product.stock} left`;
  }

  return res.json({
    ...product,
    stock_status,
    images
  });
});

// GET /products/:id/reviews
router.get('/products/:id/reviews', (req, res) => {
  const db = getDb();
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) {
    return sendError(res, 400, 'INVALID_ID', 'Invalid product id.');
  }

  const reviews = db.prepare(`
    SELECT 
      r.id,
      r.product_id,
      r.buyer_id,
      r.rating,
      r.body,
      r.created_at,
      u.name as buyer_name
    FROM reviews r
    JOIN users u ON r.buyer_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `).all(productId);

  return res.json(reviews);
});

module.exports = router;
