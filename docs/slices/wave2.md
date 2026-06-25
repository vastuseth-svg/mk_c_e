# WAVE 2 — VERTICAL SLICES DETAIL

**Wave:** 2 of 9  
**Status:** Core Display + Login  
**Slices:** 5  
**Max Parallel Developers:** 5  
**Branch prefix:** `feature/vs-0X-*`  
**Merge target:** `main`  
**Depends on:** Wave 1 (all 4 slices merged and passing)  
**References:** WAVE_EXECUTION_PLAN v1.0

> Wave 2 starts only after VS-01, VS-03, VS-05, VS-08 are all merged to `main`.  
> All 5 slices in Wave 2 are independent of each other — run them in parallel.

---

## Wave 2 Slices at a Glance

| Slice | Name | Depends On | DB Tables | UAT Cases | Est. Days |
|---|---|---|---|---|---|
| VS-02 | Product listing page + pagination | VS-01 | `PRODUCT`, `CATEGORY` | TC-01 | 2 |
| VS-04 | Variant selector + stock on PDP | VS-03 | `PRODUCT_VARIANT` | TC-12, TC-13 | 2–3 |
| VS-06 | Search autocomplete (debounced) | VS-05 | `PRODUCT`, `TAG` | TC-03 | 1 |
| VS-09 | Email/password login + JWT | VS-08 | `USER` | TC-50 | 2 |
| VS-10 | Phone OTP registration + login | VS-08 | `USER` | TC-49 | 2 |

---

---

## VS-02 — Product Listing Page + Pagination

**Branch:** `feature/vs-02-product-listing`  
**Layer:** Backend API + Frontend listing page  
**DB Tables:** `PRODUCT` (read), `CATEGORY` (read)  
**Depends on:** VS-01 (category slugs must exist)

### Goal
A customer navigates to a category URL and sees a paginated grid of products in that category. No filters yet — that is VS-07 (Wave 3).

### No New DB Tables
Uses `products` and `categories` created in Wave 1. One index added:

```sql
-- Speed up category-scoped product queries
CREATE INDEX idx_products_category_status
  ON products(category_id, status);
```

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/categories/:slug/products` | Public | Paginated product list for a category |

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `per_page` | int | 24 | Items per page (max 48) |
| `sort` | string | `newest` | `newest`, `price_asc`, `price_desc`, `bestsellers` |

> Filters (`size`, `color`, `price_min`, `price_max`, etc.) are **not** in this endpoint yet. They are added to this same endpoint in VS-07 (Wave 3) as additional optional query params. Keep the query modular for that.

**Response shape**
```json
{
  "category": {
    "id": 6,
    "name": "Sarees",
    "slug": "sarees",
    "parent": { "id": 2, "name": "Women's Wear", "slug": "womens-wear" }
  },
  "total": 34,
  "page": 1,
  "per_page": 24,
  "products": [
    {
      "id": 1,
      "name": "Banarasi Silk Saree",
      "slug": "banarasi-silk-saree-red",
      "base_price": "2499.00",
      "sale_price": "1999.00",
      "primary_image": "https://...",
      "on_sale": true
    }
  ]
}
```

- Only `status = 'active'` products returned.
- `bestsellers` sort: order by `ORDER_ITEM` count — **stub for now** (Wave 6 creates orders). Use `created_at DESC` as fallback until orders exist.
- 404 if category slug not found or inactive.

### Sub-category inclusion
If the category has children, the listing shows products from the category **and all its children** combined.

```sql
-- Recursive CTE to get self + all descendant category IDs
WITH RECURSIVE cat_tree AS (
  SELECT id FROM categories WHERE slug = $1 AND active = TRUE
  UNION ALL
  SELECT c.id FROM categories c
  JOIN cat_tree ct ON ct.id = c.parent_id
  WHERE c.active = TRUE
)
SELECT p.* FROM products p
WHERE p.category_id IN (SELECT id FROM cat_tree)
  AND p.status = 'active'
```

### Frontend

- URL: `/[root-slug]/[sub-slug]` or `/[root-slug]` (both resolved via same listing page).
- Product card: primary image, name, price (sale price if available), "On Sale" badge.
- Clicking a card → PDP (VS-03).
- Breadcrumb: `Home › Women's Wear › Sarees`.
- Sort dropdown in top-right. Default = Newest.
- Pagination: previous / next + page numbers.
- No filter sidebar yet — placeholder "Filters coming soon" hidden (don't show it at all).
- Empty state: "No products in this category yet."

### Acceptance Criteria (from UAT TC-01)

- [ ] Navigating to `/womens-wear/sarees` shows only Sarees products.
- [ ] Navigating to `/womens-wear` shows products from all Women's Wear sub-categories combined.
- [ ] Sort "Price: Low to High" orders correctly.
- [ ] Page 2 shows different products than page 1 (if total > 24).
- [ ] Inactive products not shown.
- [ ] Breadcrumb correct for both root and sub-category.
- [ ] Invalid category slug → 404 page.

### Definition of Done

- Index migration applied.
- API returns paginated, category-filtered, correctly sorted products.
- Recursive CTE works for parent categories.
- Listing page renders from real API.
- PR passes TC-01.
- Merged to `main`.

---

---

## VS-04 — Variant Selector + Stock on PDP

**Branch:** `feature/vs-04-pdp-variants`  
**Layer:** Backend API update + Frontend PDP variant UI  
**DB Tables:** `PRODUCT_VARIANT` (create), `PRODUCT_IMAGE` (update FK)  
**Depends on:** VS-03 (PDP and `products`, `product_images` tables exist)

### Goal
On the PDP, a customer selects a size and color. The displayed price, stock status, and images update instantly. "Add to Cart" remains disabled (cart is Wave 3).

### Database Schema (new table + FK)

```sql
CREATE TABLE product_variants (
  id               SERIAL PRIMARY KEY,
  product_id       INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku              VARCHAR(100) NOT NULL UNIQUE,
  size             VARCHAR(30),
  color            VARCHAR(50),
  material         VARCHAR(80),
  price_override   NUMERIC(10,2),   -- NULL = use product.base_price
  stock            INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- Now add the FK we left nullable in VS-03 migration
ALTER TABLE product_images
  ADD CONSTRAINT fk_product_images_variant
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
```

> This migration adds `product_variants` and wires the FK that VS-03 left open. **Run this migration after VS-03 is merged** — which it will be, since Wave 2 starts after Wave 1.

### Seed Data

Add 3+ variants to each seeded product:
- Sizes: S, M, L, XL
- Colors: Red, Blue, Green
- At least 1 variant with `stock = 0` (out of stock) for testing.

### API Changes

**Update** `GET /api/products/:slug` response to include variants:

```json
{
  "id": 1,
  "name": "Banarasi Silk Saree",
  "base_price": "2499.00",
  "sale_price": "1999.00",
  "images": [...],
  "variants": [
    {
      "id": 10,
      "sku": "BSS-RED-FREE",
      "size": "Free Size",
      "color": "Red",
      "material": "Silk",
      "price_override": null,
      "effective_price": "1999.00",
      "stock": 12,
      "in_stock": true,
      "images": []
    },
    {
      "id": 11,
      "sku": "BSS-BLU-FREE",
      "size": "Free Size",
      "color": "Blue",
      "material": "Silk",
      "price_override": "2199.00",
      "effective_price": "2199.00",
      "stock": 0,
      "in_stock": false,
      "images": []
    }
  ]
}
```

`effective_price` = `price_override` if set, else `sale_price` if set, else `base_price`.

**No new endpoint needed.** Variant data is part of the existing product detail response.

### Frontend (PDP updates)

**Variant selector UI**

- Group variants by `size` and `color` as separate selectors.
- Size: button group (S / M / L / XL).
- Color: color swatch circles.
- Selecting a size + color combination finds the matching variant.
- If no exact match for the selected combination → show "Unavailable" and disable Add to Cart.

**On variant select (in-place update, no page reload)**

- Price updates to `effective_price`.
- If `in_stock = false`: "Out of Stock" badge appears; Add to Cart disabled; "Notify Me" button appears (captures email — VS-40 Wire 8, for now just show the button, no action).
- If variant has its own images, swap gallery to those; else keep product-level images.

**"Add to Cart" button state**

| Condition | Button state |
|---|---|
| No variant selected | Disabled — "Select Size & Color" |
| Variant selected, in stock | Enabled — "Add to Cart" (action wired in VS-12, Wave 3) |
| Variant selected, out of stock | Disabled — "Out of Stock" |

### Acceptance Criteria (from UAT TC-12, TC-13)

- [ ] PDP shows variant selector (size + color).
- [ ] Selecting a variant updates price in-place.
- [ ] Selecting an OOS variant → "Out of Stock" shown, Add to Cart disabled, "Notify Me" visible.
- [ ] Selecting an in-stock variant → Add to Cart enabled (click does nothing yet — cart is Wave 3).
- [ ] Images swap if variant has specific images.
- [ ] No page reload on variant change.

### Definition of Done

- `product_variants` table created, FK on `product_images` applied.
- Seed data includes OOS variant.
- `GET /api/products/:slug` includes `variants` array.
- Variant selector UI functional.
- OOS state correct.
- PR passes TC-12 and TC-13.
- Merged to `main`.

---

---

## VS-06 — Search Autocomplete (Debounced)

**Branch:** `feature/vs-06-search-autocomplete`  
**Layer:** Backend API (1 endpoint) + Frontend search bar component  
**DB Tables:** `PRODUCT`, `TAG` (read only)  
**Depends on:** VS-05 (search infrastructure + tag tables exist)

### Goal
As a customer types in the search bar, a dropdown appears with up to 5 matching product suggestions, without a page navigation.

### No New DB Tables
Reuses `products` and `tags` from Wave 1. Uses the same GIN index created in VS-05.

### API Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search/autocomplete?q=kur` | Public | Top 5 matches |

**Rules**
- Minimum 2 characters before firing — return `[]` for 0–1 chars.
- Max 5 results.
- Lightweight: only returns `id`, `name`, `slug`, `primary_image`, `category_slug`. No full description, no price — keep payload tiny.
- Uses the same full-text query as VS-05 but `LIMIT 5` and no pagination.

**Response shape**
```json
[
  {
    "id": 3,
    "name": "Cotton Kurti",
    "slug": "cotton-kurti-blue",
    "primary_image": "https://...",
    "category_slug": "kurtis"
  }
]
```

- Empty array if no matches or `q` < 2 chars (HTTP 200, not 400).

### Frontend

**Debounce:** Fire the API call 300 ms after the user stops typing. Cancel in-flight requests on new keystrokes (use AbortController).

**Dropdown behaviour**

- Appears below the search input when ≥ 1 result returned.
- Each suggestion: thumbnail (32×32) + product name + category name.
- Clicking a suggestion → navigate to PDP (`/[cat-slug]/[product-slug]`).
- Pressing Enter → navigate to full search results page (`/search?q=...`) — VS-05.
- Pressing Escape or clicking outside → close dropdown.
- Keyboard navigation: arrow up/down highlights suggestions; Enter on a highlighted item → navigate to that PDP.
- "See all results for '[query]'" as the last item in the dropdown → navigates to `/search?q=...`.

### Acceptance Criteria (from UAT TC-03)

- [ ] Typing "kur" shows dropdown with ≤ 5 suggestions containing "kurti".
- [ ] Dropdown appears within 1 second of typing stopping.
- [ ] Clicking a suggestion navigates to correct PDP.
- [ ] Pressing Enter navigates to full search results page.
- [ ] Pressing Escape closes dropdown.
- [ ] Typing 1 character → no dropdown.
- [ ] No extra API calls while user is still typing (debounce verified in network tab).

### Definition of Done

- `/api/search/autocomplete` returns correct lightweight results.
- Debounce works (verifiable in browser network tab).
- AbortController cancels stale requests.
- All keyboard interactions work.
- PR passes TC-03.
- Merged to `main`.

---

---

## VS-09 — Email / Password Login + JWT Tokens

**Branch:** `feature/vs-09-email-login`  
**Layer:** Backend API + Frontend login page  
**DB Tables:** `USER` (read + update for refresh token)  
**Depends on:** VS-08 (USER table and registered accounts exist)

### Goal
A registered customer can log in with their email and password. The server issues a short-lived access token and a long-lived refresh token. Protected routes can now check auth.

### No New DB Tables
Uses `users` from VS-08. Add one column for refresh token storage:

```sql
ALTER TABLE users ADD COLUMN refresh_token_hash TEXT;
ALTER TABLE users ADD COLUMN refresh_token_exp  TIMESTAMPTZ;
```

> Storing hash of the refresh token (not plain token) — so even if DB is compromised, tokens can't be replayed.

### Token Design

| Token | Lifetime | Storage | How used |
|---|---|---|---|
| Access token (JWT) | 15 minutes | Memory / JS variable | `Authorization: Bearer [token]` header |
| Refresh token | 30 days | httpOnly cookie | `POST /api/auth/token/refresh` |

Access token payload: `{ user_id, role, exp }`. Signed with HS256 + `JWT_SECRET` env var.

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Login with email + password |
| `POST` | `/api/auth/logout` | Access token | Revoke refresh token |
| `POST` | `/api/auth/token/refresh` | Refresh cookie | Issue new access token |

**POST /api/auth/login — Request**
```json
{ "email": "priya@example.com", "password": "SecurePass123" }
```

**Success — HTTP 200**
```json
{
  "access_token": "eyJ...",
  "expires_in": 900,
  "user": { "id": 42, "name": "Priya Sharma", "email": "priya@example.com", "role": "customer" }
}
```
Refresh token set as httpOnly cookie: `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`

**Errors**

| Case | HTTP | Message |
|---|---|---|
| Email not found | 401 | "Invalid email or password." (intentionally vague) |
| Wrong password | 401 | "Invalid email or password." |
| Account not found | 401 | Same — no user enumeration |
| Missing field | 422 | Field validation error |

**Rate limiting:** Max 10 login attempts per IP per 15 minutes. Return 429 after threshold.

**POST /api/auth/token/refresh**  
Reads httpOnly cookie → validates refresh token hash → issues new access token.  
Returns 401 if token expired or revoked.

**POST /api/auth/logout**  
Clears `refresh_token_hash` in DB. Clears cookie.

### Auth Middleware (shared utility — used by all future protected routes)

```
verifyAccessToken(req, res, next):
  1. Read Authorization header
  2. Verify JWT signature + exp
  3. Attach user { id, role } to req.user
  4. Call next() or return 401
```

This middleware is the single piece all protected slices (Wave 3+) will import. Define it in a shared `middleware/auth.js` (or equivalent). No duplication.

### Frontend

**Login page** (`/login`)

Fields:
- Email
- Password (show/hide toggle)
- "Log In" button
- "Forgot your password?" link → `/forgot-password` (VS-11, Wave 3 — dead link for now)
- "Don't have an account? Register" → `/register`

On success:
- Store access token in memory (not localStorage — XSS risk).
- Refresh token is in httpOnly cookie automatically.
- Redirect to `/account` or the page the user was trying to access (stored in `redirect` query param).

On failure: inline error message below the form.

**Session persistence:** On page load, call `POST /api/auth/token/refresh` silently. If it succeeds, user is logged in. If it fails (expired cookie), user is logged out. This handles browser refreshes without re-login.

**Header update:** After login, header shows "My Account" + "Logout" instead of "Login / Register".

### Acceptance Criteria (from UAT TC-50)

- [ ] Valid credentials → logged in, redirected to account page or intended URL.
- [ ] Wrong password → "Invalid email or password." error shown.
- [ ] Non-existent email → same error (no user enumeration).
- [ ] After login, header shows account links.
- [ ] Page refresh → user stays logged in (refresh token flow works).
- [ ] Logout → refresh token cleared, header reverts to guest state.
- [ ] 11th login attempt within 15 min → 429 error shown.

### Definition of Done

- DB columns for refresh token added.
- Login API works with rate limiting.
- Refresh and logout endpoints work.
- `verifyAccessToken` middleware available for all future routes.
- Login page functional with redirect-back support.
- Page-load silent refresh works.
- PR passes TC-50.
- Merged to `main`.

---

---

## VS-10 — Phone OTP Registration + Login

**Branch:** `feature/vs-10-phone-otp`  
**Layer:** Backend API + Frontend OTP flow  
**DB Tables:** `USER` (read/write)  
**Depends on:** VS-08 (USER table exists)

### Goal
A customer can register or log in using just their mobile number and a one-time password (OTP) sent via SMS. No email or password needed for this path.

### No New DB Tables
Uses `users` from VS-08. Add OTP storage:

```sql
ALTER TABLE users
  ADD COLUMN otp_hash       TEXT,
  ADD COLUMN otp_exp        TIMESTAMPTZ,
  ADD COLUMN otp_attempts   INT DEFAULT 0;
```

> Store bcrypt hash of OTP — same reason as refresh token. OTP is 6 digits.

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/otp/request` | Public | Send OTP to phone number |
| `POST` | `/api/auth/otp/verify` | Public | Verify OTP → login or register |

**POST /api/auth/otp/request — Request**
```json
{ "phone": "+919876543210", "name": "Rahul Verma" }
```

- `name` required only if phone is not already registered (new user).
- If phone already registered: `name` ignored.
- Sends 6-digit OTP via MSG91 (or Twilio). **Stub in Wave 2: `console.log` the OTP.** Real SMS wired in VS-36 (Wave 7).
- Rate limit: max 5 OTP requests per phone per hour. Return 429 after.
- OTP TTL: 5 minutes.

**Success — HTTP 200**
```json
{ "message": "OTP sent to +91XXXXXX3210", "expires_in": 300 }
```

**POST /api/auth/otp/verify — Request**
```json
{ "phone": "+919876543210", "otp": "483920" }
```

**Success — HTTP 200**
```json
{
  "access_token": "eyJ...",
  "expires_in": 900,
  "user": { "id": 55, "name": "Rahul Verma", "role": "customer" },
  "is_new_user": true
}
```

Refresh token set in httpOnly cookie (same pattern as VS-09).

**Errors**

| Case | HTTP | Message |
|---|---|---|
| Wrong OTP | 401 | "Invalid OTP." |
| OTP expired | 401 | "OTP has expired. Please request a new one." |
| > 5 wrong attempts | 429 | "Too many attempts. Request a new OTP." |
| Rate limit on request | 429 | "Too many OTP requests. Try after 1 hour." |

After 5 wrong attempts: clear OTP from DB, force re-request.

### Frontend

**Two-step OTP flow** (single page, step-based UI)

**Step 1 — Enter Phone**
- Phone number input (Indian format, +91 prefix shown)
- Name field (shown only if first-time — determined client-side after step 2 returns `is_new_user`; simplification: always show name, backend ignores it if existing user)
- "Send OTP" button

**Step 2 — Enter OTP** (same page, step 1 slides out)
- "OTP sent to +91XXXXXX3210" label
- 6-digit OTP input (auto-advance between digit boxes or single input)
- 5-minute countdown timer
- "Resend OTP" link (active after 30 seconds)
- "Verify" button

On success: same redirect logic as VS-09 login.

**Entry point:** `/register` page has a tab "Register with Phone" alongside the email form. `/login` page has a "Login with OTP" link.

### Acceptance Criteria (from UAT TC-49)

- [ ] New phone number: OTP sent (visible in console/log), account created on verify, `phone_verified = true`.
- [ ] Existing phone number: OTP sent, login succeeds, no duplicate user created.
- [ ] Wrong OTP: "Invalid OTP." error.
- [ ] Expired OTP (wait 5 min or manipulate TTL in test): "OTP has expired."
- [ ] 5 wrong attempts → "Too many attempts." forced re-request.
- [ ] 6th OTP request in 1 hour → 429 rate limit error.
- [ ] After verify, user stays logged in on refresh (same refresh token cookie as VS-09).

### Definition of Done

- OTP columns added to users table.
- OTP request + verify API works with rate limiting.
- OTP console-logged (real SMS in Wave 7).
- Phone OTP UI functional on register + login pages.
- New + existing phone paths both work.
- PR passes TC-49.
- Merged to `main`.

---

## Stack Implementation — Next.js + Drizzle + Vercel Postgres

---

### VS-02 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `GET /api/categories/[slug]/products` | `app/api/categories/[slug]/products/route.ts` |
| `GET /api/categories/[slug]/facets` | `app/api/categories/[slug]/facets/route.ts` |

> No new Drizzle schema — uses `products` and `categories` from Wave 1.

**Frontend files**

| Component | File |
|---|---|
| Category listing page | `app/[category]/page.tsx` (update from shell) |
| Sub-category listing | `app/[category]/[subcategory]/page.tsx` |
| Product card | `components/product/ProductCard.tsx` (update from VS-05) |

---

### VS-04 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `GET /api/products/[slug]` | `app/api/products/[slug]/route.ts` (update: add variants) |

**Drizzle schema** (add to `drizzle/schema.ts`)

```typescript
export const productVariants = pgTable('product_variants', {
  id:                 serial('id').primaryKey(),
  productId:          integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku:                varchar('sku', { length: 100 }).notNull().unique(),
  size:               varchar('size', { length: 30 }),
  color:              varchar('color', { length: 50 }),
  material:           varchar('material', { length: 80 }),
  priceOverride:      numeric('price_override', { precision: 10, scale: 2 }),
  stock:              integer('stock').notNull().default(0),
  lowStockThreshold:  integer('low_stock_threshold').default(5),
  createdAt:          timestamp('created_at').defaultNow()
})
// Also: ALTER product_images ADD FK to product_variants (raw SQL in migration)
```

**Frontend files**

| Component | File |
|---|---|
| Variant selector | `components/product/VariantSelector.tsx` |
| PDP page update | `app/[category]/[slug]/page.tsx` |

---

### VS-06 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `GET /api/search/autocomplete` | `app/api/search/autocomplete/route.ts` |

> No new schema. Uses `products` + `tags` from Wave 1.

**Frontend files**

| Component | File |
|---|---|
| Search bar with autocomplete | `components/layout/SearchBar.tsx` |

---

### VS-09 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `POST /api/auth/login` | `app/api/auth/login/route.ts` |
| `POST /api/auth/logout` | `app/api/auth/logout/route.ts` |
| `POST /api/auth/token/refresh` | `app/api/auth/token/refresh/route.ts` |

**Drizzle schema update** (add columns to `users` in new migration)

```typescript
// Add via raw SQL migration — Drizzle alter table
export const usersV2 = pgTable('users', {
  // ... existing columns from VS-08 ...
  refreshTokenHash: text('refresh_token_hash'),
  refreshTokenExp:  timestamp('refresh_token_exp')
})
```

**Auth middleware** — `lib/auth.ts` (used by all protected routes)

```typescript
import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function verifyAccessToken(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
    return payload as { userId: number; role: string }
  } catch { return null }
}
```

**Frontend files**

| Component | File |
|---|---|
| Login page | `app/(auth)/login/page.tsx` |
| Auth context / store | `lib/useAuth.ts` (client-side session state) |

---

### VS-10 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `POST /api/auth/otp/request` | `app/api/auth/otp/request/route.ts` |
| `POST /api/auth/otp/verify` | `app/api/auth/otp/verify/route.ts` |

**Drizzle schema update** (add columns to `users`)

```typescript
// Add via migration
// otpHash TEXT, otpExp TIMESTAMPTZ, otpAttempts INTEGER DEFAULT 0
```

**Frontend files**

| Component | File |
|---|---|
| OTP flow component | `components/auth/OtpFlow.tsx` |
| Register page update | `app/(auth)/register/page.tsx` (add OTP tab) |

---

## Wave 2 — Done Checklist

All five must be checked before Wave 3 begins:

- [ ] VS-02 merged — category listing shows paginated products from real DB
- [ ] VS-04 merged — variant selector on PDP, OOS state works
- [ ] VS-06 merged — autocomplete dropdown fires on typing with debounce
- [ ] VS-09 merged — email login works, JWT + refresh token flow verified
- [ ] VS-10 merged — phone OTP flow works, new + existing user paths tested
- [ ] `product_variants` migration applied, FK on `product_images` wired
- [ ] Refresh token columns on `users` applied
- [ ] OTP columns on `users` applied
- [ ] All migrations applied cleanly on staging
- [ ] TC-01, TC-12, TC-13, TC-03, TC-50, TC-49 pass on staging
- [ ] No P0 or P1 defects open

---

*Wave 2 Vertical Slices v1.1 — Stack: Next.js + Drizzle + Vercel Postgres — June 25, 2026*  
*Next: docs/slices/wave3.md*
