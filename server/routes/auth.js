const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { sendError } = require('../errors');
const {
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth
} = require('../auth');

const router = express.Router();

// POST /auth/register
router.post('/register', (req, res) => {
  const { email, password, name, phone } = req.body || {};

  if (!email || !password || !name || !phone) {
    return sendError(res, 400, 'INVALID_INPUT', 'All fields (email, password, name, phone) are required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendError(res, 400, 'INVALID_EMAIL', 'Please provide a valid email address.');
  }

  if (password.length < 6) {
    return sendError(res, 400, 'WEAK_PASSWORD', 'Password must be at least 6 characters long.');
  }

  const db = getDb();

  // Check email uniqueness
  const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
  if (existing) {
    return sendError(res, 409, 'EMAIL_EXISTS', 'An account with this email already exists.');
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  try {
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, phone, store_name, created_at)
      VALUES (?, ?, ?, ?, NULL, ?)
    `).run(email, passwordHash, name.trim(), phone.trim(), now);

    const userId = result.lastInsertRowid;
    const token = createSession(userId, db);
    setSessionCookie(res, token);

    const user = {
      id: Number(userId),
      email,
      name: name.trim(),
      phone: phone.trim(),
      store_name: null,
      is_seller: false,
      created_at: now
    };

    return res.status(201).json(user);
  } catch (err) {
    console.error('Registration error:', err);
    return sendError(res, 500, 'SERVER_ERROR', 'Could not register user.');
  }
});

// POST /auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return sendError(res, 400, 'INVALID_INPUT', 'Email and password are required.');
  }

  const db = getDb();
  const userRow = db.prepare(`
    SELECT id, email, password_hash, name, phone, store_name, created_at
    FROM users
    WHERE email = ? COLLATE NOCASE
  `).get(email);

  if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
    return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const token = createSession(userRow.id, db);
  setSessionCookie(res, token);

  return res.json({
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    phone: userRow.phone,
    store_name: userRow.store_name,
    is_seller: !!userRow.store_name,
    created_at: userRow.created_at
  });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  const token = req.cookies.shuka_session;
  deleteSession(token);
  clearSessionCookie(res);
  return res.json({ success: true });
});

// GET /me
router.get('/me', requireAuth, (req, res) => {
  return res.json(req.user);
});

// PATCH /me
router.patch('/me', requireAuth, (req, res) => {
  const { name, phone } = req.body || {};
  if (!name && !phone) {
    return sendError(res, 400, 'INVALID_INPUT', 'Nothing to update.');
  }

  const db = getDb();
  const current = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(req.user.id);

  const updatedName = name !== undefined ? name.trim() : current.name;
  const updatedPhone = phone !== undefined ? phone.trim() : current.phone;

  db.prepare(`
    UPDATE users
    SET name = ?, phone = ?
    WHERE id = ?
  `).run(updatedName, updatedPhone, req.user.id);

  const updatedUser = {
    ...req.user,
    name: updatedName,
    phone: updatedPhone
  };

  return res.json(updatedUser);
});

module.exports = router;
