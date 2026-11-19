const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { authMiddleware } = require('./auth');
const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const sellerRoutes = require('./routes/seller');
const reviewRoutes = require('./routes/reviews');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

// Populate req.user from session cookie if present
app.use(authMiddleware);

// Static uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/auth', authRoutes);
app.use('/', catalogRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/seller', sellerRoutes);
app.use('/', reviewRoutes);

// Backup endpoint / admin helper as mentioned in Page 9:
// "A daily backup copies the database with VACUUM INTO or the .backup command"
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend build if exists
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.startsWith('/uploads') &&
        !req.path.startsWith('/auth') &&
        !req.path.startsWith('/categories') &&
        !req.path.startsWith('/products') &&
        !req.path.startsWith('/cart') &&
        !req.path.startsWith('/orders') &&
        !req.path.startsWith('/seller')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Global 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found.`
    }
  });
});

module.exports = app;
