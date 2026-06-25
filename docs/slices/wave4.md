# WAVE 4 — VERTICAL SLICES DETAIL

**Wave:** 4 of 9  
**Status:** Account Cart, Checkout Start, Admin Products, CMS  
**Slices:** 6  
**Max Parallel Developers:** 6  
**Stack:** Next.js 14 App Router · Drizzle ORM · Vercel Postgres · Vercel Blob  
**Branch prefix:** `feature/vs-XX-*`  
**Merge target:** `main`  
**Depends on:** Wave 3 (all 6 slices merged and passing)  
**References:** WAVE_EXECUTION_PLAN v1.0 · FOLDER_STRUCTURE v1.0

> Wave 4 starts only after VS-07, VS-11, VS-12, VS-15, VS-27, VS-43 are all merged to `main`.  
> All 6 slices are independent of each other — run in parallel.

---

## Wave 4 Slices at a Glance

| Slice | Name | Depends On | DB Tables | UAT Cases | Est. Days |
|---|---|---|---|---|---|
| VS-13 | Account cart — server-persisted | VS-09, VS-12 | `CART`, `CART_ITEM` | TC-18 | 1–2 |
| VS-17 | Checkout Step 1 — address | VS-09 | `ADDRESS` | TC-30, TC-31, TC-32 | 2 |
| VS-28 | Admin product CRUD + image upload | VS-27, VS-01, VS-03 | `PRODUCT`, `PRODUCT_IMAGE`, `CATEGORY` | TC-66, TC-67 | 3 |
| VS-34 | Coupon + campaign CRUD (admin) | VS-27 | `COUPON`, `CAMPAIGN`, `CAMPAIGN_PRODUCT` | TC-74, TC-75 | 2 |
| VS-41 | Homepage banners CMS | VS-27 | `BANNER` | TC-76 | 1 |
| VS-42 | Static pages CMS | VS-27 | `PAGE` | TC-77 | 1 |

---

---

## VS-13 — Account Cart (Server-Persisted)

**Branch:** `feature/vs-13-account-cart`  
**Layer:** Backend API update + Frontend merge logic  
**DB Tables:** `CART`, `CART_ITEM` (already created in VS-12)  
**Depends on:** VS-09 (auth middleware), VS-12 (cart tables exist)

### Goal
A logged-in customer's cart is tied to their account (`user_id`), persists across devices, and survives session expiry. This upgrades the guest cart (session-based) to a full account cart.

### No New DB Tables
The `carts` table from VS-12 already has `user_id`. This slice wires the auth side:

**Migration** — add DB index for performance:
```sql
CREATE INDEX idx_carts_user ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_carts_session ON carts(session_id) WHERE session_id IS NOT NULL;
```

### API Changes

The `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/[id]`, `DELETE /api/cart/items/[id]` routes from VS-12 already use the `resolveCart()` middleware. No new endpoints needed.

**Update `lib/cart.ts` `resolveCart()` to handle auth:**

```typescript
export async function resolveCart(req: NextRequest) {
  // 1. Check auth header — logged-in user
  const user = await verifyAccessToken(req)
  if (user) {
    // find or create cart by user_id
    let cart = await db.select().from(carts).where(eq(carts.userId, user.userId)).limit(1)
    if (!cart.length) cart = await db.insert(carts).values({ userId: user.userId }).returning()
    return { cartId: cart[0].id, isAuth: true }
  }
  // 2. Check cart_session cookie — guest
  const sessionId = req.cookies.get('cart_session')?.value
  if (sessionId) {
    const cart = await db.select().from(carts).where(eq(carts.sessionId, sessionId)).limit(1)
    if (cart.length) return { cartId: cart[0].id, isAuth: false, sessionId }
  }
  // 3. Create new guest cart
  const newSessionId = crypto.randomUUID()
  const cart = await db.insert(carts).values({ sessionId: newSessionId }).returning()
  return { cartId: cart[0].id, isAuth: false, sessionId: newSessionId, isNew: true }
}
```

New cookie is set in the response when `isNew = true` (handled in each route handler).

### Cart Merge on Login (VS-14, Wave 5 — stubbed here)

VS-13 does NOT implement the merge. It only ensures the auth cart exists and is returned correctly for logged-in users. Merge (guest → account) is VS-14 in Wave 5.

### Frontend

- No new page needed.
- After login (VS-09): the existing cart page (`app/cart/page.tsx`) calls `GET /api/cart` with the auth token — automatically returns the account cart.
- Header mini-cart (`MiniCart.tsx`) updates count from account cart on login.

### Acceptance Criteria (from UAT TC-18)

- [ ] Logged-in user adds item → item stored with `user_id` in DB. (TC-18)
- [ ] Same user logs in from a different browser → same cart items visible.
- [ ] Cart persists after refresh (auth, not session cookie).
- [ ] Adding item while logged out, then logging in → guest cart still shown (merge is VS-14).

### Stack: Next.js + Drizzle

**API files** — no new files; updates `lib/cart.ts` only.

**No new Drizzle schema** — uses `carts` and `cartItems` from VS-12.

### Definition of Done

- DB indexes applied.
- `resolveCart()` correctly returns auth cart for logged-in users.
- Cart data is user-specific, persists across sessions.
- PR passes TC-18.
- Merged to `main`.

---

---

## VS-17 — Checkout Step 1 — Address

**Branch:** `feature/vs-17-checkout-address`  
**Layer:** Backend API + Frontend checkout Step 1  
**DB Tables:** `ADDRESS` (create)  
**Depends on:** VS-09 (auth)

### Goal
At checkout, a customer selects a saved address or adds a new one. Pincode lookup auto-fills city and state. This is Step 1 of 3 in the checkout flow.

### Database Schema (new table)

```sql
CREATE TABLE addresses (
  id        SERIAL PRIMARY KEY,
  user_id   INT REFERENCES users(id) ON DELETE CASCADE,  -- NULL for guest one-time
  full_name VARCHAR(120) NOT NULL,
  phone     VARCHAR(15)  NOT NULL,
  line1     TEXT         NOT NULL,
  line2     TEXT,
  city      VARCHAR(80)  NOT NULL,
  state     VARCHAR(80)  NOT NULL,
  pincode   VARCHAR(6)   NOT NULL,
  label     VARCHAR(30),                                  -- "Home", "Work", etc.
  is_default BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_addresses_user ON addresses(user_id);
```

**Drizzle schema** (add to `drizzle/schema.ts`)

```typescript
export const addresses = pgTable('addresses', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  fullName:  varchar('full_name', { length: 120 }).notNull(),
  phone:     varchar('phone', { length: 15 }).notNull(),
  line1:     text('line1').notNull(),
  line2:     text('line2'),
  city:      varchar('city', { length: 80 }).notNull(),
  state:     varchar('state', { length: 80 }).notNull(),
  pincode:   varchar('pincode', { length: 6 }).notNull(),
  label:     varchar('label', { length: 30 }),
  isDefault: boolean('is_default').default(false)
})
```

### API Endpoints

| Method | Path | Auth | File |
|---|---|---|---|
| `GET` | `/api/me/addresses` | Required | `app/api/me/addresses/route.ts` |
| `POST` | `/api/me/addresses` | Required | `app/api/me/addresses/route.ts` |
| `PATCH` | `/api/me/addresses/[id]` | Required | `app/api/me/addresses/[id]/route.ts` |
| `DELETE` | `/api/me/addresses/[id]` | Required | `app/api/me/addresses/[id]/route.ts` |
| `PATCH` | `/api/me/addresses/[id]/default` | Required | `app/api/me/addresses/[id]/default/route.ts` |
| `GET` | `/api/pincodes/[pin]` | Public | `app/api/pincodes/[pin]/route.ts` |

**GET /api/pincodes/[pin] — Response**
```json
{ "pincode": "400001", "city": "Mumbai", "state": "Maharashtra" }
```

Use a static JSON lookup (India Post pincode data ~30k records, ~1MB JSON file in `lib/pincodes.json`). No external API needed — fast, free, offline.

**POST /api/me/addresses — Request**
```json
{
  "full_name": "Priya Sharma",
  "phone": "9876543210",
  "line1": "Flat 4B, Sunrise Apartments",
  "line2": "MG Road",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "label": "Home"
}
```

Setting `is_default: true` on a new address → unsets default on all other addresses for that user (atomic update in same transaction).

### Frontend

**Checkout page** (`app/checkout/page.tsx`) — Step 1 UI:

- If logged in with saved addresses: radio list of saved addresses + "Add New" option.
- If logged in, no saved addresses, or guest: full address form.
- Pincode field: on blur (6 digits entered), call `/api/pincodes/[pin]` → auto-fill city + state.
- "Save this address" checkbox for logged-in users (saves to `/api/me/addresses`).
- "Continue to Shipping" button → advances to Step 2 (placeholder for now; Step 2 is VS-18).

**My Account → Addresses page** (`app/account/addresses/page.tsx`):
- List all saved addresses.
- Add / Edit / Delete / Set Default.

### Acceptance Criteria (from UAT TC-30, TC-31, TC-32)

- [ ] Logged-in user with saved address: pre-selected at checkout. (TC-30)
- [ ] "Add New Address" form saves and is used for this order. (TC-31)
- [ ] Valid pincode auto-fills city + state on blur. (TC-32)
- [ ] Guest can enter address without logging in.
- [ ] Setting a new default unsets the previous default.
- [ ] Delete removes address from list.

### Definition of Done

- `addresses` table + index created.
- All address CRUD endpoints work.
- Pincode lookup returns correct city/state from static data.
- Checkout Step 1 renders and stores selected/new address in component state (passed to Step 2 in Wave 5).
- Account addresses page functional.
- PR passes TC-30, TC-31, TC-32.
- Merged to `main`.

---

---

## VS-28 — Admin Product CRUD + Image Upload

**Branch:** `feature/vs-28-admin-products`  
**Layer:** Backend API (admin) + Frontend admin product pages  
**DB Tables:** `PRODUCT`, `PRODUCT_IMAGE`, `CATEGORY` (all exist — admin write operations)  
**Depends on:** VS-27 (RBAC), VS-01 (categories), VS-03 (products table)

### Goal
Admin can create, edit, and delete products and upload product images. This is the primary content management for the store.

### No New DB Tables
All tables exist from Wave 1. Adds write operations via admin-protected endpoints.

### API Endpoints

| Method | Path | Auth | File |
|---|---|---|---|
| `GET` | `/api/admin/products` | Manager+ | `app/api/admin/products/route.ts` |
| `POST` | `/api/admin/products` | Manager+ | `app/api/admin/products/route.ts` |
| `GET` | `/api/admin/products/[id]` | Manager+ | `app/api/admin/products/[id]/route.ts` |
| `PATCH` | `/api/admin/products/[id]` | Manager+ | `app/api/admin/products/[id]/route.ts` |
| `DELETE` | `/api/admin/products/[id]` | Manager+ | `app/api/admin/products/[id]/route.ts` |
| `POST` | `/api/upload` | Manager+ | `app/api/upload/route.ts` |

**GET /api/admin/products — params**

| Param | Type | Description |
|---|---|---|
| `page` | int | Pagination |
| `status` | string | `draft`, `active`, `archived` |
| `search` | string | Search by name |
| `category_id` | int | Filter by category |

**POST /api/upload (image upload → Vercel Blob)**

```typescript
// app/api/upload/route.ts
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  
  const formData = await req.formData()
  const file = formData.get('file') as File
  const blob = await put(`products/${Date.now()}-${file.name}`, file, { access: 'public' })
  return Response.json({ url: blob.url })
}
```

**POST /api/admin/products — Request (create)**
```json
{
  "name": "Banarasi Silk Saree",
  "category_id": 6,
  "short_description": "...",
  "full_description": "...",
  "base_price": "2499.00",
  "sale_price": "1999.00",
  "gst_rate": "12.00",
  "status": "active",
  "meta_title": "...",
  "meta_description": "...",
  "image_urls": ["https://blob.vercel.app/..."]
}
```

`image_urls` — array of Vercel Blob URLs already uploaded via `/api/upload`. First URL becomes `is_primary = true`.

**PATCH /api/admin/products/[id]** — partial update, any subset of fields.

**DELETE** — sets `status = 'archived'` (soft delete). Hard delete not offered — preserves order history.

### Frontend

**Admin product list** (`app/admin/products/page.tsx`)
- Table: name, category, price, status, stock count (sum across variants), actions.
- Filter by status tabs: All / Active / Draft / Archived.
- Search field.
- "Add Product" button → `/admin/products/new`.

**Create/Edit product page** (`app/admin/products/new/page.tsx`, `app/admin/products/[id]/page.tsx`)
- Fields: Name, Category (dropdown from VS-01 data), Short Description, Full Description (rich text), Base Price, Sale Price, GST Rate, Status, SEO Title, SEO Description.
- Image uploader: drag-drop or file picker → uploads to `/api/upload` → appends Blob URL to list → saved with product.
- Image reorder: drag to set display order; first = primary.
- "Save as Draft" and "Publish" buttons.

### Acceptance Criteria (from UAT TC-66, TC-67)

- [ ] Create product with 2 images → product appears on storefront listing. (TC-66)
- [ ] Edit base price → new price shown on PDP without cache issue. (TC-67)
- [ ] Delete (archive) product → no longer visible on storefront; still in admin list as Archived.
- [ ] Image upload: file selected → Blob URL stored, image shown in product gallery.
- [ ] Inventory Staff role cannot access product create/edit (403).

### Definition of Done

- All 5 product CRUD endpoints + upload endpoint work.
- Image upload stores to Vercel Blob.
- Admin product list + create/edit pages functional.
- Soft delete (archive) keeps product out of public listing.
- PR passes TC-66 and TC-67.
- Merged to `main`.

---

---

## VS-34 — Coupon + Campaign CRUD (Admin)

**Branch:** `feature/vs-34-admin-promotions`  
**Layer:** Backend API (admin) + Frontend admin promotions page  
**DB Tables:** `COUPON`, `CAMPAIGN`, `CAMPAIGN_PRODUCT` (create)  
**Depends on:** VS-27 (RBAC)

### Goal
Admin can create and manage coupon codes and time-bounded campaigns (seasonal sales / flash sales).

### Database Schema (new tables)

```sql
CREATE TABLE coupons (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(50) NOT NULL UNIQUE,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('percentage','flat')),
  value           NUMERIC(10,2) NOT NULL,
  min_cart_value  NUMERIC(10,2) DEFAULT 0,
  max_uses        INT,                            -- NULL = unlimited
  uses_count      INT NOT NULL DEFAULT 0,
  stackable       BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaigns (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  type           VARCHAR(20)  NOT NULL CHECK (type IN ('seasonal','flash_sale')),
  discount_type  VARCHAR(20)  NOT NULL CHECK (discount_type IN ('percentage','flat')),
  discount_value NUMERIC(10,2) NOT NULL,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL,
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_products (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, product_id)
);
```

**Drizzle schema** (add to `drizzle/schema.ts`)

```typescript
export const coupons = pgTable('coupons', {
  id:           serial('id').primaryKey(),
  code:         varchar('code', { length: 50 }).notNull().unique(),
  type:         varchar('type', { length: 20 }).notNull(),
  value:        numeric('value', { precision: 10, scale: 2 }).notNull(),
  minCartValue: numeric('min_cart_value', { precision: 10, scale: 2 }).default('0'),
  maxUses:      integer('max_uses'),
  usesCount:    integer('uses_count').notNull().default(0),
  stackable:    boolean('stackable').default(false),
  expiresAt:    timestamp('expires_at'),
  active:       boolean('active').default(true),
  createdAt:    timestamp('created_at').defaultNow()
})

export const campaigns = pgTable('campaigns', {
  id:            serial('id').primaryKey(),
  name:          varchar('name', { length: 120 }).notNull(),
  type:          varchar('type', { length: 20 }).notNull(),
  discountType:  varchar('discount_type', { length: 20 }).notNull(),
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  startsAt:      timestamp('starts_at').notNull(),
  endsAt:        timestamp('ends_at').notNull(),
  active:        boolean('active').default(true),
  createdAt:     timestamp('created_at').defaultNow()
})

export const campaignProducts = pgTable('campaign_products', {
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  productId:  integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' })
}, (t) => ({ pk: primaryKey({ columns: [t.campaignId, t.productId] }) }))
```

### API Endpoints

| Method | Path | Auth | File |
|---|---|---|---|
| `GET` | `/api/admin/coupons` | Manager+ | `app/api/admin/coupons/route.ts` |
| `POST` | `/api/admin/coupons` | Manager+ | `app/api/admin/coupons/route.ts` |
| `PATCH` | `/api/admin/coupons/[id]` | Manager+ | `app/api/admin/coupons/[id]/route.ts` |
| `DELETE` | `/api/admin/coupons/[id]` | Manager+ | `app/api/admin/coupons/[id]/route.ts` |
| `GET` | `/api/admin/campaigns` | Manager+ | `app/api/admin/campaigns/route.ts` |
| `POST` | `/api/admin/campaigns` | Manager+ | `app/api/admin/campaigns/route.ts` |
| `PATCH` | `/api/admin/campaigns/[id]` | Manager+ | `app/api/admin/campaigns/[id]/route.ts` |
| `DELETE` | `/api/admin/campaigns/[id]` | Manager+ | `app/api/admin/campaigns/[id]/route.ts` |

DELETE coupon/campaign: soft delete via `active = false`, not physical row delete (preserves `COUPON_USAGE` history).

### Frontend

**Admin Promotions page** (`app/admin/promotions/page.tsx`)

Two tabs: **Coupons** and **Campaigns**.

**Coupons tab**
- Table: code, type, value, min cart, uses / max, expiry, status, actions.
- "Create Coupon" form: code (auto-generate button available), type toggle (% / flat), value, min cart, max uses, expiry date picker, stackable checkbox.
- Toggle to activate/deactivate.

**Campaigns tab**
- Table: name, type, discount, date range, status, actions.
- "Create Campaign" form: name, type (seasonal/flash), discount type + value, start date, end date, product selector (multi-select from product list).

### Acceptance Criteria (from UAT TC-74, TC-75)

- [ ] Create coupon `SAVE10` 10% off → usable at checkout (coupon validation is VS-16, Wave 5). (TC-74)
- [ ] Deactivate coupon → returns "no longer available" error at checkout. (TC-75)
- [ ] Flash sale campaign with start/end dates → saved correctly; product association stored.
- [ ] Expired coupon (past `expires_at`) auto-rejected at checkout without admin action.

### Definition of Done

- `coupons`, `campaigns`, `campaign_products` tables created.
- All 8 admin endpoints work.
- Admin promotions page with two tabs functional.
- Coupon deactivation works.
- PR passes TC-74 and TC-75.
- Merged to `main`.

---

---

## VS-41 — Homepage Banners CMS

**Branch:** `feature/vs-41-banners-cms`  
**Layer:** Backend API (admin) + public read + Frontend  
**DB Tables:** `BANNER` (create)  
**Depends on:** VS-27 (RBAC)

### Goal
Admin can create, reorder, and schedule homepage hero banners. The homepage renders banners from the DB.

### Database Schema

```sql
CREATE TABLE banners (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(160),
  image_url    TEXT NOT NULL,
  cta_link     TEXT,
  display_order INT DEFAULT 0,
  active_from  DATE,
  active_to    DATE,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Drizzle schema**

```typescript
import { date } from 'drizzle-orm/pg-core'

export const banners = pgTable('banners', {
  id:           serial('id').primaryKey(),
  title:        varchar('title', { length: 160 }),
  imageUrl:     text('image_url').notNull(),
  ctaLink:      text('cta_link'),
  displayOrder: integer('display_order').default(0),
  activeFrom:   date('active_from'),
  activeTo:     date('active_to'),
  active:       boolean('active').default(true),
  createdAt:    timestamp('created_at').defaultNow()
})
```

### API Endpoints

| Method | Path | Auth | File |
|---|---|---|---|
| `GET` | `/api/banners` | Public | `app/api/banners/route.ts` |
| `GET` | `/api/admin/banners` | Manager+ | `app/api/admin/banners/route.ts` |
| `POST` | `/api/admin/banners` | Manager+ | `app/api/admin/banners/route.ts` |
| `PATCH` | `/api/admin/banners/[id]` | Manager+ | `app/api/admin/banners/[id]/route.ts` |
| `DELETE` | `/api/admin/banners/[id]` | Manager+ | `app/api/admin/banners/[id]/route.ts` |

**GET /api/banners** — returns only `active = true` banners where today is within `active_from`/`active_to` range (or null dates = always active). Sorted by `display_order ASC`.

### Frontend

**Homepage** (`app/page.tsx`) — wire hero banner section to real `/api/banners` data (currently static placeholder).

**Admin Banners page** (`app/admin/cms/banners/page.tsx`)
- List of banners: preview thumbnail, title, date range, order, active toggle.
- "Add Banner": image upload (→ Vercel Blob), title, CTA link, start/end dates.
- Drag-to-reorder to set display_order.

### Acceptance Criteria (from UAT TC-76)

- [ ] Upload banner image, set CTA link and active dates → banner appears on homepage within active dates. (TC-76)
- [ ] Banner outside active date range → not shown on homepage.
- [ ] Display order drag-and-drop works.
- [ ] Inactive banner → not shown on homepage.

### Definition of Done

- `banners` table created.
- Public API returns date-filtered active banners.
- Homepage hero renders from real API.
- Admin banner management page functional.
- PR passes TC-76.
- Merged to `main`.

---

---

## VS-42 — Static Pages CMS

**Branch:** `feature/vs-42-static-pages`  
**Layer:** Backend API (admin) + public read + Frontend  
**DB Tables:** `PAGE` (create)  
**Depends on:** VS-27 (RBAC)

### Goal
Admin can edit static pages (About, Contact, Shipping & Returns, Privacy, T&C). Customers can read them.

### Database Schema

```sql
CREATE TABLE pages (
  id               SERIAL PRIMARY KEY,
  slug             VARCHAR(80) NOT NULL UNIQUE,
  title            VARCHAR(160) NOT NULL,
  body             TEXT NOT NULL,
  meta_title       VARCHAR(160),
  meta_description VARCHAR(320),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

**Drizzle schema**

```typescript
export const pages = pgTable('pages', {
  id:              serial('id').primaryKey(),
  slug:            varchar('slug', { length: 80 }).notNull().unique(),
  title:           varchar('title', { length: 160 }).notNull(),
  body:            text('body').notNull(),
  metaTitle:       varchar('meta_title', { length: 160 }),
  metaDescription: varchar('meta_description', { length: 320 }),
  updatedAt:       timestamp('updated_at').defaultNow()
})
```

**Seed data** — insert the 5 required pages:

```sql
INSERT INTO pages (slug, title, body) VALUES
  ('about',             'About Us',                'Content coming soon.'),
  ('contact',           'Contact Us',              'Content coming soon.'),
  ('shipping-returns',  'Shipping & Returns',      'Content coming soon.'),
  ('privacy',           'Privacy Policy',           'Content coming soon.'),
  ('terms',             'Terms & Conditions',       'Content coming soon.');
```

### API Endpoints

| Method | Path | Auth | File |
|---|---|---|---|
| `GET` | `/api/pages/[slug]` | Public | `app/api/pages/[slug]/route.ts` |
| `GET` | `/api/admin/pages` | Manager+ | `app/api/admin/pages/route.ts` |
| `PATCH` | `/api/admin/pages/[id]` | Manager+ | `app/api/admin/pages/[id]/route.ts` |

No POST/DELETE on pages — the 5 pages are fixed; only editable, not creatable or deletable via API.

### Frontend

**Public page** — dynamic route `app/(store)/[slug]/page.tsx` handles static page slugs:

```typescript
// Distinguish static pages from category slugs:
// If slug matches a known page slug → render page content
// Else → render category listing (VS-02)
// Check pages table first, then categories
```

**Admin static pages** (`app/admin/cms/pages/[slug]/page.tsx`)
- Simple form: Title, Body (rich text editor — use `react-quill` or `tiptap`), SEO Title, SEO Description.
- "Save" button → PATCH.
- "Preview" link → opens public page in new tab.

### Acceptance Criteria (from UAT TC-77)

- [ ] Admin edits About Us body → updated text appears at `/about`. (TC-77)
- [ ] SEO title and meta description saved and shown in page `<head>`.
- [ ] Non-existent slug → 404 page.

### Definition of Done

- `pages` table created, 5 pages seeded.
- Public read endpoint returns page by slug.
- Admin edit endpoint works.
- Public page route renders body with correct SEO head.
- PR passes TC-77.
- Merged to `main`.

---

## Wave 4 — Done Checklist

All six must be checked before Wave 5 begins:

- [ ] VS-13 merged — logged-in cart persists across sessions and devices
- [ ] VS-17 merged — checkout Step 1 shows address selector, pincode lookup works
- [ ] VS-28 merged — admin can create/edit products and upload images to Vercel Blob
- [ ] VS-34 merged — admin can create coupons and campaigns
- [ ] VS-41 merged — banners CMS works, homepage hero renders from DB
- [ ] VS-42 merged — static pages editable in admin, render at public URLs
- [ ] `addresses` migration applied
- [ ] `coupons`, `campaigns`, `campaign_products` migrations applied
- [ ] `banners` migration applied
- [ ] `pages` migration applied + 5 pages seeded
- [ ] DB indexes applied (VS-13)
- [ ] All migrations applied cleanly on staging
- [ ] TC-18, TC-30, TC-31, TC-32, TC-66, TC-67, TC-74, TC-75, TC-76, TC-77 pass on staging
- [ ] No P0 or P1 defects open

---

*Wave 4 Vertical Slices v1.0 — Stack: Next.js + Drizzle + Vercel Postgres — June 25, 2026*  
*Next: docs/slices/wave5.md*
