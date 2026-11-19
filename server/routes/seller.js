const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const { sendError } = require('../errors');
const { requireAuth, requireSeller } = require('../auth');

const router = express.Router();

// Multer storage in temp memory to validate with Sharp before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB max file size limit (rejects 30 MB)
  },
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    const disallowedExts = ['.exe', '.bat', '.sh', '.bin', '.dll', '.msi', '.cmd'];

    if (disallowedExts.includes(ext) || !allowedMime.includes(file.mimetype)) {
      const err = new Error('Invalid file type. Only JPG, PNG, WEBP, and GIF images are allowed.');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    cb(null, true);
  }
});

// POST /seller/activate - Become a seller
router.post('/activate', requireAuth, (req, res) => {
  const { store_name, phone } = req.body || {};
  if (!store_name || !store_name.trim() || !phone || !phone.trim()) {
    return sendError(res, 400, 'INVALID_INPUT', 'Store name and phone number are required.');
  }

  const db = getDb();
  const trimmedStore = store_name.trim();
  const trimmedPhone = phone.trim();

  // Check unique store_name
  const existing = db.prepare('SELECT id FROM users WHERE store_name = ? COLLATE NOCASE AND id != ?').get(trimmedStore, req.user.id);
  if (existing) {
    return sendError(res, 409, 'STORE_NAME_TAKEN', 'This store name is already in use.');
  }

  db.prepare(`
    UPDATE users 
    SET store_name = ?, phone = ? 
    WHERE id = ?
  `).run(trimmedStore, trimmedPhone, req.user.id);

  const updatedUser = {
    ...req.user,
    store_name: trimmedStore,
    phone: trimmedPhone,
    is_seller: true
  };

  return res.json(updatedUser);
});

// All following endpoints require seller authorization
router.use(requireSeller);

// GET /seller/overview
// "Counts of orders to confirm and to ship, and revenue from delivered orders in the last 30 days"
// "The checkout transaction and the seller overview queries are written in plain SQL"
router.get('/overview', (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;

  const toConfirmRow = db.prepare(`
    SELECT COUNT(*) as count 
    FROM seller_orders 
    WHERE seller_id = ? AND status = 'placed'
  `).get(sellerId);

  const toShipRow = db.prepare(`
    SELECT COUNT(*) as count 
    FROM seller_orders 
    WHERE seller_id = ? AND status = 'confirmed'
  `).get(sellerId);

  const revenueRow = db.prepare(`
    SELECT COALESCE(SUM(subtotal_amd), 0) as revenue 
    FROM seller_orders 
    WHERE seller_id = ? 
      AND status = 'delivered' 
      AND updated_at >= datetime('now', '-30 days')
  `).get(sellerId);

  return res.json({
    orders_to_confirm: toConfirmRow ? toConfirmRow.count : 0,
    orders_to_ship: toShipRow ? toShipRow.count : 0,
    delivered_revenue_30d_amd: revenueRow ? revenueRow.revenue : 0
  });
});

// GET /seller/products - Table of seller's products
router.get('/products', (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;

  const products = db.prepare(`
    SELECT 
      p.id,
      p.title,
      p.description,
      p.price_amd,
      p.stock,
      p.is_published,
      p.category_id,
      p.created_at,
      p.updated_at,
      c.name as category_name,
      (
        SELECT file_path 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY position ASC 
        LIMIT 1
      ) as thumbnail,
      (
        SELECT COALESCE(SUM(oi.quantity), 0)
        FROM order_items oi
        JOIN seller_orders so ON oi.seller_order_id = so.id
        WHERE oi.product_id = p.id AND so.status != 'cancelled'
      ) as units_sold
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.seller_id = ?
    ORDER BY p.id DESC
  `).all(sellerId);

  return res.json(products);
});

// POST /seller/products - Add product
router.post('/products', (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;
  const { title, category_id, description, price_amd, stock } = req.body || {};

  const errors = {};
  if (!title || !title.trim()) errors.title = 'Title is required.';
  if (!category_id) errors.category_id = 'Category is required.';
  if (!description || !description.trim()) errors.description = 'Description is required.';
  
  const priceVal = parseInt(price_amd, 10);
  if (isNaN(priceVal) || priceVal <= 0) errors.price_amd = 'Price must be a positive integer in AMD.';

  const stockVal = parseInt(stock, 10);
  if (isNaN(stockVal) || stockVal < 0) errors.stock = 'Stock must be 0 or more.';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Validation failed.', fields: errors } });
  }

  const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
  if (!category) {
    return sendError(res, 400, 'INVALID_CATEGORY', 'Selected category does not exist.');
  }

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO products (
      seller_id, category_id, title, description, price_amd, stock, is_published, rating_avg, rating_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, 0.0, 0, ?, ?)
  `).run(sellerId, category_id, title.trim(), description.trim(), priceVal, stockVal, now, now);

  const newProductId = Number(insert.lastInsertRowid);
  const createdProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(newProductId);

  return res.status(201).json(createdProduct);
});

// PATCH /seller/products/:id - Edit or unpublish product
router.patch('/products/:id', (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;
  const productId = parseInt(req.params.id, 10);

  if (isNaN(productId)) {
    return sendError(res, 400, 'INVALID_ID', 'Invalid product id.');
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) {
    return sendError(res, 404, 'NOT_FOUND', 'Product not found.');
  }

  if (product.seller_id !== sellerId) {
    return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to edit this product.');
  }

  const { title, category_id, description, price_amd, stock, is_published } = req.body || {};

  const fields = [];
  const params = [];

  if (title !== undefined) {
    if (!title.trim()) return sendError(res, 400, 'INVALID_INPUT', 'Title cannot be empty.');
    fields.push('title = ?');
    params.push(title.trim());
  }

  if (category_id !== undefined) {
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) return sendError(res, 400, 'INVALID_CATEGORY', 'Category does not exist.');
    fields.push('category_id = ?');
    params.push(category_id);
  }

  if (description !== undefined) {
    if (!description.trim()) return sendError(res, 400, 'INVALID_INPUT', 'Description cannot be empty.');
    fields.push('description = ?');
    params.push(description.trim());
  }

  if (price_amd !== undefined) {
    const p = parseInt(price_amd, 10);
    if (isNaN(p) || p <= 0) return sendError(res, 400, 'INVALID_PRICE', 'Price must be positive.');
    fields.push('price_amd = ?');
    params.push(p);
  }

  if (stock !== undefined) {
    const s = parseInt(stock, 10);
    if (isNaN(s) || s < 0) return sendError(res, 400, 'INVALID_STOCK', 'Stock cannot be negative.');
    fields.push('stock = ?');
    params.push(s);
  }

  if (is_published !== undefined) {
    fields.push('is_published = ?');
    params.push(is_published ? 1 : 0);
  }

  if (fields.length === 0) {
    return sendError(res, 400, 'NO_CHANGES', 'No fields provided to update.');
  }

  const now = new Date().toISOString();
  fields.push('updated_at = ?');
  params.push(now);

  params.push(productId);

  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  return res.json(updatedProduct);
});

// POST /seller/products/:id/images - Upload image
router.post('/products/:id/images', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 400, 'FILE_TOO_LARGE', 'Image size exceeds maximum allowed size.');
      }
      return sendError(res, 400, 'UPLOAD_ERROR', err.message || 'File upload error.');
    }

    if (!req.file) {
      return sendError(res, 400, 'NO_FILE', 'No image file uploaded.');
    }

    const db = getDb();
    const sellerId = req.user.id;
    const productId = parseInt(req.params.id, 10);

    const product = db.prepare('SELECT id, seller_id FROM products WHERE id = ?').get(productId);
    if (!product) {
      return sendError(res, 404, 'NOT_FOUND', 'Product not found.');
    }

    if (product.seller_id !== sellerId) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not own this product.');
    }

    // Limit to 5 images
    const currentCount = db.prepare('SELECT COUNT(*) as count FROM product_images WHERE product_id = ?').get(productId).count;
    if (currentCount >= 5) {
      return sendError(res, 400, 'MAX_IMAGES_EXCEEDED', 'A product can have at most 5 images.');
    }

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `prod-${productId}-${uniqueSuffix}.webp`;
    const filepath = path.join(uploadsDir, filename);

    try {
      // Validate with Sharp and resize (checking for corrupt or disguised non-image files like renamed .exe)
      await sharp(req.file.buffer)
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(filepath);

      // Next position
      const maxPosRow = db.prepare('SELECT MAX(position) as max_pos FROM product_images WHERE product_id = ?').get(productId);
      const position = (maxPosRow && maxPosRow.max_pos !== null) ? maxPosRow.max_pos + 1 : 1;
      const webPath = `/uploads/${filename}`;

      const insert = db.prepare(`
        INSERT INTO product_images (product_id, file_path, position)
        VALUES (?, ?, ?)
      `).run(productId, webPath, position);

      return res.status(201).json({
        id: Number(insert.lastInsertRowid),
        product_id: productId,
        file_path: webPath,
        position
      });
    } catch (sharpError) {
      console.error('Sharp processing error:', sharpError);
      return sendError(res, 400, 'INVALID_IMAGE', 'File is not a valid or readable image.');
    }
  });
});

// DELETE /seller/products/:id/images/:imageId - Delete image
router.delete('/products/:id/images/:imageId', (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;
  const productId = parseInt(req.params.id, 10);
  const imageId = parseInt(req.params.imageId, 10);

  const product = db.prepare('SELECT id, seller_id FROM products WHERE id = ?').get(productId);
  if (!product) return sendError(res, 404, 'NOT_FOUND', 'Product not found.');
  if (product.seller_id !== sellerId) return sendError(res, 403, 'FORBIDDEN', 'Access denied.');

  const img = db.prepare('SELECT id, file_path FROM product_images WHERE id = ? AND product_id = ?').get(imageId, productId);
  if (!img) return sendError(res, 404, 'NOT_FOUND', 'Image not found.');

  db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);

  // Optionally delete file from disk if it exists in uploads
  try {
    const localPath = path.join(__dirname, '..', '..', img.file_path);
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  } catch (e) {
    // Ignore deletion errors for missing files
  }

  return res.json({ success: true, image_id: imageId });
});

// GET /seller/orders?status=
router.get('/orders', (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;
  const { status } = req.query;

  // Counts for each tab
  const counts = {
    all: db.prepare('SELECT COUNT(*) as c FROM seller_orders WHERE seller_id = ?').get(sellerId).c,
    placed: db.prepare("SELECT COUNT(*) as c FROM seller_orders WHERE seller_id = ? AND status = 'placed'").get(sellerId).c,
    confirmed: db.prepare("SELECT COUNT(*) as c FROM seller_orders WHERE seller_id = ? AND status = 'confirmed'").get(sellerId).c,
    shipped: db.prepare("SELECT COUNT(*) as c FROM seller_orders WHERE seller_id = ? AND status = 'shipped'").get(sellerId).c,
    delivered: db.prepare("SELECT COUNT(*) as c FROM seller_orders WHERE seller_id = ? AND status = 'delivered'").get(sellerId).c,
    cancelled: db.prepare("SELECT COUNT(*) as c FROM seller_orders WHERE seller_id = ? AND status = 'cancelled'").get(sellerId).c
  };

  let query = `
    SELECT 
      so.id,
      so.order_id,
      so.seller_id,
      so.status,
      so.subtotal_amd,
      so.updated_at,
      o.recipient,
      o.phone as recipient_phone,
      o.region,
      o.city,
      o.street,
      o.apartment,
      o.note,
      o.created_at
    FROM seller_orders so
    JOIN orders o ON so.order_id = o.id
    WHERE so.seller_id = ?
  `;

  const params = [sellerId];
  if (status && status !== 'all') {
    query += ' AND so.status = ?';
    params.push(status);
  }

  query += ' ORDER BY so.id DESC';

  const orders = db.prepare(query).all(...params);

  // Attach items for quick display
  for (const o of orders) {
    o.items = db.prepare(`
      SELECT id, title, unit_price_amd, quantity 
      FROM order_items 
      WHERE seller_order_id = ?
    `).all(o.id);
  }

  return res.json({ counts, orders });
});

// GET /seller/orders/:id
router.get('/orders/:id', (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;
  const sellerOrderId = parseInt(req.params.id, 10);

  if (isNaN(sellerOrderId)) {
    return sendError(res, 400, 'INVALID_ID', 'Invalid seller order id.');
  }

  // Scoped query: WHERE so.id = ? AND so.seller_id = ?
  const order = db.prepare(`
    SELECT 
      so.id,
      so.order_id,
      so.seller_id,
      so.status,
      so.subtotal_amd,
      so.updated_at,
      o.recipient,
      o.phone as recipient_phone,
      o.region,
      o.city,
      o.street,
      o.apartment,
      o.note,
      o.created_at
    FROM seller_orders so
    JOIN orders o ON so.order_id = o.id
    WHERE so.id = ? AND so.seller_id = ?
  `).get(sellerOrderId, sellerId);

  if (!order) {
    return sendError(res, 404, 'NOT_FOUND', 'Order not found.');
  }

  order.items = db.prepare(`
    SELECT 
      oi.id,
      oi.product_id,
      oi.title,
      oi.unit_price_amd,
      oi.quantity,
      (
        SELECT file_path 
        FROM product_images 
        WHERE product_id = oi.product_id 
        ORDER BY position ASC 
        LIMIT 1
      ) as main_image
    FROM order_items oi
    WHERE oi.seller_order_id = ?
  `).all(sellerOrderId);

  order.status_history = db.prepare(`
    SELECT 
      sh.id,
      sh.from_status,
      sh.to_status,
      sh.changed_by,
      sh.created_at,
      u.name as changed_by_name
    FROM status_history sh
    JOIN users u ON sh.changed_by = u.id
    WHERE sh.seller_order_id = ?
    ORDER BY sh.id ASC
  `).all(sellerOrderId);

  // Allowed transitions
  const allowedMoves = [];
  if (order.status === 'placed') {
    allowedMoves.push('confirmed', 'cancelled');
  } else if (order.status === 'confirmed') {
    allowedMoves.push('shipped', 'cancelled');
  } else if (order.status === 'shipped') {
    allowedMoves.push('delivered');
  }

  order.allowed_moves = allowedMoves;
  return res.json(order);
});

// POST /seller/orders/:id/status with { "to": "..." }
router.post('/orders/:id/status', (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;
  const sellerOrderId = parseInt(req.params.id, 10);
  const { to } = req.body || {};

  if (isNaN(sellerOrderId) || !to) {
    return sendError(res, 400, 'INVALID_INPUT', 'Seller order id and target status "to" are required.');
  }

  // Scoped fetch
  const order = db.prepare('SELECT id, status FROM seller_orders WHERE id = ? AND seller_id = ?').get(sellerOrderId, sellerId);
  if (!order) {
    return sendError(res, 404, 'NOT_FOUND', 'Order not found.');
  }

  // Lifecycle check (Page 4):
  // placed -> confirmed, cancelled
  // confirmed -> shipped, cancelled
  // shipped -> delivered
  // Any other move returns 409
  const validTransitions = {
    placed: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
  };

  const allowed = validTransitions[order.status] || [];
  if (!allowed.includes(to)) {
    return sendError(res, 409, 'INVALID_STATUS_TRANSITION', `Cannot move order from "${order.status}" to "${to}".`);
  }

  const now = new Date().toISOString();

  const transitionTx = db.transaction(() => {
    // If moving to cancelled, restore stock
    if (to === 'cancelled') {
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE seller_order_id = ?').all(sellerOrderId);
      for (const it of items) {
        db.prepare(`
          UPDATE products 
          SET stock = stock + ?, updated_at = ? 
          WHERE id = ?
        `).run(it.quantity, now, it.product_id);
      }
    }

    db.prepare(`
      UPDATE seller_orders 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `).run(to, now, sellerOrderId);

    db.prepare(`
      INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sellerOrderId, order.status, to, sellerId, now);
  });

  try {
    transitionTx.immediate();
    return res.json({ success: true, seller_order_id: sellerOrderId, status: to });
  } catch (err) {
    console.error('Status transition error:', err);
    return sendError(res, 500, 'UPDATE_FAILED', 'Failed to update order status.');
  }
});

module.exports = router;
