# WAVE 1 — VERTICAL SLICES DETAIL

**Wave:** 1 of 9  
**Status:** Foundation — No Dependencies  
**Slices:** 4  
**Max Parallel Developers:** 4  
**Branch prefix:** `feature/vs-0X-*`  
**Merge target:** `main`  
**References:** WAVE_EXECUTION_PLAN v1.0

> All 4 slices start on Day 1. None depend on each other. All 4 must be merged and passing before Wave 2 begins.

---

## Wave 1 Slices at a Glance

| Slice | Name | DB Tables | UAT Cases | Est. Days |
|---|---|---|---|---|
| VS-01 | Category tree API + nav render | `CATEGORY` | TC-01, TC-02 | 2 |
| VS-03 | Product detail page — static shell | `PRODUCT`, `PRODUCT_IMAGE` | TC-12 | 2–3 |
| VS-05 | Search results page | `PRODUCT`, `TAG`, `PRODUCT_TAG` | TC-04, TC-05 | 2 |
| VS-08 | Email registration | `USER` | TC-48 | 1–2 |

---

---

## VS-01 — Category Tree API + Nav Render

**Branch:** `feature/vs-01-category-tree`  
**Layer:** Backend API + Frontend nav component  
**DB Tables:** `CATEGORY` (read + seed)

### Goal
A customer opens the site and sees a working navigation menu populated from real category data in the database.

### Database Schema (new table)

```sql
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  parent_id   INT REFERENCES categories(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  banner_image TEXT,
  meta_title  VARCHAR(160),
  meta_desc   VARCHAR(320),
  display_order INT DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Seed Data (minimum to test)

```
Men's Wear (root)
  ├── Formal Shirts
  ├── Trousers
  └── Ethnic Wear
Women's Wear (root)
  ├── Sarees
  ├── Kurtis
  └── Salwar Suits
Kids' Wear (root)
Fabrics & Accessories (root)
```

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/categories` | Public | Full category tree (nested JSON) |
| `GET` | `/api/categories/:slug` | Public | Single category by slug |

**GET /api/categories — Response shape**
```json
[
  {
    "id": 1,
    "name": "Men's Wear",
    "slug": "mens-wear",
    "banner_image": null,
    "children": [
      { "id": 5, "name": "Formal Shirts", "slug": "formal-shirts", "children": [] }
    ]
  }
]
```

- Only returns `active = true` categories.
- Sorted by `display_order ASC`, then `name ASC`.
- Max 2 levels deep for now (root → sub-category). Deeper nesting not needed per FDD.

### Frontend

- Header nav component reads `/api/categories`.
- Root categories = top-level nav items.
- Sub-categories = dropdown on hover (desktop) / accordion (mobile).
- URL pattern: `/[root-slug]/[sub-slug]` — navigation links only; listing page is VS-02 (Wave 2).
- Clicking a category navigates to the URL. Page shows a placeholder ("Products coming in Wave 2") until VS-02 is built.

### Acceptance Criteria (from UAT TC-01, TC-02)

- [ ] Homepage nav shows all active root categories.
- [ ] Hovering a root category shows its sub-categories.
- [ ] Clicking a sub-category navigates to `/mens-wear/formal-shirts`.
- [ ] Breadcrumb on that URL shows: `Home › Men's Wear › Formal Shirts`.
- [ ] Inactive categories do not appear in nav.
- [ ] API responds in < 300 ms (data is small; no pagination needed).

### Definition of Done

- Migration applied.
- Seed data loaded.
- API returns correct nested JSON.
- Nav renders from real API data (no hardcoded strings).
- PR passes TC-01 and TC-02.
- Merged to `main`.

---

---

## VS-03 — Product Detail Page (Static Shell)

**Branch:** `feature/vs-03-pdp-shell`  
**Layer:** Backend API + Frontend PDP page  
**DB Tables:** `PRODUCT`, `PRODUCT_IMAGE` (read + seed)

### Goal
A customer can open a product URL and see the product name, description, price, and images. No variants yet (that is VS-04, Wave 2).

### Database Schema (new tables)

```sql
CREATE TABLE products (
  id                SERIAL PRIMARY KEY,
  category_id       INT REFERENCES categories(id),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL UNIQUE,
  short_description TEXT,
  full_description  TEXT,
  base_price        NUMERIC(10,2) NOT NULL,
  sale_price        NUMERIC(10,2),
  gst_rate          NUMERIC(4,2) DEFAULT 12.00,
  status            VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft','active','archived')),
  meta_title        VARCHAR(160),
  meta_description  VARCHAR(320),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_images (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id    INT,                    -- NULL = shared; FK added in VS-04
  url           TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_primary    BOOLEAN DEFAULT FALSE
);
```

> `variant_id` column added now as nullable; the FK constraint to `product_variants` is added in VS-04 migration. This avoids a migration conflict between Wave 1 and Wave 2.

### Seed Data (minimum to test)

3 active products with at least 2 images each, spread across categories from VS-01.

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/products/:slug` | Public | Product detail |

**Response shape**
```json
{
  "id": 1,
  "name": "Banarasi Silk Saree",
  "slug": "banarasi-silk-saree-red",
  "category": { "id": 6, "name": "Sarees", "slug": "sarees" },
  "short_description": "...",
  "full_description": "...",
  "base_price": "2499.00",
  "sale_price": "1999.00",
  "gst_rate": "12.00",
  "images": [
    { "url": "https://...", "is_primary": true, "display_order": 0 }
  ],
  "meta_title": "...",
  "meta_description": "..."
}
```

- Returns 404 if `status != 'active'`.
- Images sorted by `display_order ASC`.

### Frontend

- URL: `/[category-slug]/[product-slug]`
- Image gallery: primary image large, thumbnails below. Click thumbnail → swap main image.
- Price: show `sale_price` with `base_price` struck through if `sale_price` is set.
- Display price inclusive of GST: `display_price = price * (1 + gst_rate/100)` — show both ex-GST and inclusive.
- Breadcrumb: `Home › [Category] › [Product Name]`
- "Add to Cart" button renders but is **disabled** with tooltip "Select a variant" — variants come in VS-04.
- SEO: `<title>` = `meta_title`, `<meta name="description">` = `meta_description`. JSON-LD Product schema injected.
- No reviews section yet (VS-43, Wave 3).

### Acceptance Criteria (from UAT TC-12)

- [ ] PDP loads at `/[cat-slug]/[product-slug]`.
- [ ] Images display; clicking a thumbnail swaps the main image.
- [ ] Price shows with GST note.
- [ ] Breadcrumb is correct.
- [ ] `<title>` and `<meta name="description">` match configured SEO fields.
- [ ] Product schema present in page source (JSON-LD).
- [ ] Non-active product slug returns 404.

### Definition of Done

- Migration applied.
- Seed data loaded.
- API returns correct shape with images.
- PDP renders from real API (no hardcoded data).
- PR passes TC-12.
- Merged to `main`.

---

---

## VS-05 — Search Results Page

**Branch:** `feature/vs-05-search-results`  
**Layer:** Backend API + Frontend search results page  
**DB Tables:** `PRODUCT`, `TAG`, `PRODUCT_TAG` (read + seed tags)

### Goal
A customer types a search query and sees a page of matching products.

### Database Schema (new tables)

```sql
CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE product_tags (
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
```

> `products` table already created in VS-03. VS-05 only adds `tags` and `product_tags`.

### Search Strategy

Use PostgreSQL full-text search — no external search engine needed at this scale.

```sql
-- Search across name, short_description, and tag names
SELECT DISTINCT p.*
FROM products p
LEFT JOIN product_tags pt ON pt.product_id = p.id
LEFT JOIN tags t ON t.id = pt.tag_id
WHERE p.status = 'active'
  AND (
    to_tsvector('english', p.name || ' ' || COALESCE(p.short_description,'') || ' ' || COALESCE(t.name,''))
    @@ plainto_tsquery('english', $1)
  )
ORDER BY p.created_at DESC
LIMIT 20 OFFSET $2;
```

Add a GIN index on the tsvector in the migration for performance.

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search?q=kurti&page=1` | Public | Full-text search results |

**Response shape**
```json
{
  "query": "kurti",
  "total": 14,
  "page": 1,
  "per_page": 20,
  "results": [
    {
      "id": 3,
      "name": "Cotton Kurti",
      "slug": "cotton-kurti-blue",
      "base_price": "799.00",
      "sale_price": null,
      "primary_image": "https://...",
      "category": { "slug": "kurtis", "name": "Kurtis" }
    }
  ]
}
```

- Empty `q` param → return HTTP 400 "Query required."
- No results → return `results: []`, HTTP 200 (not 404).

### Frontend

- Search bar in header → on submit navigates to `/search?q=[query]`.
- Results page reads `q` from URL and calls `/api/search`.
- Shows product cards (image, name, price, category badge).
- "X results for [query]" heading.
- Zero-results state: "No products found for '[query]'" + link "Browse all products".
- Pagination if `total > 20`.
- No filters on this page — filters are VS-07 (Wave 3), applied to category listings, not search.
- Autocomplete is VS-06 (Wave 2) — the search bar here has no dropdown yet.

### Acceptance Criteria (from UAT TC-04, TC-05)

- [ ] Searching "kurti" returns all products with "kurti" in name, description, or tags.
- [ ] URL updates to `/search?q=kurti`.
- [ ] "X results for kurti" heading shown.
- [ ] Clicking a result navigates to the PDP (VS-03).
- [ ] Searching "xyzgarment" shows zero-results state with "Browse all" link.
- [ ] Empty query shows 400 error or prevents navigation.

### Definition of Done

- Migration applied (tags + product_tags + GIN index).
- Seed data: at least 5 tagged products.
- API returns correct paginated results.
- Zero-results state works.
- PR passes TC-04 and TC-05.
- Merged to `main`.

---

---

## VS-08 — Email Registration

**Branch:** `feature/vs-08-email-registration`  
**Layer:** Backend API + Frontend register form  
**DB Tables:** `USER` (create)

### Goal
A new customer can create an account with their name, email, and password. A welcome email is sent.

### Database Schema (new table)

```sql
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(255) UNIQUE,
  phone          VARCHAR(15) UNIQUE,
  password_hash  TEXT,
  role           VARCHAR(30) DEFAULT 'customer'
                 CHECK (role IN ('customer','inventory_staff','manager','super_admin')),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

> `phone`, `email`, `password_hash` are all nullable to support phone-only (VS-10) and social login paths later. Uniqueness constraints only fire when the column is non-null — use partial unique index for this.

```sql
-- Only enforce email uniqueness when email is present
CREATE UNIQUE INDEX users_email_unique ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
```

### Password Rules

- Minimum 8 characters.
- Hashed with bcrypt, cost factor 12.
- Plain text never stored or logged.

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create account |

**Request body**
```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "SecurePass123"
}
```

**Success — HTTP 201**
```json
{
  "message": "Account created. Please verify your email.",
  "user_id": 42
}
```

**Errors**

| Case | HTTP | Message |
|---|---|---|
| Email already registered | 409 | "An account with this email already exists." |
| Password < 8 chars | 422 | "Password must be at least 8 characters." |
| Missing required field | 422 | Field-level validation errors |
| Invalid email format | 422 | "Invalid email address." |

### Email Verification

- On registration: generate a signed token (JWT, 24-hour TTL).
- Send verification email with link: `https://[domain]/verify-email?token=[token]`
- `GET /api/auth/verify-email?token=` — sets `email_verified = true`.
- Unverified users **can** log in (VS-09) but see a banner prompting verification. They can still browse and add to cart. Full checkout gating is Wave 4+.

> **Stub note for Wave 1:** The email sending call is a `console.log` in Wave 1. The real email service (M11) is wired in Wave 7 (VS-36). This is the only stub in VS-08.

### Frontend

**Register page** (`/register`)

Fields:
- Full Name (required)
- Email (required)
- Password (required, with show/hide toggle)
- Confirm Password (required, client-side match check)
- "Create Account" button

On success: show "Check your email to verify your account." message. No auto-login (keeps VS-09 fully separate).

Link: "Already have an account? Log in" → `/login` (page not built yet in Wave 1, link is dead — fine).

### Acceptance Criteria (from UAT TC-48)

- [ ] Form submits with valid data → user row created in DB.
- [ ] Duplicate email → 409 error shown inline, no new row created.
- [ ] Short password → 422 error shown inline.
- [ ] Verification email log entry visible (console or log file) — real email in Wave 7.
- [ ] `email_verified = false` in DB until link clicked.
- [ ] Clicking verification link → `email_verified = true` in DB.

### Definition of Done

- Migration applied.
- API creates user, rejects duplicates, validates password length.
- Password stored as bcrypt hash (never plain text).
- Register form submits and shows success/error states.
- Verification token generation works (email is console.log for now).
- PR passes TC-48.
- Merged to `main`.

---

## Stack Implementation — Next.js + Drizzle + Vercel Postgres

**Stack:** Next.js 14 App Router · Drizzle ORM · Vercel Postgres (Neon) · Vercel Blob (images)

### Shared files (create once, used by all slices)

```
lib/db.ts          ← Drizzle client + pooled Vercel Postgres connection
lib/auth.ts        ← JWT sign/verify helpers (used from Wave 2 onward)
drizzle.config.ts  ← Drizzle migration config
```

```typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'
export const db = drizzle(sql)
// Uses POSTGRES_URL env var (pooled) — set automatically by Vercel Postgres integration
```

---

### VS-01 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `GET /api/categories` | `app/api/categories/route.ts` |
| `GET /api/categories/:slug` | `app/api/categories/[slug]/route.ts` |

**Drizzle schema** (`drizzle/schema.ts` — add this table)

```typescript
import { pgTable, serial, integer, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id:           serial('id').primaryKey(),
  parentId:     integer('parent_id').references((): AnyPgColumn => categories.id),
  name:         varchar('name', { length: 120 }).notNull(),
  slug:         varchar('slug', { length: 120 }).notNull().unique(),
  bannerImage:  text('banner_image'),
  metaTitle:    varchar('meta_title', { length: 160 }),
  metaDesc:     varchar('meta_desc', { length: 320 }),
  displayOrder: integer('display_order').default(0),
  active:       boolean('active').default(true),
  createdAt:    timestamp('created_at').defaultNow()
})
```

**Frontend files**

| Component | File |
|---|---|
| Nav component (header) | `components/layout/NavMenu.tsx` |
| Category page shell | `app/[category]/page.tsx` |

---

### VS-03 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `GET /api/products/:slug` | `app/api/products/[slug]/route.ts` |

**Drizzle schema** (add to `drizzle/schema.ts`)

```typescript
import { numeric } from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id:               serial('id').primaryKey(),
  categoryId:       integer('category_id').references(() => categories.id),
  name:             varchar('name', { length: 255 }).notNull(),
  slug:             varchar('slug', { length: 255 }).notNull().unique(),
  shortDescription: text('short_description'),
  fullDescription:  text('full_description'),
  basePrice:        numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  salePrice:        numeric('sale_price', { precision: 10, scale: 2 }),
  gstRate:          numeric('gst_rate', { precision: 4, scale: 2 }).default('12.00'),
  status:           varchar('status', { length: 20 }).default('draft'),
  metaTitle:        varchar('meta_title', { length: 160 }),
  metaDescription:  varchar('meta_description', { length: 320 }),
  createdAt:        timestamp('created_at').defaultNow()
})

export const productImages = pgTable('product_images', {
  id:           serial('id').primaryKey(),
  productId:    integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId:    integer('variant_id'),  // FK added in VS-04 migration
  url:          text('url').notNull(),  // Vercel Blob URL
  displayOrder: integer('display_order').default(0),
  isPrimary:    boolean('is_primary').default(false)
})
```

> **Image upload:** Use `@vercel/blob` — `put(filename, file, { access: 'public' })` returns the URL stored in `product_images.url`.

**Frontend files**

| Component | File |
|---|---|
| PDP page | `app/[category]/[slug]/page.tsx` |
| Image gallery | `components/product/ImageGallery.tsx` |
| Product schema JSON-LD | `components/product/ProductSchema.tsx` |

---

### VS-05 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `GET /api/search` | `app/api/search/route.ts` |

**Drizzle schema** (add to `drizzle/schema.ts`)

```typescript
export const tags = pgTable('tags', {
  id:   serial('id').primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  slug: varchar('slug', { length: 80 }).notNull().unique()
})

export const productTags = pgTable('product_tags', {
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  tagId:     integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
}, (t) => ({ pk: primaryKey({ columns: [t.productId, t.tagId] }) }))
```

> **Full-text search query in the route handler:** Use `sql` tagged template from Drizzle for the raw `plainto_tsquery` call — Drizzle doesn't abstract FTS, raw SQL is fine here.

**Frontend files**

| Component | File |
|---|---|
| Search results page | `app/search/page.tsx` |
| Product card | `components/product/ProductCard.tsx` |

---

### VS-08 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `POST /api/auth/register` | `app/api/auth/register/route.ts` |
| `GET /api/auth/verify-email` | `app/api/auth/verify-email/route.ts` |

**Drizzle schema** (add to `drizzle/schema.ts`)

```typescript
export const users = pgTable('users', {
  id:               serial('id').primaryKey(),
  name:             varchar('name', { length: 120 }).notNull(),
  email:            varchar('email', { length: 255 }),
  phone:            varchar('phone', { length: 15 }),
  passwordHash:     text('password_hash'),
  role:             varchar('role', { length: 30 }).default('customer'),
  emailVerified:    boolean('email_verified').default(false),
  phoneVerified:    boolean('phone_verified').default(false),
  // Wave 2 columns (add in VS-09 migration):
  // refreshTokenHash, refreshTokenExp, otpHash, otpExp, otpAttempts
  // Wave 3 columns (add in VS-11 migration):
  // resetTokenHash, resetTokenExp
  createdAt:        timestamp('created_at').defaultNow()
})
// Partial unique indexes applied via raw SQL in migration (Drizzle supports this)
```

**Frontend files**

| Component | File |
|---|---|
| Register page | `app/(auth)/register/page.tsx` |
| Email verify page | `app/(auth)/verify-email/page.tsx` |

---

## Wave 1 — Done Checklist

All four must be checked before Wave 2 begins:

- [ ] VS-01 merged — category tree API live, nav renders from DB
- [ ] VS-03 merged — PDP loads real product data and images
- [ ] VS-05 merged — search returns results, zero-results state works
- [ ] VS-08 merged — user can register, account exists in DB
- [ ] All migrations applied cleanly on staging
- [ ] All seed data loaded on staging
- [ ] TC-01, TC-02, TC-12, TC-04, TC-05, TC-48 pass on staging
- [ ] No P0 or P1 defects open

---

*Wave 1 Vertical Slices v1.1 — Stack: Next.js + Drizzle + Vercel Postgres — June 25, 2026*  
*Next: docs/slices/wave2.md*
