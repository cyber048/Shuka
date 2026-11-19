# Shuka (Շուկա) — Amazon-Style Armenian Marketplace

Shuka is a complete, production-grade local marketplace built for Armenia. It features a unified frontend and backend process powered by an ACID-compliant SQLite database with strict concurrency and multi-seller order splitting.

---

## 🚀 Quick Start (One Command)

### Prerequisites
- Node.js >= 18 (Tested on Node 22)
- npm

### 1. Install & Build
```bash
# In the project root:
npm install
npm run build
```

### 2. Seed Database
```bash
npm run seed
```
This applies numbered migrations and seeds:
- 6 categories
- 3 active sellers with custom store names and phones
- 42 products across categories with real WebP images
- 2 demo buyers

### 3. Start the Application
```bash
npm start
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **Seller 1** | `ararat.tech@shuka.am` | `password123` | Store: *Ararat Electronics* |
| **Seller 2** | `ani.crafts@shuka.am` | `password123` | Store: *Ani Handmade & Crafts* |
| **Seller 3** | `sasun.gourmet@shuka.am` | `password123` | Store: *Sasun Armenian Delicacies* |
| **Buyer 1** | `buyer1@shuka.am` | `password123` | Karen Petrosyan |
| **Buyer 2** | `buyer2@shuka.am` | `password123` | Lilit Grigoryan |

*Any registered user can become a seller at any time by clicking "Sell on Shuka" and providing a store name and phone.*

---

## 🧪 Acceptance & Break-It Tests

The system passes all 9 required "Break-it" acceptance tests and the 7-step Teacher Demo Script:

```bash
# Run all 9 concurrency and security acceptance tests:
npm run test:break-it

# Run the 7-step Teacher Demo flow:
node tests/teacher-demo.test.js
```

### Verified Test Cases:
1. **Last units (Concurrency & Overselling):** 30 concurrent checkout requests for stock 3 result in exactly 3 successful orders and 27 `409 Conflict` responses with 0 remaining stock and zero `SQLITE_BUSY` errors.
2. **Double click (Idempotency):** Duplicate checkouts with identical `request_key` return the original order without creating duplicate database records.
3. **Price changed:** If a seller modifies product price while it is in a buyer's cart, checkout halts with `409 Conflict` and prompts review of the new price.
4. **Old order after edit (Snapshotting):** Past orders preserve original title and purchase unit price even after subsequent seller edits.
5. **Multi-tenant scoping:** Users cannot access orders belonging to other buyers or sellers (returns `403` or `404`).
6. **State machine enforcement:** Invalid status transitions (e.g. `placed` straight to `delivered` or cancelling a `shipped` order) return `409 Conflict`.
7. **Cancel returns stock:** Cancelling an order restores inventory in the same atomic transaction.
8. **Foreign keys:** `PRAGMA foreign_keys = ON` rejects orphan inserts.
9. **Bad upload rejection:** File size limits and Sharp image validation reject oversized (>15MB) files and disguised non-image files.

---

## 🏛️ Architecture & Data Model

- **Engine:** Single server process serving REST JSON API and Vite React SPA bundle.
- **Database:** SQLite with `STRICT` mode enabled for all 10 tables, `PRAGMA journal_mode = WAL`, and `busy_timeout = 5000`.
- **Currency:** All financial values stored as integer AMD (`price_amd`, `subtotal_amd`, `total_amd`), never floating-point `REAL`.
- **Image Pipeline:** Uploads processed via `sharp` and converted into optimized WebP formats with thumbnails stored on disk at `/uploads`.
- **Payment:** Cash on delivery (no external payment gateways).

---

## 🌐 Production Deployment

Deployable on any platform supporting a **persistent volume** (e.g., Fly.io, Railway with a volume, Render disk, or VPS with Caddy/Nginx).

### Daily Backup
To take an atomic backup without interrupting write transactions:
```bash
sqlite3 shuka.sqlite "VACUUM INTO 'backup-$(date +%Y%m%d).sqlite'"
```
