const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'shuka.sqlite');

let dbInstance = null;

function getDb(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }
  const db = new Database(customPath || DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

function runMigrations(db = getDb()) {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = db.prepare('SELECT id FROM _migrations WHERE filename = ?').get(file);
    if (!applied) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)').run(
          file,
          new Date().toISOString()
        );
      })();
      console.log(`Applied migration: ${file}`);
    }
  }
}

module.exports = {
  getDb,
  runMigrations,
  DB_PATH
};
