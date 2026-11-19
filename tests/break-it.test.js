const http = require('http');
const path = require('path');
const fs = require('fs');
const { getDb, runMigrations } = require('../server/db');
const app = require('../server/app');
const { seed } = require('../scripts/seed');

async function runTests() {
  console.log('====================================================');
  console.log('        RUNNING SHUKA ACCEPTANCE BREAK-IT TESTS     ');
  console.log('====================================================\n');

  // 1. Seed fresh database
  await seed();
  const db = getDb();

  // 2. Start test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Test server running at ${baseUrl}\n`);

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      throw new Error(message);
    }
  }

  // Helper for requests with cookie handling
  async function api(endpoint, options = {}, cookie = null) {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      ...(options.headers || {})
    };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const res = await fetch(url, {
      ...options,
      headers
    });

    let data = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    // Extract cookie if Set-Cookie was sent
    const setCookie = res.headers.get('set-cookie');
    let sessionCookie = cookie;
    if (setCookie) {
      const match = setCookie.match(/shuka_session=[^;]+/);
      if (match) {
        sessionCookie = match[0];
      }
    }

    return { status: res.status, data, cookie: sessionCookie };
  }

  async function login(email, password = 'password123') {
    const res = await api('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.status !== 200) {
      throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
    }
    return res.cookie;
  }

  // ==========================================
  // Test 1: Concurrency & Last Units (Overselling)
  // ==========================================
  try {
    console.log('▶ Test 1: Last units (30 concurrent checkouts for stock 3)');
    // Create a product with stock = 3
    const seller = db.prepare("SELECT id FROM users WHERE store_name = 'Ararat Electronics'").get();
    const cat = db.prepare('SELECT id FROM categories LIMIT 1').get();
    const prodRes = db.prepare(`
      INSERT INTO products (seller_id, category_id, title, description, price_amd, stock, is_published, rating_avg, rating_count, created_at, updated_at)
      VALUES (?, ?, 'Super Rare Limited Item', 'Limited test', 5000, 3, 1, 0, 0, datetime('now'), datetime('now'))
    `).run(seller.id, cat.id);
    const testProdId = Number(prodRes.lastInsertRowid);

    // Register 30 separate buyers and have each put 1 in their cart
    const buyers = [];
    for (let i = 1; i <= 30; i++) {
      const reg = await api('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `concurrent_buyer_${i}_${Date.now()}@shuka.am`,
          password: 'password123',
          name: `Concurrent Buyer ${i}`,
          phone: `+374 77 ${100000 + i}`
        })
      });
      buyers.push(reg.cookie);

      // Add item to cart
      await api(`/cart/items/${testProdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 1 })
      }, reg.cookie);
    }

    // Send 30 checkouts at the same time
    const checkoutPromises = buyers.map((bCookie, idx) => {
      return api('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: `Buyer ${idx + 1}`,
          phone: '+374 77 123456',
          region: 'Yerevan',
          city: 'Yerevan',
          street: 'Baghramyan Ave',
          apartment: '10',
          request_key: `req-concurrent-${idx}-${Date.now()}`
        })
      }, bCookie);
    });

    const results = await Promise.all(checkoutPromises);

    let successCount = 0;
    let conflictCount = 0;
    let lockedErrors = 0;

    for (const r of results) {
      if (r.status === 201 || (r.status === 200 && r.data.order_id)) {
        successCount++;
      } else if (r.status === 409) {
        conflictCount++;
      } else if (JSON.stringify(r.data).toLowerCase().includes('locked') || JSON.stringify(r.data).toLowerCase().includes('sqlite_busy')) {
        lockedErrors++;
      }
    }

    const updatedProd = db.prepare('SELECT stock FROM products WHERE id = ?').get(testProdId);

    console.log(`   Results: Success = ${successCount}, Conflicts (409) = ${conflictCount}, Locked DB errors = ${lockedErrors}, Stock remaining = ${updatedProd.stock}`);

    assert(successCount === 3, `Expected exactly 3 successful orders, got ${successCount}`);
    assert(conflictCount === 27, `Expected exactly 27 409 conflict responses, got ${conflictCount}`);
    assert(updatedProd.stock === 0, `Expected final stock 0, got ${updatedProd.stock}`);
    assert(lockedErrors === 0, `Expected 0 locked DB errors, got ${lockedErrors}`);

    console.log('  ✅ Passed: Last units test succeeded flawlessly!\n');
    passedCount++;
  } catch (err) {
    console.error('  ❌ Test 1 failed:', err.message);
    failedCount++;
  }

  // ==========================================
  // Test 2: Double Click (Idempotency)
  // ==========================================
  try {
    console.log('▶ Test 2: Double click (Send same checkout twice with same request key)');
    const buyerCookie = await login('buyer1@shuka.am');

    // Add item to cart
    const prod = db.prepare('SELECT id FROM products WHERE stock > 5 LIMIT 1').get();
    await api(`/cart/items/${prod.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1 })
    }, buyerCookie);

    const dupKey = `double-click-test-${Date.now()}`;
    const orderPayload = {
      recipient: 'Karen Test',
      phone: '+374 77 456789',
      region: 'Yerevan',
      city: 'Yerevan',
      street: 'Sayat Nova',
      apartment: '15',
      request_key: dupKey
    };

    const res1 = await api('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    }, buyerCookie);

    const res2 = await api('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    }, buyerCookie);

    assert(res1.status === 201 || res1.status === 200, `First request should succeed, got ${res1.status}`);
    assert(res2.status === 200 || res2.status === 201, `Second request should succeed idempotently, got ${res2.status}`);
    assert(res1.data.order_id === res2.data.order_id, `Both requests must return the same order id (${res1.data.order_id} vs ${res2.data.order_id})`);

    const countOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE request_key = ?').get(dupKey).count;
    assert(countOrders === 1, `Expected exactly 1 order in DB, found ${countOrders}`);

    console.log('  ✅ Passed: Double click prevented, exactly one order created!\n');
    passedCount++;
  } catch (err) {
    console.error('  ❌ Test 2 failed:', err.message);
    failedCount++;
  }

  // ==========================================
  // Test 3: Price Changed
  // ==========================================
  try {
    console.log('▶ Test 3: Price changed (Buyer adds item, seller raises price, buyer checks out)');
    const buyerCookie = await login('buyer2@shuka.am');
    const prod = db.prepare('SELECT id, price_amd FROM products WHERE stock > 5 LIMIT 1').get();

    // Buyer adds item to cart at initial price
    await api(`/cart/items/${prod.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1 })
    }, buyerCookie);

    // Seller raises the price in DB
    const newPrice = prod.price_amd + 1000;
    db.prepare('UPDATE products SET price_amd = ? WHERE id = ?').run(newPrice, prod.id);

    // Buyer attempts checkout
    const checkoutRes = await api('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: 'Lilit Test',
        phone: '+374 98 567890',
        region: 'Kotayk',
        city: 'Abovyan',
        street: 'Hatis St',
        apartment: '2',
        request_key: `price-change-key-${Date.now()}`
      })
    }, buyerCookie);

    assert(checkoutRes.status === 409, `Expected 409 Conflict, got ${checkoutRes.status}`);
    assert(checkoutRes.data.error && checkoutRes.data.error.code === 'PRICE_CHANGED', 'Expected PRICE_CHANGED error code');

    console.log('  ✅ Passed: Checkout stopped and flagged the price change!\n');
    passedCount++;
  } catch (err) {
    console.error('  ❌ Test 3 failed:', err.message);
    failedCount++;
  }

  // ==========================================
  // Test 4: Old Order After Edit
  // ==========================================
  try {
    console.log('▶ Test 4: Old order after edit (Seller edits title and price of product already ordered)');
    const buyerCookie = await login('buyer1@shuka.am');
    const sellerCookie = await login('ararat.tech@shuka.am');
    const cat = db.prepare('SELECT id FROM categories LIMIT 1').get();

    // Create a product
    const createProd = await api('/seller/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Original Vintage Watch',
        category_id: cat.id,
        description: 'Authentic item',
        price_amd: 25000,
        stock: 5
      })
    }, sellerCookie);

    assert(createProd.status === 201, `Product creation failed: ${JSON.stringify(createProd.data)}`);
    const prodId = createProd.data.id;

    // Buyer adds and orders it
    await api(`/cart/items/${prodId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1 })
    }, buyerCookie);

    const orderRes = await api('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: 'Karen Snapshot',
        phone: '+374 77 456789',
        region: 'Yerevan',
        city: 'Yerevan',
        street: 'Komitas Ave',
        apartment: '40',
        request_key: `req-snapshot-${Date.now()}`
      })
    }, buyerCookie);

    const orderId = orderRes.data.order_id;

    // Seller now changes the product title and price
    await api(`/seller/products/${prodId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Completely Changed Title 2026',
        price_amd: 99000
      })
    }, sellerCookie);

    // Retrieve the past order
    const pastOrder = await api(`/orders/${orderId}`, {}, buyerCookie);
    const item = pastOrder.data.seller_orders[0].items[0];

    assert(item.title === 'Original Vintage Watch', `Expected original title, got "${item.title}"`);
    assert(item.unit_price_amd === 25000, `Expected unit_price_amd 25000, got ${item.unit_price_amd}`);

    console.log('  ✅ Passed: Past order preserved original purchase price and title!\n');
    passedCount++;
  } catch (err) {
    console.error('  ❌ Test 4 failed:', err.message);
    failedCount++;
  }

  // ==========================================
  // Test 5: Someone Else's Order (Security / Scoping)
  // ==========================================
  try {
    console.log("▶ Test 5: Someone else's order (Seller A opens Seller B's order; Buyer A opens Buyer B's order)");
    const buyer1Cookie = await login('buyer1@shuka.am');
    const buyer2Cookie = await login('buyer2@shuka.am');
    const seller1Cookie = await login('ararat.tech@shuka.am');
    const seller2Cookie = await login('ani.crafts@shuka.am');

    // Get an order made by buyer 1
    const buyer1Orders = await api('/orders', {}, buyer1Cookie);
    const b1Order = buyer1Orders.data[0];

    // Buyer 2 tries to view Buyer 1's order
    const b2Check = await api(`/orders/${b1Order.id}`, {}, buyer2Cookie);
    assert(b2Check.status === 403 || b2Check.status === 404, `Buyer 2 must be rejected, got ${b2Check.status}`);

    // Get seller order for seller 1
    const s1Orders = await api('/seller/orders', {}, seller1Cookie);
    if (s1Orders.data.orders.length > 0) {
      const s1Order = s1Orders.data.orders[0];
      // Seller 2 tries to view Seller 1's order
      const s2Check = await api(`/seller/orders/${s1Order.id}`, {}, seller2Cookie);
      assert(s2Check.status === 403 || s2Check.status === 404, `Seller 2 must be rejected, got ${s2Check.status}`);
    }

    console.log("  ✅ Passed: Multi-tenant scoping verified (403/404 on someone else's order)!\n");
    passedCount++;
  } catch (err) {
    console.error('  ❌ Test 5 failed:', err.message);
    failedCount++;
  }

  // ==========================================
  // Test 6: Move Not Allowed (State Machine Enforcement)
  // ==========================================
  try {
    console.log('▶ Test 6: Move not allowed (Invalid status transitions rejected with 409)');
    const buyerCookie = await login('buyer1@shuka.am');
    const sellerCookie = await login('ararat.tech@shuka.am');

    // Place an order
    const prod = db.prepare("SELECT id FROM products WHERE seller_id = (SELECT id FROM users WHERE email = 'ararat.tech@shuka.am') AND stock > 2 LIMIT 1").get();
    await api(`/cart/items/${prod.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1 })
    }, buyerCookie);

    const orderRes = await api('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: 'State Test',
        phone: '+374 77 112233',
        region: 'Yerevan',
        city: 'Yerevan',
        street: 'Moskovyan',
        apartment: '5',
        request_key: `state-machine-${Date.now()}`
      })
    }, buyerCookie);

    const orderId = orderRes.data.order_id;
    const orderDetails = await api(`/orders/${orderId}`, {}, buyerCookie);
    const sellerOrderId = orderDetails.data.seller_orders[0].id;

    // 1. Seller tries to move Placed directly to Delivered
    const invalidMove = await api(`/seller/orders/${sellerOrderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'delivered' })
    }, sellerCookie);

    assert(invalidMove.status === 409, `Expected 409 for invalid transition, got ${invalidMove.status}`);

    // 2. Move placed -> confirmed -> shipped
    await api(`/seller/orders/${sellerOrderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'confirmed' })
    }, sellerCookie);

    await api(`/seller/orders/${sellerOrderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'shipped' })
    }, sellerCookie);

    // 3. Buyer tries to cancel a shipped order
    const cancelShipped = await api(`/orders/${orderId}/sellers/${sellerOrderId}/cancel`, {
      method: 'POST'
    }, buyerCookie);

    assert(cancelShipped.status === 409, `Expected 409 when cancelling shipped order, got ${cancelShipped.status}`);

    console.log('  ✅ Passed: Order lifecycle transitions strictly enforced on server!\n');
    passedCount++;
  } catch (err) {
    console.error('  ❌ Test 6 failed:', err.message);
    failedCount++;
  }

  // ==========================================
  // Test 7: Cancel Returns Stock
  // ==========================================
  try {
    console.log('▶ Test 7: Cancel returns stock (Buyer cancels placed order -> stock restored)');
    const buyerCookie = await login('buyer2@shuka.am');
    const prod = db.prepare('SELECT id, stock FROM products WHERE stock > 5 LIMIT 1').get();
    const initialStock = prod.stock;

    // Buyer orders 2 units
    await api(`/cart/items/${prod.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 2 })
    }, buyerCookie);

    const orderRes = await api('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: 'Stock Restore Test',
        phone: '+374 98 123456',
        region: 'Yerevan',
        city: 'Yerevan',
        street: 'Tumanyan',
        apartment: '12',
        request_key: `cancel-stock-key-${Date.now()}`
      })
    }, buyerCookie);

    const orderId = orderRes.data.order_id;
    const stockAfterOrder = db.prepare('SELECT stock FROM products WHERE id = ?').get(prod.id).stock;
    assert(stockAfterOrder === initialStock - 2, `Stock should be reduced by 2 (${stockAfterOrder} vs ${initialStock - 2})`);

    const orderDetails = await api(`/orders/${orderId}`, {}, buyerCookie);
    const sellerOrderId = orderDetails.data.seller_orders[0].id;

    // Buyer cancels
    const cancelRes = await api(`/orders/${orderId}/sellers/${sellerOrderId}/cancel`, {
      method: 'POST'
    }, buyerCookie);

    assert(cancelRes.status === 200, `Cancel request must succeed, got ${cancelRes.status}`);

    const stockAfterCancel = db.prepare('SELECT stock FROM products WHERE id = ?').get(prod.id).stock;
    assert(stockAfterCancel === initialStock, `Stock must be fully restored to ${initialStock}, got ${stockAfterCancel}`);

    console.log('  ✅ Passed: Stock atomically restored on cancellation!\n');
    passedCount++;
  } catch (err) {
    console.error('  ❌ Test 7 failed:', err.message);
    failedCount++;
  }

  // ==========================================
  // Test 8: Foreign Keys
  // ==========================================
  try {
    console.log('▶ Test 8: Foreign keys (Insert order item with non-existent product ID rejected)');
    let fkRejected = false;
    try {
      db.prepare(`
        INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity)
        VALUES (1, 999999, 'Phantom Product', 1000, 1)
      `).run();
    } catch (e) {
      if (e.message.includes('FOREIGN KEY') || e.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        fkRejected = true;
      } else {
        throw e;
      }
    }

    assert(fkRejected, 'Expected foreign key constraint violation to be thrown by SQLite');
    console.log('  ✅ Passed: SQLite foreign keys strictly enforced on connection!\n');
    passedCount++;
  } catch (err) {
    console.error('  ❌ Test 8 failed:', err.message);
    failedCount++;
  }

  // ==========================================
  // Test 9: Bad Upload
  // ==========================================
  try {
    console.log('▶ Test 9: Bad upload (30 MB file and renamed .exe rejected with clear error)');
    const sellerCookie = await login('ararat.tech@shuka.am');
    const prod = db.prepare("SELECT id FROM products WHERE seller_id = (SELECT id FROM users WHERE email = 'ararat.tech@shuka.am') LIMIT 1").get();

    // 1. Upload renamed .exe
    const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00FakeWindowsExecutableFile');
    const formExe = new FormData();
    formExe.append('image', new Blob([fakeExeBuffer], { type: 'image/jpeg' }), 'malicious.jpg');

    const exeRes = await fetch(`${baseUrl}/seller/products/${prod.id}/images`, {
      method: 'POST',
      headers: {
        'Cookie': sellerCookie
      },
      body: formExe
    });

    const exeData = await exeRes.json();
    assert(exeRes.status === 400, `Expected 400 for corrupt/renamed executable image, got ${exeRes.status}`);
    assert(exeData.error, 'Expected error object in response');

    // 2. Upload oversized file (> 15 MB / 30 MB)
    const largeBuffer = Buffer.alloc(20 * 1024 * 1024, 0); // 20 MB buffer
    const formLarge = new FormData();
    formLarge.append('image', new Blob([largeBuffer], { type: 'image/jpeg' }), 'huge.jpg');

    const largeRes = await fetch(`${baseUrl}/seller/products/${prod.id}/images`, {
      method: 'POST',
      headers: {
        'Cookie': sellerCookie
      },
      body: formLarge
    });

    const largeData = await largeRes.json();
    assert(largeRes.status === 400, `Expected 400 for large upload, got ${largeRes.status}`);
    assert(largeData.error && largeData.error.code === 'FILE_TOO_LARGE', `Expected FILE_TOO_LARGE code, got ${JSON.stringify(largeData)}`);

    console.log('  ✅ Passed: Both 30MB file and disguised .exe rejected with clear error!\n');
    passedCount++;
  } catch (err) {
    console.error('  ❌ Test 9 failed:', err.message);
    failedCount++;
  }

  // Clean up server
  await new Promise((resolve) => server.close(resolve));

  console.log('====================================================');
  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of 9 tests.`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
