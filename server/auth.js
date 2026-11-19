const crypto = require('crypto');
const { getDb } = require('./db');
const { sendError } = require('./errors');

const SESSION_COOKIE_NAME = 'shuka_session';
const SESSION_MAX_AGE_DAYS = 30;

function createSession(userId, db = getDb()) {
  const token = crypto.randomBytes(32).toString('hex');
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, createdAt, expiresAt);

  return token;
}

function deleteSession(token, db = getDb()) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function getUserFromSession(token, db = getDb()) {
  if (!token) return null;
  const now = new Date().toISOString();
  const session = db.prepare(`
    SELECT s.user_id, s.expires_at, u.id, u.email, u.name, u.phone, u.store_name, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, now);

  if (!session) return null;

  return {
    id: session.id,
    email: session.email,
    name: session.name,
    phone: session.phone,
    store_name: session.store_name,
    is_seller: !!session.store_name,
    created_at: session.created_at
  };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
}

function authMiddleware(req, res, next) {
  const token = req.cookies[SESSION_COOKIE_NAME];
  req.user = getUserFromSession(token);
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'You must be signed in to access this resource.');
  }
  next();
}

function requireSeller(req, res, next) {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'You must be signed in.');
  }
  if (!req.user.store_name) {
    return sendError(res, 403, 'FORBIDDEN', 'Seller profile required.');
  }
  next();
}

module.exports = {
  SESSION_COOKIE_NAME,
  createSession,
  deleteSession,
  getUserFromSession,
  setSessionCookie,
  clearSessionCookie,
  authMiddleware,
  requireAuth,
  requireSeller
};
