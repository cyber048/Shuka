const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const { getDb, runMigrations } = require('../server/db');

async function seed() {
  console.log('--- Starting Database Seeding ---');
  const db = getDb();
  runMigrations(db);

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Clear existing data cleanly in correct order of foreign keys
  console.log('Clearing existing tables...');
  db.exec(`
    DELETE FROM reviews;
    DELETE FROM status_history;
    DELETE FROM order_items;
    DELETE FROM seller_orders;
    DELETE FROM orders;
    DELETE FROM cart_items;
    DELETE FROM product_images;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);

  const passwordHash = bcrypt.hashSync('password123', 10);
  const now = new Date().toISOString();

  // 1. Categories
  console.log('Seeding categories...');
  const categoriesData = [
    { name: 'Electronics & Tech', slug: 'electronics' },
    { name: 'Home & Kitchen', slug: 'home-kitchen' },
    { name: 'Armenian Food & Delicacies', slug: 'food-delicacies' },
    { name: 'Handmade & Crafts', slug: 'handmade-crafts' },
    { name: 'Books & Stationery', slug: 'books' },
    { name: 'Sports & Outdoors', slug: 'sports' }
  ];

  const categoryMap = {};
  const insertCat = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  for (const cat of categoriesData) {
    const res = insertCat.run(cat.name, cat.slug);
    categoryMap[cat.slug] = Number(res.lastInsertRowid);
  }

  // 2. Users: 3 Sellers + 2 Demo Buyers
  console.log('Seeding users (3 sellers, 2 demo buyers)...');
  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, phone, store_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seller1Id = Number(insertUser.run(
    'ararat.tech@shuka.am',
    passwordHash,
    'Armen Harutyunyan',
    '+374 91 123456',
    'Ararat Electronics',
    now
  ).lastInsertRowid);

  const seller2Id = Number(insertUser.run(
    'ani.crafts@shuka.am',
    passwordHash,
    'Ani Sargsyan',
    '+374 93 234567',
    'Ani Handmade & Crafts',
    now
  ).lastInsertRowid);

  const seller3Id = Number(insertUser.run(
    'sasun.gourmet@shuka.am',
    passwordHash,
    'David Gevorgyan',
    '+374 94 345678',
    'Sasun Armenian Delicacies',
    now
  ).lastInsertRowid);

  const buyer1Id = Number(insertUser.run(
    'buyer1@shuka.am',
    passwordHash,
    'Karen Petrosyan',
    '+374 77 456789',
    null,
    now
  ).lastInsertRowid);

  const buyer2Id = Number(insertUser.run(
    'buyer2@shuka.am',
    passwordHash,
    'Lilit Grigoryan',
    '+374 98 567890',
    null,
    now
  ).lastInsertRowid);

  function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  // Helper to generate a placeholder image with Sharp
  async function generateProductImage(filename, title, colorHex) {
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) return `/uploads/${filename}`;

    const safeTitle = escapeXml(title.substring(0, 26));
    const svg = `
      <svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${colorHex}" />
        <rect x="30" y="30" width="540" height="540" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.3" rx="16" />
        <text x="50%" y="45%" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
          ${safeTitle}
        </text>
        <text x="50%" y="55%" font-family="system-ui, sans-serif" font-size="18" fill="#ffffff" opacity="0.8" text-anchor="middle" dominant-baseline="middle">
          Shuka Marketplace
        </text>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .webp({ quality: 85 })
      .toFile(filePath);

    return `/uploads/${filename}`;
  }

  // 3. 42 Products across categories and sellers
  console.log('Generating 42 products with images...');
  const products = [
    // Electronics (Seller 1 - Ararat Electronics)
    { title: 'Wireless Bluetooth Earbuds Pro', cat: 'electronics', seller: seller1Id, price: 18500, stock: 15, desc: 'High quality active noise cancellation with 24 hours battery life.' },
    { title: 'Mechanical Gaming Keyboard RGB', cat: 'electronics', seller: seller1Id, price: 29000, stock: 8, desc: 'Tactile switches with customizable backlighting and wrist rest.' },
    { title: 'Ultra-Fast 65W GaN Charger', cat: 'electronics', seller: seller1Id, price: 12000, stock: 25, desc: 'Compact dual USB-C and USB-A power adapter for laptops and phones.' },
    { title: 'Portable 20000mAh Power Bank', cat: 'electronics', seller: seller1Id, price: 15500, stock: 20, desc: 'High capacity power bank with fast charging support.' },
    { title: '4K Ultra HD Web Camera with Mic', cat: 'electronics', seller: seller1Id, price: 24000, stock: 6, desc: 'Crisp video calls for streaming and remote work.' },
    { title: 'Ergonomic Vertical Mouse', cat: 'electronics', seller: seller1Id, price: 9500, stock: 12, desc: 'Reduces wrist strain during long working hours.' },
    { title: 'USB-C Multiport Hub 7-in-1', cat: 'electronics', seller: seller1Id, price: 16000, stock: 14, desc: 'HDMI 4K, 3x USB 3.0, SD card reader, 100W PD passthrough.' },
    { title: 'Smart Home LED RGB Bulb E27', cat: 'electronics', seller: seller1Id, price: 4500, stock: 30, desc: 'WiFi controlled color bulb compatible with Google Home & Alexa.' },
    { title: 'Noise Cancelling Over-Ear Headphones', cat: 'electronics', seller: seller1Id, price: 42000, stock: 5, desc: 'Studio quality sound with plush memory foam ear cushions.' },
    { title: 'Limited Stock Smart Fitness Tracker', cat: 'electronics', seller: seller1Id, price: 19900, stock: 3, desc: 'Heart rate, sleep tracking, and step counter. Only 3 units available!' },

    // Handmade & Crafts (Seller 2 - Ani Handmade & Crafts)
    { title: 'Traditional Armenian Pomegranate Ceramic', cat: 'handmade-crafts', seller: seller2Id, price: 8500, stock: 10, desc: 'Handcrafted ceramic pomegranate with Armenian floral motifs.' },
    { title: 'Handwoven Wool Carpet Rug (Small)', cat: 'handmade-crafts', seller: seller2Id, price: 45000, stock: 4, desc: 'Authentic Lori-style ornaments woven from 100% natural Armenian wool.' },
    { title: 'Wooden Carved Cross-Stone (Khachkar)', cat: 'handmade-crafts', seller: seller2Id, price: 14000, stock: 7, desc: 'Detailed walnut wood carving made by local artisans.' },
    { title: 'Handmade Silver Pomegranate Pendant', cat: 'handmade-crafts', seller: seller2Id, price: 21000, stock: 9, desc: '925 sterling silver jewelry inspired by ancient Armenian symbols.' },
    { title: 'Ceramic Wine Pitcher & 2 Cups Set', cat: 'handmade-crafts', seller: seller2Id, price: 18000, stock: 5, desc: 'Terracotta glazed wine set designed for serving Areni wine.' },
    { title: 'Natural Beeswax Decorative Candles Set', cat: 'handmade-crafts', seller: seller2Id, price: 5500, stock: 18, desc: 'Set of 3 honey-scented rolled beeswax candles from Tavush.' },
    { title: 'Embroidered Linen Table Runner', cat: 'handmade-crafts', seller: seller2Id, price: 12500, stock: 6, desc: 'Marash stitch traditional hand embroidery on natural linen.' },
    { title: 'Leather Bound Handmade Journal', cat: 'handmade-crafts', seller: seller2Id, price: 9000, stock: 11, desc: 'Genuine leather diary with handmade recycled craft paper.' },
    { title: 'Obsidian Stone Pocket Souvenir', cat: 'handmade-crafts', seller: seller2Id, price: 3500, stock: 40, desc: 'Polished volcanic glass mined near Mount Hatis.' },
    { title: 'Handmade Khachkar Wall Plaque (Rare)', cat: 'handmade-crafts', seller: seller2Id, price: 32000, stock: 2, desc: 'Exclusive carved tuff stone plaque. Only 2 left in stock!' },

    // Food & Delicacies (Seller 3 - Sasun Armenian Delicacies)
    { title: 'Premium Armenian Dried Fruit Box (500g)', cat: 'food-delicacies', seller: seller3Id, price: 6500, stock: 25, desc: 'Sun-dried apricots, peaches, plums, and candied walnut treats.' },
    { title: 'Mountain Flower Raw Honey (1kg)', cat: 'food-delicacies', seller: seller3Id, price: 7200, stock: 18, desc: 'Pure unpasteurized honey harvested in the alpine meadows of Lori.' },
    { title: 'Traditional Walnut Sujukh (Sweet Sujukh)', cat: 'food-delicacies', seller: seller3Id, price: 3800, stock: 35, desc: 'Armenian sharots made of whole walnuts dipped in grape juice syrup.' },
    { title: 'Wild Thyme Herb Tea (Urts)', cat: 'food-delicacies', seller: seller3Id, price: 1800, stock: 50, desc: 'Hand-picked organic wild thyme from Aragats highlands.' },
    { title: 'Preserved Green Walnut Jam (450g)', cat: 'food-delicacies', seller: seller3Id, price: 2900, stock: 22, desc: 'Traditional fragrant walnut preserve with cloves and cardamom.' },
    { title: 'Homemade Pomegranate Molasses (350ml)', cat: 'food-delicacies', seller: seller3Id, price: 3400, stock: 16, desc: '100% natural thick pomegranate reduction for marinades and salads.' },
    { title: 'Artisanal Chechil Cheese (500g)', cat: 'food-delicacies', seller: seller3Id, price: 3600, stock: 14, desc: 'Smoked braided string cheese made in Shirak province.' },
    { title: 'Basturma Spices Blend (Chaman Mix)', cat: 'food-delicacies', seller: seller3Id, price: 1500, stock: 30, desc: 'Authentic seasoning blend with blue fenugreek, garlic, and paprika.' },
    { title: 'Roasted Salted Salt Lake Apricot Kernels', cat: 'food-delicacies', seller: seller3Id, price: 2200, stock: 20, desc: 'Crispy and savory roasted apricot pits from Ararat valley.' },
    { title: 'Vintage Reserve Pomegranate Wine Vinegar', cat: 'food-delicacies', seller: seller3Id, price: 4200, stock: 10, desc: 'Aged fruity vinegar crafted from Areni grapes and pomegranates.' },

    // Home & Kitchen
    { title: 'Armenian Copper Jazzve (Coffee Pot)', cat: 'home-kitchen', seller: seller1Id, price: 7500, stock: 15, desc: 'Hand-hammered solid copper Turkish/Armenian coffee maker with wooden handle.' },
    { title: 'Cast Iron Skillet Pan 26cm', cat: 'home-kitchen', seller: seller1Id, price: 16500, stock: 10, desc: 'Pre-seasoned heavy duty pan perfect for roasting and searing.' },
    { title: 'Electric Burr Coffee Grinder', cat: 'home-kitchen', seller: seller1Id, price: 22000, stock: 7, desc: 'Precise ground size control for espresso, jazzve, and pour-over.' },
    { title: 'Bamboo Cutting Board with Juice Groove', cat: 'home-kitchen', seller: seller2Id, price: 6200, stock: 20, desc: 'Durable eco-friendly antibacterial kitchen chopping block.' },
    { title: 'Stainless Steel Chef Knife 8-inch', cat: 'home-kitchen', seller: seller1Id, price: 11000, stock: 13, desc: 'Razor sharp German steel blade with ergonomic balance.' },
    { title: 'Clay Baking Dish for Harissa & Khorovats', cat: 'home-kitchen', seller: seller2Id, price: 13500, stock: 8, desc: 'Authentic refractory earthenware for slow-cooked Armenian dishes.' },

    // Books & Stationery
    { title: 'Armenian Cuisine Masterclass Book', cat: 'books', seller: seller3Id, price: 9500, stock: 12, desc: 'Over 120 traditional and modern recipes with colored photos.' },
    { title: 'Yerevan Architectural Heritage Album', cat: 'books', seller: seller2Id, price: 14000, stock: 6, desc: 'Hardcover illustrated photographic history of pink tuff city.' },
    { title: 'Armenian Calligraphy Practice Notebook', cat: 'books', seller: seller2Id, price: 3200, stock: 25, desc: 'Guided alphabet writing book designed by typography masters.' },

    // Sports & Outdoors
    { title: 'Hiking Trekking Poles (Pair)', cat: 'sports', seller: seller1Id, price: 14500, stock: 9, desc: 'Lightweight aluminum shock-absorbing poles for Armenian mountain trails.' },
    { title: 'Thermal Stainless Water Bottle 1L', cat: 'sports', seller: seller1Id, price: 6800, stock: 22, desc: 'Keeps drinks cold for 24h or hot for 12h on day hikes.' },
    { title: 'Compact Camping Gas Stove', cat: 'sports', seller: seller1Id, price: 8900, stock: 11, desc: 'Ultralight folding burner compatible with standard isobutane canisters.' }
  ];

  const colors = [
    '#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', 
    '#0891b2', '#4f46e5', '#ca8a04', '#059669', '#7c3aed'
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (
      seller_id, category_id, title, description, price_amd, stock, is_published, rating_avg, rating_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, 0.0, 0, ?, ?)
  `);

  const insertImage = db.prepare(`
    INSERT INTO product_images (product_id, file_path, position)
    VALUES (?, ?, ?)
  `);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const catId = categoryMap[p.cat];
    const color = colors[i % colors.length];

    const res = insertProduct.run(
      p.seller,
      catId,
      p.title,
      p.desc,
      p.price,
      p.stock,
      now,
      now
    );

    const prodId = Number(res.lastInsertRowid);

    // Create 1 to 3 images for each product (prioritize real photos if available)
    const realImgFile = `real-prod-${prodId}.webp`;
    const realImgPath = path.join(uploadsDir, realImgFile);
    let img1Path;
    if (fs.existsSync(realImgPath)) {
      img1Path = `/uploads/${realImgFile}`;
    } else {
      const img1File = `seed-prod-${prodId}-main.webp`;
      img1Path = await generateProductImage(img1File, p.title, color);
    }
    insertImage.run(prodId, img1Path, 1);

    if (i % 2 === 0) {
      const img2File = `seed-prod-${prodId}-alt1.webp`;
      const img2Path = await generateProductImage(img2File, `${p.title} (Detail)`, '#475569');
      insertImage.run(prodId, img2Path, 2);
    }
  }

  // 4. Create one initial delivered order so we can seed reviews and satisfy the review requirement
  console.log('Seeding demo completed order and reviews...');
  const firstProd = db.prepare('SELECT id, price_amd, title, seller_id FROM products LIMIT 1').get();

  const demoOrder = db.prepare(`
    INSERT INTO orders (
      buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 days'))
  `).run(
    buyer1Id,
    'Karen Petrosyan',
    '+374 77 456789',
    'Yerevan',
    'Yerevan',
    'Abovyan St',
    'Bldg 12, Apt 4',
    'Please ring the doorbell',
    firstProd.price_amd,
    'seed-req-key-001'
  );

  const demoOrderId = Number(demoOrder.lastInsertRowid);

  const demoSellerOrder = db.prepare(`
    INSERT INTO seller_orders (
      order_id, seller_id, status, subtotal_amd, updated_at
    ) VALUES (?, ?, 'delivered', ?, datetime('now', '-2 days'))
  `).run(demoOrderId, firstProd.seller_id, firstProd.price_amd);

  const demoSellerOrderId = Number(demoSellerOrder.lastInsertRowid);

  db.prepare(`
    INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity)
    VALUES (?, ?, ?, ?, 1)
  `).run(demoSellerOrderId, firstProd.id, firstProd.title, firstProd.price_amd);

  db.prepare(`
    INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
    VALUES (?, NULL, 'placed', ?, datetime('now', '-5 days'))
  `).run(demoSellerOrderId, buyer1Id);

  db.prepare(`
    INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
    VALUES (?, 'placed', 'confirmed', ?, datetime('now', '-4 days'))
  `).run(demoSellerOrderId, firstProd.seller_id);

  db.prepare(`
    INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
    VALUES (?, 'confirmed', 'shipped', ?, datetime('now', '-3 days'))
  `).run(demoSellerOrderId, firstProd.seller_id);

  db.prepare(`
    INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
    VALUES (?, 'shipped', 'delivered', ?, datetime('now', '-2 days'))
  `).run(demoSellerOrderId, firstProd.seller_id);

  // Seed review for this delivered product
  db.prepare(`
    INSERT INTO reviews (product_id, buyer_id, rating, body, created_at)
    VALUES (?, ?, 5, 'Excellent quality! Arrived fast and works flawlessly. Highly recommend!', datetime('now', '-1 days'))
  `).run(firstProd.id, buyer1Id);

  db.prepare(`
    UPDATE products 
    SET rating_avg = 5.0, rating_count = 1 
    WHERE id = ?
  `).run(firstProd.id);

  console.log('--- Database Seeding Completed Successfully! ---');
  console.log(`Demo Buyers:
  - buyer1@shuka.am / password123
  - buyer2@shuka.am / password123
Sellers:
  - ararat.tech@shuka.am / password123
  - ani.crafts@shuka.am / password123
  - sasun.gourmet@shuka.am / password123
`);
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = { seed };
