const express = require('express');
const { getDb } = require('../db');
const { sendError } = require('../errors');
const { requireAuth } = require('../auth');

const router = express.Router();

router.use(requireAuth);

// GET /cart
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const rows = db.prepare(`
    SELECT 
      ci.user_id,
      ci.product_id,
      ci.quantity,
      ci.price_when_added,
      p.title,
      p.price_amd as current_price_amd,
      p.stock as current_stock,
      p.is_published,
      p.seller_id,
      u.store_name,
      u.name as seller_name,
      (
        SELECT file_path 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY position ASC 
        LIMIT 1
      ) as main_image
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    JOIN users u ON p.seller_id = u.id
    WHERE ci.user_id = ?
    ORDER BY u.store_name ASC, p.title ASC
  `).all(userId);

  const groupsBySeller = {};
  let grandTotal = 0;
  let hasWarnings = false;

  for (const item of rows) {
    const isSoldOut = item.current_stock === 0 || item.is_published === 0;
    const isPriceChanged = item.current_price_amd !== item.price_when_added;
    const isOverStock = item.quantity > item.current_stock;

    let warning = null;
    if (isSoldOut) {
      warning = 'This item is currently out of stock.';
      hasWarnings = true;
    } else if (isPriceChanged) {
      warning = `Price changed from ${item.price_when_added.toLocaleString()} AMD to ${item.current_price_amd.toLocaleString()} AMD.`;
      hasWarnings = true;
    } else if (isOverStock) {
      warning = `Only ${item.current_stock} item(s) available in stock.`;
      hasWarnings = true;
    }

    const itemTotal = item.current_price_amd * item.quantity;
    grandTotal += itemTotal;

    if (!groupsBySeller[item.seller_id]) {
      groupsBySeller[item.seller_id] = {
        seller_id: item.seller_id,
        seller_name: item.seller_name,
        store_name: item.store_name,
        subtotal_amd: 0,
        items: []
      };
    }

    groupsBySeller[item.seller_id].subtotal_amd += itemTotal;
    groupsBySeller[item.seller_id].items.push({
      product_id: item.product_id,
      title: item.title,
      quantity: item.quantity,
      price_when_added: item.price_when_added,
      current_price_amd: item.current_price_amd,
      current_stock: item.current_stock,
      is_published: item.is_published === 1,
      is_sold_out: isSoldOut,
      is_price_changed: isPriceChanged,
      is_over_stock: isOverStock,
      warning,
      main_image: item.main_image
    });
  }

  const groups = Object.values(groupsBySeller);
  const totalItemCount = rows.reduce((acc, row) => acc + row.quantity, 0);

  return res.json({
    groups,
    grand_total_amd: grandTotal,
    item_count: totalItemCount,
    has_warnings: hasWarnings
  });
});

// PUT /cart/items/:productId
router.put('/items/:productId', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const productId = parseInt(req.params.productId, 10);
  const { quantity } = req.body || {};

  if (isNaN(productId)) {
    return sendError(res, 400, 'INVALID_ID', 'Invalid product id.');
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return sendError(res, 400, 'INVALID_QUANTITY', 'Quantity must be a positive integer.');
  }

  const product = db.prepare(`
    SELECT id, seller_id, title, price_amd, stock, is_published
    FROM products
    WHERE id = ?
  `).get(productId);

  if (!product || product.is_published === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Product not found or unavailable.');
  }

  // A seller cannot buy their own product
  if (product.seller_id === userId) {
    return sendError(res, 403, 'CANNOT_BUY_OWN_PRODUCT', 'You cannot add your own products to cart.');
  }

  if (qty > product.stock) {
    return sendError(res, 400, 'EXCEEDS_STOCK', `Quantity cannot exceed available stock (${product.stock}).`);
  }

  // Insert or update
  const existing = db.prepare('SELECT quantity, price_when_added FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId);

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(qty, userId, productId);
  } else {
    db.prepare(`
      INSERT INTO cart_items (user_id, product_id, quantity, price_when_added)
      VALUES (?, ?, ?, ?)
    `).run(userId, productId, qty, product.price_amd);
  }

  return res.json({ success: true, product_id: productId, quantity: qty });
});

// DELETE /cart/items/:productId
router.delete('/items/:productId', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const productId = parseInt(req.params.productId, 10);

  if (isNaN(productId)) {
    return sendError(res, 400, 'INVALID_ID', 'Invalid product id.');
  }

  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(userId, productId);
  return res.json({ success: true, product_id: productId });
});

module.exports = router;
