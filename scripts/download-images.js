const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getDb } = require('../server/db');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Curated high quality photo URLs for products
const photoUrls = [
  // Electronics
  'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80', // Earbuds
  'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80', // Keyboard
  'https://images.unsplash.com/photo-1622445262464-84b14e3245b3?w=600&q=80', // Charger
  'https://images.unsplash.com/photo-1609592807908-6d2f3923ef1f?w=600&q=80', // Power bank
  'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600&q=80', // Web camera
  'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&q=80', // Mouse
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80', // Hub
  'https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&q=80', // Bulb
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', // Headphones
  'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&q=80', // Fitness tracker

  // Handmade & Crafts
  'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80', // Pomegranate ceramic
  'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&q=80', // Carpet rug
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=80', // Wood carving
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80', // Silver pendant
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80', // Ceramic pitcher
  'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&q=80', // Candles
  'https://images.unsplash.com/photo-1528458983944-ff95e7c62bb1?w=600&q=80', // Linen runner
  'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=600&q=80', // Leather journal
  'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?w=600&q=80', // Obsidian stone
  'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=600&q=80', // Khachkar plaque

  // Food & Delicacies
  'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=600&q=80', // Dried fruit
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80', // Honey
  'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600&q=80', // Sujukh
  'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&q=80', // Thyme tea
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', // Walnut jam
  'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80', // Pomegranate molasses
  'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&q=80', // Chechil cheese
  'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80', // Spices mix
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80', // Roasted kernels
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80', // Pomegranate vinegar

  // Home & Kitchen
  'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&q=80', // Coffee Jazzve
  'https://images.unsplash.com/photo-1584990347449-399c62391b10?w=600&q=80', // Skillet pan
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80', // Coffee grinder
  'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&q=80', // Cutting board
  'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=600&q=80', // Chef knife
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80', // Clay dish

  // Books
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80', // Cookbook
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80', // Architecture album
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&q=80', // Calligraphy notebook

  // Sports
  'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80', // Trekking poles
  'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80', // Water bottle
  'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80'  // Camping stove
];

async function downloadAndProcessImages() {
  console.log('Downloading and optimizing 42 high-resolution product photos...');
  const db = getDb();
  const products = db.prepare('SELECT id, title FROM products ORDER BY id ASC').all();

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const url = photoUrls[i % photoUrls.length];
    const filename = `real-prod-${prod.id}.webp`;
    const filepath = path.join(uploadsDir, filename);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Optimize & convert to WebP
      await sharp(buffer)
        .resize(600, 600, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(filepath);

      const webPath = `/uploads/${filename}`;

      // Update position 1 image for this product
      db.prepare(`
        INSERT INTO product_images (product_id, file_path, position)
        VALUES (?, ?, 1)
        ON CONFLICT (product_id, position) DO UPDATE SET file_path = excluded.file_path
      `).run(prod.id, webPath);

      console.log(`[${i + 1}/${products.length}] Updated photo for: ${prod.title}`);
    } catch (err) {
      console.warn(`Failed downloading image for ${prod.title}: ${err.message}`);
    }
  }

  console.log('--- All product images updated successfully! ---');
}

downloadAndProcessImages().catch(console.error);
