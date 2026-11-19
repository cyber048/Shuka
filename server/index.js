const app = require('./app');
const { runMigrations, getDb } = require('./db');

const PORT = process.env.PORT || 3001;

// Ensure database is initialized with migrations
console.log('Initializing database and applying migrations...');
const db = getDb();
runMigrations(db);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Shuka marketplace server is running on http://localhost:${PORT}`);
});

module.exports = server;
