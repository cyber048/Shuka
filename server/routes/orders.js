const express = require('express');
const { getDb } = require('../db');
const { sendError } = require('../errors');
const { requireAuth } = require('../auth');

const router = express.Router();

router.use(requireAuth);

// GET /orders/last-address (helper to pre-fill checkout address)
router.get('/last-address', (req, res) => {
  const db = getDb();
  const lastOrder = db.prepare(`
    SELECT recipient, phone, region, city, street, apartment, note
    FROM orders
    WHERE buyer_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(req.user.id);

  return res.json(lastOrder || null);
});

// GET /orders - Buyer orders list
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const orders = db.prepare(`
    SELECT 
      o.id,
      o.buyer_id,
      o.recipient,
      o.phone,
      o.region,
      o.city,
      o.street,
      o.apartment,
      o.note,
      o.total_amd,
      o.created_at
    FROM orders o
    WHERE o.buyer_id = ?
    ORDER BY o.id DESC
  `).all(userId);

  for (const order of orders) {
    const sellerOrders = db.prepare(`
      SELECT 
        so.id,
        so.seller_id,
        so.status,
        so.subtotal_amd,
        so.updated_at,
        u.store_name,
        u.name as seller_name
      FROM seller_orders so
      JOIN users u ON so.seller_id = u.id
      WHERE so.order_id = ?
      ORDER BY so.id ASC
    `).all(order.id);

    order.seller_orders = sellerOrders;
  }

  return res.json(orders);
});

// GET /orders/:id - Buyer order detail
router.get('/:id', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const orderId = parseInt(req.params.id, 10);

  if (isNaN(orderId)) {
    return sendError(res, 400, 'INVALID_ID', 'Invalid order id.');
  }

  const order = db.prepare(`
    SELECT 
      id, buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at
    FROM orders
    WHERE id = ?
  `).get(orderId);

  if (!order) {
    return sendError(res, 404, 'NOT_FOUND', 'Order not found.');
  }

  // Authorization check: only order owner may view
  if (order.buyer_id !== userId) {
    return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to view this order.');
  }

  const sellerOrders = db.prepare(`
    SELECT 
      so.id,
      so.seller_id,
      so.status,
      so.subtotal_amd,
      so.updated_at,
      u.store_name,
      u.name as seller_name,
      u.phone as seller_phone
    FROM seller_orders so
    JOIN users u ON so.seller_id = u.id
    WHERE so.order_id = ?
    ORDER BY so.id ASC
  `).all(order.id);

  for (const so of sellerOrders) {
    so.items = db.prepare(`
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
    `).all(so.id);

    so.status_history = db.prepare(`
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
    `).all(so.id);
  }

  order.seller_orders = sellerOrders;
  return res.json(order);
});

// POST /orders - Checkout with request key
router.post('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const {
    recipient,
    phone,
    region,
    city,
    street,
    apartment,
    note,
    request_key
  } = req.body || {};

  if (!request_key || typeof request_key !== 'string' || !request_key.trim()) {
    return sendError(res, 400, 'MISSING_REQUEST_KEY', 'Request key is required.');
  }

  // Idempotency: Double checkout check (returns existing order if already submitted)
  const existingOrder = db.prepare('SELECT id FROM orders WHERE request_key = ?').get(request_key.trim());
  if (existingOrder) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(existingOrder.id);
    return res.json({
      order_id: existingOrder.id,
      order,
      is_duplicate: true
    });
  }

  if (!recipient || !phone || !region || !city || !street || !apartment) {
    return sendError(res, 400, 'INVALID_INPUT', 'All address fields (recipient, phone, region, city, street, apartment) are required.');
  }

  // Load cart items
  const cartItems = db.prepare(`
    SELECT 
      ci.product_id,
      ci.quantity,
      ci.price_when_added,
      p.title,
      p.price_amd as current_price_amd,
      p.stock,
      p.seller_id,
      p.is_published
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?
  `).all(userId);

  if (cartItems.length === 0) {
    return sendError(res, 400, 'EMPTY_CART', 'Your cart is empty.');
  }

  // Price change check (Requirement 3: "If the price changed since the item went into the cart, checkout stops and shows the new price")
  for (const item of cartItems) {
    if (item.current_price_amd !== item.price_when_added) {
      // Update cart to new price
      db.prepare('UPDATE cart_items SET price_when_added = ? WHERE user_id = ? AND product_id = ?')
        .run(item.current_price_amd, userId, item.product_id);

      return sendError(res, 409, 'PRICE_CHANGED', `The price for "${item.title}" changed from ${item.price_when_added} AMD to ${item.current_price_amd} AMD. Please review your cart.`);
    }

    if (item.is_published === 0) {
      return sendError(res, 409, 'ITEM_UNAVAILABLE', `Item "${item.title}" is no longer available.`);
    }
  }

  // Calculate totals and group by seller
  const sellerGroups = {};
  let grandTotal = 0;

  for (const item of cartItems) {
    const itemTotal = item.current_price_amd * item.quantity;
    grandTotal += itemTotal;

    if (!sellerGroups[item.seller_id]) {
      sellerGroups[item.seller_id] = {
        seller_id: item.seller_id,
        subtotal_amd: 0,
        items: []
      };
    }

    sellerGroups[item.seller_id].subtotal_amd += itemTotal;
    sellerGroups[item.seller_id].items.push(item);
  }

  const now = new Date().toISOString();

  // BEGIN IMMEDIATE Transaction
  // "Checkout runs in one BEGIN IMMEDIATE transaction.
  // Stock is reduced with UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?,
  // then the number of changed rows is checked. If any line fails, roll back the whole order
  // and return 409 with the product name."
  const checkoutTx = db.transaction(() => {
    // 1. Atomic stock reduction
    for (const item of cartItems) {
      const updateResult = db.prepare(`
        UPDATE products 
        SET stock = stock - ?, updated_at = ? 
        WHERE id = ? AND stock >= ?
      `).run(item.quantity, now, item.product_id, item.quantity);

      if (updateResult.changes === 0) {
        const err = new Error(`Item "${item.title}" does not have enough stock.`);
        err.code = 'OUT_OF_STOCK';
        err.productTitle = item.title;
        throw err;
      }
    }

    // 2. Create parent order
    const orderInsert = db.prepare(`
      INSERT INTO orders (
        buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      recipient.trim(),
      phone.trim(),
      region.trim(),
      city.trim(),
      street.trim(),
      apartment.trim(),
      note ? note.trim() : null,
      grandTotal,
      request_key.trim(),
      now
    );

    const orderId = Number(orderInsert.lastInsertRowid);

    // 3. Create seller orders, order items, and status history
    for (const sellerIdStr of Object.keys(sellerGroups)) {
      const group = sellerGroups[sellerIdStr];
      const soInsert = db.prepare(`
        INSERT INTO seller_orders (order_id, seller_id, status, subtotal_amd, updated_at)
        VALUES (?, ?, 'placed', ?, ?)
      `).run(orderId, group.seller_id, group.subtotal_amd, now);

      const sellerOrderId = Number(soInsert.lastInsertRowid);

      db.prepare(`
        INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
        VALUES (?, NULL, 'placed', ?, ?)
      `).run(sellerOrderId, userId, now);

      for (const it of group.items) {
        db.prepare(`
          INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity)
          VALUES (?, ?, ?, ?, ?)
        `).run(sellerOrderId, it.product_id, it.title, it.current_price_amd, it.quantity);
      }
    }

    // 4. Empty the buyer's cart
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);

    return orderId;
  });

  try {
    const orderId = checkoutTx.immediate();
    return res.status(201).json({
      success: true,
      order_id: orderId,
      total_amd: grandTotal
    });
  } catch (err) {
    if (err.code === 'OUT_OF_STOCK') {
      return sendError(res, 409, 'OUT_OF_STOCK', err.message);
    }
    if (err.message && err.message.includes('UNIQUE constraint failed: orders.request_key')) {
      const order = db.prepare('SELECT id FROM orders WHERE request_key = ?').get(request_key.trim());
      return res.json({
        order_id: order.id,
        is_duplicate: true
      });
    }
    console.error('Checkout error:', err);
    return sendError(res, 500, 'CHECKOUT_FAILED', 'Failed to process order.');
  }
});

// POST /orders/:id/sellers/:sellerOrderId/cancel - Buyer cancels a seller order
router.post('/:id/sellers/:sellerOrderId/cancel', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const orderId = parseInt(req.params.id, 10);
  const sellerOrderId = parseInt(req.params.sellerOrderId, 10);

  if (isNaN(orderId) || isNaN(sellerOrderId)) {
    return sendError(res, 400, 'INVALID_ID', 'Invalid order or seller order ID.');
  }

  const order = db.prepare('SELECT buyer_id FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    return sendError(res, 404, 'NOT_FOUND', 'Order not found.');
  }

  if (order.buyer_id !== userId) {
    return sendError(res, 403, 'FORBIDDEN', 'You do not own this order.');
  }

  const sellerOrder = db.prepare('SELECT id, status FROM seller_orders WHERE id = ? AND order_id = ?').get(sellerOrderId, orderId);
  if (!sellerOrder) {
    return sendError(res, 404, 'NOT_FOUND', 'Seller order not found.');
  }

  // "Cancelling is possible only before Shipped. Any other move returns 409 and writes nothing."
  // Allowed states to cancel: 'placed' or 'confirmed'
  if (sellerOrder.status !== 'placed' && sellerOrder.status !== 'confirmed') {
    return sendError(res, 409, 'INVALID_STATUS_TRANSITION', `Cannot cancel order with status "${sellerOrder.status}". Only placed or confirmed orders can be cancelled.`);
  }

  const now = new Date().toISOString();

  // "Cancelling returns the stock in the same transaction as the status change"
  const cancelTx = db.transaction(() => {
    // 1. Update status
    db.prepare(`
      UPDATE seller_orders 
      SET status = 'cancelled', updated_at = ? 
      WHERE id = ?
    `).run(now, sellerOrderId);

    // 2. Add status history
    db.prepare(`
      INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
      VALUES (?, ?, 'cancelled', ?, ?)
    `).run(sellerOrderId, sellerOrder.status, userId, now);

    // 3. Return stock to products
    const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE seller_order_id = ?').all(sellerOrderId);
    for (const it of items) {
      db.prepare(`
        UPDATE products 
        SET stock = stock + ?, updated_at = ? 
        WHERE id = ?
      `).run(it.quantity, now, it.product_id);
    }
  });

  try {
    cancelTx.immediate();
    return res.json({ success: true, seller_order_id: sellerOrderId, status: 'cancelled' });
  } catch (err) {
    console.error('Cancellation error:', err);
    return sendError(res, 500, 'CANCEL_FAILED', 'Failed to cancel seller order.');
  }
});

module.exports = router;
