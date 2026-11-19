-- Migration 001: Initial Schema for Shuka Marketplace

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  store_name TEXT UNIQUE,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_amd INTEGER NOT NULL CHECK (price_amd > 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  rating_avg REAL NOT NULL DEFAULT 0.0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_products_category_published_created 
  ON products (category_id, is_published, created_at);
CREATE INDEX IF NOT EXISTS idx_products_seller 
  ON products (seller_id);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  file_path TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE (product_id, position)
) STRICT;

CREATE TABLE IF NOT EXISTS cart_items (
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_when_added INTEGER NOT NULL,
  PRIMARY KEY (user_id, product_id)
) STRICT;

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  recipient TEXT NOT NULL,
  phone TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  apartment TEXT NOT NULL,
  note TEXT,
  total_amd INTEGER NOT NULL,
  request_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS seller_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('placed', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal_amd INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (order_id, seller_id)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_seller_orders_seller_status 
  ON seller_orders (seller_id, status);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_order_id INTEGER NOT NULL REFERENCES seller_orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  unit_price_amd INTEGER NOT NULL,
  quantity INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_order_id INTEGER NOT NULL REFERENCES seller_orders(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (product_id, buyer_id)
) STRICT;

-- Sessions table for httpOnly cookie authentication
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
) STRICT;
