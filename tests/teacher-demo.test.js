const http = require('http');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const app = require('../server/app');
const { getDb } = require('../server/db');

async function runTeacherDemo() {
  console.log('====================================================');
  console.log('       RUNNING TEACHER DEMO SCRIPT VERIFICATION     ');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  const db = getDb();

  function assert(cond, msg) {
    if (!cond) {
      console.error(`❌ FAILED: ${msg}`);
      throw new Error(msg);
    }
  }

  async function api(endpoint, options = {}, cookie = null) {
    const headers = { ...(options.headers || {}) };
    if (cookie) headers['Cookie'] = cookie;

    const res = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
    let data = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    const setCookie = res.headers.get('set-cookie');
    let sessionCookie = cookie;
    if (setCookie) {
      const match = setCookie.match(/shuka_session=[^;]+/);
      if (match) sessionCookie = match[0];
    }

    return { status: res.status, data, cookie: sessionCookie };
  }

  // 1. Step 1: Register, become a seller, and add a product with 3 photos
  console.log('▶ Step 1: Register teacher, activate seller, create product with 3 photos');
  const teacherSellerEmail = `teacher_seller_${Date.now()}@shuka.am`;
  const regSeller = await api('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: teacherSellerEmail,
      password: 'password123',
      name: 'Teacher Armen',
      phone: '+374 91 777888'
    })
  });
  assert(regSeller.status === 201, 'Seller registration failed');
  const sellerCookie = regSeller.cookie;

  const actRes = await api('/seller/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      store_name: `Teacher Store ${Date.now()}`,
      phone: '+374 91 777888'
    })
  }, sellerCookie);
  assert(actRes.status === 200, 'Seller activation failed');

  const cat = db.prepare('SELECT id FROM categories LIMIT 1').get();
  const prodRes = await api('/seller/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Teacher Demo Smart Gadget',
      category_id: cat.id,
      description: 'Exclusive gadget created during live demo.',
      price_amd: 35000,
      stock: 10
    })
  }, sellerCookie);
  assert(prodRes.status === 201, 'Product creation failed');
  const demoProdId = prodRes.data.id;

  // Upload 3 photos
  for (let i = 1; i <= 3; i++) {
    const imgBuf = await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r: 50 * i, g: 100, b: 200 } }
    }).jpeg().toBuffer();

    const form = new FormData();
    form.append('image', new Blob([imgBuf], { type: 'image/jpeg' }), `photo${i}.jpg`);

    const upRes = await fetch(`${baseUrl}/seller/products/${demoProdId}/images`, {
      method: 'POST',
      headers: { Cookie: sellerCookie },
      body: form
    });
    assert(upRes.status === 201, `Upload photo ${i} failed`);
  }
  console.log('  ✅ Step 1 completed: Product created with 3 photos!\n');

  // 2. Step 2: Register second account as a buyer
  console.log('▶ Step 2: Register a second account as a buyer');
  const teacherBuyerEmail = `teacher_buyer_${Date.now()}@shuka.am`;
  const regBuyer = await api('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: teacherBuyerEmail,
      password: 'password123',
      name: 'Teacher Student Buyer',
      phone: '+374 77 999000'
    })
  });
  assert(regBuyer.status === 201, 'Buyer registration failed');
  const buyerCookie = regBuyer.cookie;
  console.log('  ✅ Step 2 completed: Buyer account registered!\n');

  // 3. Step 3: Find the product from its category page and by keyword search
  console.log('▶ Step 3: Find product from category and by keyword search');
  const searchCatRes = await api(`/products?category=${cat.id}`, {}, buyerCookie);
  const foundInCat = searchCatRes.data.products.some((p) => p.id === demoProdId);
  assert(foundInCat, 'Product should be visible in category');

  const searchKeywordRes = await api('/products?q=Smart Gadget', {}, buyerCookie);
  const foundInKw = searchKeywordRes.data.products.some((p) => p.id === demoProdId);
  assert(foundInKw, 'Product should be found by keyword search');
  console.log('  ✅ Step 3 completed: Product successfully discovered via search & category!\n');

  // 4. Step 4: Add it and a product from another seller to the cart. Change quantity. Try to add more than stock.
  console.log('▶ Step 4: Multi-seller cart, quantity change, and stock enforcement');
  const otherProd = db.prepare('SELECT id, stock FROM products WHERE id != ? AND is_published = 1 AND stock >= 5 LIMIT 1').get(demoProdId);

  // Add demo product
  await api(`/cart/items/${demoProdId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 1 })
  }, buyerCookie);

  // Add other seller product
  await api(`/cart/items/${otherProd.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 1 })
  }, buyerCookie);

  // Change quantity of demo product to 2
  await api(`/cart/items/${demoProdId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 2 })
  }, buyerCookie);

  // Try to add more than stock
  const overStockRes = await api(`/cart/items/${demoProdId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 9999 })
  }, buyerCookie);
  assert(overStockRes.status === 400 || overStockRes.status === 409, 'Adding over stock must be rejected');

  // Verify cart has 2 seller groups
  const cartRes = await api('/cart', {}, buyerCookie);
  assert(cartRes.data.groups.length === 2, `Cart should have 2 seller groups, found ${cartRes.data.groups.length}`);
  console.log('  ✅ Step 4 completed: Multi-seller cart verified, over-stock rejected!\n');

  // 5. Step 5: Enter delivery address and place order, cash on delivery
  console.log('▶ Step 5: Place order with delivery address (Cash on Delivery)');
  const orderRes = await api('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: 'Teacher Student Buyer',
      phone: '+374 77 999000',
      region: 'Yerevan',
      city: 'Yerevan',
      street: 'Teryan St',
      apartment: 'Apt 105',
      note: 'Door code 1234',
      request_key: `teacher-demo-key-${Date.now()}`
    })
  }, buyerCookie);
  assert(orderRes.status === 201, 'Order placement failed');
  const mainOrderId = orderRes.data.order_id;
  console.log(`  ✅ Step 5 completed: Order #${mainOrderId} placed!\n`);

  // 6. Step 6: As the seller, open order: see buyer details, move Confirmed -> Shipped -> Delivered
  console.log('▶ Step 6: Seller opens order, verifies details, moves Confirmed -> Shipped -> Delivered');
  const sellerOrdersRes = await api('/seller/orders', {}, sellerCookie);
  const teacherSellerOrder = sellerOrdersRes.data.orders.find((o) => o.order_id === mainOrderId);
  assert(teacherSellerOrder, 'Seller should see their part of the order');

  const sellerOrderDetail = await api(`/seller/orders/${teacherSellerOrder.id}`, {}, sellerCookie);
  assert(sellerOrderDetail.data.recipient === 'Teacher Student Buyer', 'Buyer recipient mismatch');
  assert(sellerOrderDetail.data.recipient_phone === '+374 77 999000', 'Buyer phone mismatch');

  // Move Placed -> Confirmed
  const confirmRes = await api(`/seller/orders/${teacherSellerOrder.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: 'confirmed' })
  }, sellerCookie);
  assert(confirmRes.status === 200, 'Confirm status failed');

  // Move Confirmed -> Shipped
  const shipRes = await api(`/seller/orders/${teacherSellerOrder.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: 'shipped' })
  }, sellerCookie);
  assert(shipRes.status === 200, 'Ship status failed');

  // Move Shipped -> Delivered
  const deliverRes = await api(`/seller/orders/${teacherSellerOrder.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: 'delivered' })
  }, sellerCookie);
  assert(deliverRes.status === 200, 'Delivered status failed');
  console.log('  ✅ Step 6 completed: Order successfully moved to Delivered!\n');

  // 7. Step 7: As buyer, see status history, leave review, verify product rating & seller revenue updated
  console.log('▶ Step 7: Buyer checks status history, leaves review, verifies rating & seller revenue');
  const buyerOrderDetail = await api(`/orders/${mainOrderId}`, {}, buyerCookie);
  const part = buyerOrderDetail.data.seller_orders.find((so) => so.id === teacherSellerOrder.id);
  assert(part.status === 'delivered', 'Seller order should be delivered');
  assert(part.status_history.length >= 4, 'Status history should contain all transition steps');

  // Leave review
  const reviewRes = await api(`/products/${demoProdId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rating: 5,
      body: 'Incredible gadget! Tested during demonstration, everything works flawlessly!'
    })
  }, buyerCookie);
  assert(reviewRes.status === 201, 'Review submission failed');

  // Verify product rating updated
  const updatedProd = await api(`/products/${demoProdId}`);
  assert(updatedProd.data.rating_avg === 5.0, `Expected 5.0 rating, got ${updatedProd.data.rating_avg}`);
  assert(updatedProd.data.rating_count === 1, `Expected 1 review count, got ${updatedProd.data.rating_count}`);

  // Verify seller overview revenue
  const sellerOverview = await api('/seller/overview', {}, sellerCookie);
  assert(sellerOverview.data.delivered_revenue_30d_amd >= 70000, 'Delivered revenue should reflect delivered orders');

  console.log('  ✅ Step 7 completed: Status history verified, review posted, rating & revenue updated!\n');

  await new Promise((resolve) => server.close(resolve));
  console.log('====================================================');
  console.log('   🎉 ALL 7 STEPS OF TEACHER DEMO SCRIPT PASSED!    ');
  console.log('====================================================');
}

runTeacherDemo().catch((err) => {
  console.error('Teacher demo fatal error:', err);
  process.exit(1);
});
