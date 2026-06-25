# WAVE 3 — VERTICAL SLICES DETAIL

**Wave:** 3 of 9  
**Status:** Filtering, Auth Extras, Cart Entry, Admin Auth  
**Slices:** 6  
**Max Parallel Developers:** 6 (peak parallelism)  
**Branch prefix:** `feature/vs-XX-*`  
**Merge target:** `main`  
**Depends on:** Wave 2 (all 5 slices merged and passing)  
**References:** WAVE_EXECUTION_PLAN v1.0

> Wave 3 starts only after VS-02, VS-04, VS-06, VS-09, VS-10 are all merged to `main`.  
> All 6 slices are independent of each other — maximum parallel execution.

---

## Wave 3 Slices at a Glance

| Slice | Name | Depends On | DB Tables | UAT Cases | Est. Days |
|---|---|---|---|---|---|
| VS-07 | Filters + sort on listing | VS-02 | `PRODUCT`, `PRODUCT_VARIANT` | TC-06 to TC-11 | 2–3 |
| VS-11 | Forgot password + reset link | VS-08, VS-09 | `USER` | TC-51 | 1–2 |
| VS-12 | Guest add-to-cart (session) | VS-03, VS-04 | `CART`, `CART_ITEM` | TC-19 | 2 |
| VS-15 | Wishlist — add / remove / move | VS-09, VS-04 | `WISHLIST_ITEM` | TC-24 to TC-26 | 1–2 |
| VS-27 | Admin login + RBAC middleware | VS-09 | `USER` | TC-65, TC-79, TC-80 | 2 |
| VS-43 | Customer review submit + display | VS-09, VS-03 | `REVIEW` | TC-17 | 2 |

---

---

## VS-07 — Filters + Sort on Listing

**Branch:** `feature/vs-07-listing-filters`  
**Layer:** Backend API update + Frontend filter sidebar  
**DB Tables:** `PRODUCT` (read), `PRODUCT_VARIANT` (read)  
**Depends on:** VS-02 (listing endpoint exists), VS-04 (variants exist)

### Goal
A customer on a category listing page can filter by price range, size, color, material, and on-sale toggle — and sort by relevance, price, newest, or bestsellers. Results update without a full page reload.

### No New DB Tables
Extends the existing `GET /api/categories/:slug/products` endpoint from VS-02 with additional optional query params.

### API Changes

**Add filter params to** `GET /api/categories/:slug/products`:

| New Param | Type | Example | Description |
|---|---|---|---|
| `price_min` | decimal | `500` | Minimum price (inclusive) |
| `price_max` | decimal | `2000` | Maximum price (inclusive) |
| `size` | string (multi) | `M,L` | Comma-separated sizes |
| `color` | string (multi) | `Red,Blue` | Comma-separated colors |
| `material` | string (multi) | `Silk` | Comma-separated materials |
| `on_sale` | boolean | `true` | Only products with sale_price set |
| `sort` | string | `price_asc` | Already existed in VS-02 |

**Filter logic (SQL additions to VS-02 base query)**

```sql
-- Price filter: use effective price (sale_price if set, else base_price)
AND COALESCE(p.sale_price, p.base_price) BETWEEN $price_min AND $price_max

-- Size filter (any variant of the product matches)
AND EXISTS (
  SELECT 1 FROM product_variants pv
  WHERE pv.product_id = p.id AND pv.size = ANY($sizes)
)

-- Color filter
AND EXISTS (
  SELECT 1 FROM product_variants pv
  WHERE pv.product_id = p.id AND pv.color = ANY($colors)
)

-- On sale filter
AND p.sale_price IS NOT NULL
```

**Also add a facet endpoint** to populate filter options dynamically:

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/categories/:slug/facets` | Public | Available filter values for this category |

```json
{
  "price_range": { "min": 299, "max": 8999 },
  "sizes": ["S", "M", "L", "XL", "Free Size"],
  "colors": ["Red", "Blue", "Green", "Black", "White"],
  "materials": ["Silk", "Cotton", "Chiffon", "Georgette"]
}
```

Facets are computed from active products + their variants in this category tree. Used to populate filter checkboxes and price slider bounds.

### Frontend

**Filter sidebar** (desktop: left sidebar; mobile: bottom sheet triggered by "Filters" button)

| Filter | UI Control |
|---|---|
| Price Range | Dual-handle slider; min/max inputs |
| Size | Multi-select checkbox group |
| Color | Color swatch grid (multi-select) |
| Material | Multi-select checkbox group |
| On Sale | Toggle switch |

**Behaviour**
- Filters are applied on change (no "Apply" button — instant update).
- URL updates with filter params: `/womens-wear/sarees?size=M,L&color=Red&on_sale=true`
- Shareable / bookmarkable filtered URLs.
- Active filters shown as removable chips above the product grid.
- Clicking ✕ on a chip removes that filter.
- "Clear All" button removes all filters.
- Sort dropdown stays in top-right, works alongside filters.
- Filter sidebar fetches facets from `/api/categories/:slug/facets` on page load.

### Acceptance Criteria (from UAT TC-06 to TC-11)

- [ ] Price slider filters to products in range. (TC-06)
- [ ] Size checkbox filters to products with that variant size. (TC-07)
- [ ] Color swatch filters correctly. (TC-08)
- [ ] Multiple filters combined: only products matching ALL filters shown. (TC-09)
- [ ] Removing a chip removes only that filter; others stay. (TC-10)
- [ ] Sort "Price: Low to High" orders correctly alongside active filters. (TC-11)
- [ ] URL reflects all active filters; refreshing page restores same filtered state.
- [ ] "Clear All" resets to unfiltered listing.

### Definition of Done

- `/api/categories/:slug/products` accepts and applies all filter params.
- `/api/categories/:slug/facets` returns correct values.
- Filter sidebar renders, updates results on change.
- Filter state reflected in URL.
- PR passes TC-06 to TC-11.
- Merged to `main`.

---

---

## VS-11 — Forgot Password + Reset Link

**Branch:** `feature/vs-11-forgot-password`  
**Layer:** Backend API + Frontend 2-step form  
**DB Tables:** `USER` (read + update)  
**Depends on:** VS-08 (USER table), VS-09 (password hashing established)

### Goal
A customer who forgot their password can request a reset link via email and set a new password.

### No New DB Tables
Add two columns to `users`:

```sql
ALTER TABLE users
  ADD COLUMN reset_token_hash TEXT,
  ADD COLUMN reset_token_exp  TIMESTAMPTZ;
```

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/password/forgot` | Public | Request reset link |
| `POST` | `/api/auth/password/reset` | Public | Set new password via token |

**POST /api/auth/password/forgot — Request**
```json
{ "email": "priya@example.com" }
```

**Always returns HTTP 200** regardless of whether email exists:
```json
{ "message": "If that email is registered, a reset link has been sent." }
```
> Reason: never confirm whether an email is registered (user enumeration prevention).

**Internally:**
- If email found: generate 32-byte random token, store `bcrypt(token)` + 15-min TTL in `users`.
- Send email with link: `https://[domain]/reset-password?token=[raw_token]&email=[email]`
- **Stub in Wave 3: `console.log` the link.** Real email wired in VS-36 (Wave 7).
- If email not found: do nothing but still return 200.

**POST /api/auth/password/reset — Request**
```json
{
  "email": "priya@example.com",
  "token": "a3f9...",
  "password": "NewSecurePass456"
}
```

**Success — HTTP 200**
```json
{ "message": "Password updated. You can now log in." }
```

**Errors**

| Case | HTTP | Message |
|---|---|---|
| Token not found / invalid | 400 | "Invalid or expired reset link." |
| Token expired (> 15 min) | 400 | "Invalid or expired reset link." |
| Password < 8 chars | 422 | "Password must be at least 8 characters." |

On success: clear `reset_token_hash` and `reset_token_exp` from DB.  
Invalidate any existing refresh tokens (clear `refresh_token_hash`) — forces re-login with new password.

### Frontend

**Step 1 — Forgot Password page** (`/forgot-password`)
- Email input + "Send Reset Link" button.
- On submit: always show "Check your email for a reset link." (same message regardless of result).

**Step 2 — Reset Password page** (`/reset-password?token=...&email=...`)
- New Password + Confirm Password fields.
- "Update Password" button.
- On success: "Password updated. Go to Login" link.
- On invalid/expired token: "This link is invalid or has expired. Request a new one." with link back to `/forgot-password`.

### Acceptance Criteria (from UAT TC-51)

- [ ] Valid email → success message shown; link logged to console (Wave 3 stub).
- [ ] Non-existent email → same success message (no user enumeration).
- [ ] Clicking reset link → reset password form shown.
- [ ] Valid new password → password updated, login with new password works.
- [ ] Old password no longer works after reset.
- [ ] Expired token (> 15 min) → "Invalid or expired" error.
- [ ] Token used twice → second use shows "Invalid or expired".

### Definition of Done

- Reset token columns added to users.
- Both API endpoints work.
- Reset invalidates old refresh tokens.
- Frontend 2-step flow works.
- Link console-logged (real email Wave 7).
- PR passes TC-51.
- Merged to `main`.

---

---

## VS-12 — Guest Add-to-Cart (Session)

**Branch:** `feature/vs-12-guest-cart`  
**Layer:** Backend API + Frontend cart UI  
**DB Tables:** `CART`, `CART_ITEM` (create)  
**Depends on:** VS-03 (products exist), VS-04 (variants exist)

### Goal
A guest (not logged in) can add products to a cart. The cart persists for the browser session and survives page refreshes. No login required.

### Database Schema (new tables)

```sql
CREATE TABLE carts (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,  -- NULL for guest
  session_id  VARCHAR(128),                                -- for guest carts
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cart_owner CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR
    (user_id IS NULL AND session_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_carts_session ON carts(session_id) WHERE session_id IS NOT NULL;
CREATE UNIQUE INDEX idx_carts_user    ON carts(user_id)    WHERE user_id IS NOT NULL;

CREATE TABLE cart_items (
  id         SERIAL PRIMARY KEY,
  cart_id    INT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  qty        INT NOT NULL DEFAULT 1 CHECK (qty > 0),
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cart_id, variant_id)
);
```

### Session ID Strategy

- On first cart action for a guest: generate a `uuid v4` session ID server-side.
- Return it in response and store in a `cart_session` httpOnly cookie (30-day TTL).
- All subsequent guest cart requests send this cookie.
- No localStorage — keeps cart server-side, survives browser refresh.

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cart` | Guest or Auth | Get current cart |
| `POST` | `/api/cart/items` | Guest or Auth | Add item to cart |
| `PATCH` | `/api/cart/items/:id` | Guest or Auth | Update item qty |
| `DELETE` | `/api/cart/items/:id` | Guest or Auth | Remove item |

**Cart resolution middleware:** Before each cart endpoint, resolve the cart:
- If request has `Authorization` header → find cart by `user_id`.
- Else if request has `cart_session` cookie → find cart by `session_id`.
- Else → create new guest cart, set cookie.

**GET /api/cart — Response**
```json
{
  "cart_id": 7,
  "items": [
    {
      "id": 3,
      "variant_id": 11,
      "product_name": "Banarasi Silk Saree",
      "variant_label": "Free Size / Red",
      "qty": 2,
      "unit_price": "1999.00",
      "primary_image": "https://...",
      "in_stock": true,
      "line_total": "3998.00"
    }
  ],
  "subtotal": "3998.00",
  "item_count": 2
}
```

**POST /api/cart/items — Request**
```json
{ "variant_id": 11, "qty": 1 }
```

- If variant already in cart: increment qty by requested amount.
- If `qty` would exceed `product_variants.stock`: cap at stock, return warning.
- If variant `stock = 0`: return 422 "This item is out of stock."

**PATCH /api/cart/items/:id — Request**
```json
{ "qty": 3 }
```

- `qty = 0` is not allowed (use DELETE instead).
- Cap at available stock.

### Frontend

**"Add to Cart" button on PDP** (was disabled in VS-04 — now wire it up)
- On click: POST to `/api/cart/items` with selected variant ID and qty 1.
- Success: show toast "Added to cart ✓" and increment mini-cart badge in header.
- Error (OOS): show toast "Sorry, this item is out of stock."

**Mini-cart (header flyout)**
- Shows cart item count badge on cart icon.
- On hover/click: flyout panel with item list, subtotals, "View Cart" and "Checkout" buttons.
- "View Cart" → `/cart` page.

**Full cart page** (`/cart`)
- Item list: image, name, variant label, qty stepper, unit price, line total, remove button.
- Cart summary: subtotal, "Proceed to Checkout" button (navigates to checkout — Wave 4+).
- Empty cart state: "Your cart is empty. Browse products."
- Coupon field: renders but shows "Coming soon" placeholder (VS-16 Wave 5 wires it).

### Acceptance Criteria (from UAT TC-19)

- [ ] Guest clicks "Add to Cart" on PDP → item appears in cart. (TC-19)
- [ ] Cart persists on page refresh (session cookie).
- [ ] Qty stepper updates line total correctly.
- [ ] Remove button removes item.
- [ ] Adding same variant twice → qty increments (no duplicate row).
- [ ] Adding OOS variant → error message, cart unchanged.
- [ ] Mini-cart badge shows correct item count.
- [ ] Empty cart shows empty state.

### Definition of Done

- `carts` + `cart_items` tables created.
- Session cookie issued on first cart action.
- All 4 cart endpoints work for guest session.
- "Add to Cart" on PDP functional.
- Mini-cart flyout shows live data.
- Full cart page renders correctly.
- PR passes TC-19.
- Merged to `main`.

---

---

## VS-15 — Wishlist (Add / Remove / Move to Cart)

**Branch:** `feature/vs-15-wishlist`  
**Layer:** Backend API + Frontend wishlist UI  
**DB Tables:** `WISHLIST_ITEM` (create)  
**Depends on:** VS-09 (auth middleware), VS-04 (variants exist)

### Goal
A logged-in customer can save product variants to a wishlist, view them, and move items to cart.

### Database Schema (new table)

```sql
CREATE TABLE wishlist_items (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, variant_id)
);

CREATE INDEX idx_wishlist_user ON wishlist_items(user_id);
```

### API Endpoints

All endpoints require auth (`verifyAccessToken` middleware from VS-09).

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/wishlist` | Required | Get user's wishlist |
| `POST` | `/api/wishlist` | Required | Add variant to wishlist |
| `DELETE` | `/api/wishlist/:id` | Required | Remove from wishlist |
| `POST` | `/api/wishlist/:id/move-to-cart` | Required | Move to cart |

**GET /api/wishlist — Response**
```json
{
  "items": [
    {
      "id": 5,
      "variant_id": 11,
      "product_name": "Banarasi Silk Saree",
      "variant_label": "Free Size / Red",
      "primary_image": "https://...",
      "effective_price": "1999.00",
      "in_stock": true,
      "added_at": "2026-06-25T10:00:00Z"
    }
  ]
}
```

**POST /api/wishlist — Request**
```json
{ "variant_id": 11 }
```
- If already wishlisted: return 200 (idempotent, no error).

**POST /api/wishlist/:id/move-to-cart**
- Adds variant to cart (calls same cart logic as VS-12).
- Removes item from wishlist.
- Returns updated cart summary.
- If OOS: returns 422, item stays in wishlist.

### Frontend

**Wishlist icon on product cards and PDP**
- Heart icon (outline = not wishlisted, filled = wishlisted).
- Click when logged in → toggle wishlist.
- Click when not logged in → redirect to `/login?redirect=[current-url]` with message "Log in to save to wishlist."

**My Wishlist page** (`/account/wishlist`)
- Grid of saved products: image, name, variant, price, stock status.
- "Move to Cart" button per item → calls move-to-cart API.
- Remove button (heart icon) → removes from wishlist.
- If OOS: "Out of Stock" badge; "Move to Cart" disabled.
- Empty state: "Your wishlist is empty. Start browsing."

### Acceptance Criteria (from UAT TC-24 to TC-26)

- [ ] Logged-in user clicks heart icon → item saved, icon turns filled. (TC-24)
- [ ] Guest clicks heart icon → redirected to login with correct redirect back. (TC-25)
- [ ] "Move to Cart" moves item to cart and removes from wishlist. (TC-26)
- [ ] Clicking filled heart again → removes from wishlist.
- [ ] OOS item in wishlist shows badge; "Move to Cart" disabled.
- [ ] Wishlist persists across sessions (server-side, not localStorage).

### Definition of Done

- `wishlist_items` table created.
- All 4 API endpoints work.
- Heart icon on PDP and listing cards toggles correctly.
- Guest prompt redirects to login.
- Wishlist page functional.
- Move-to-cart works and removes from wishlist.
- PR passes TC-24 to TC-26.
- Merged to `main`.

---

---

## VS-27 — Admin Login + RBAC Middleware

**Branch:** `feature/vs-27-admin-auth`  
**Layer:** Backend middleware + Frontend admin login page  
**DB Tables:** `USER` (read only — role field)  
**Depends on:** VS-09 (JWT infrastructure established)

### Goal
Admin staff can log in at `/admin/login`. A shared RBAC middleware enforces role-based access on every admin route. No admin features are built yet — just the auth gate that all future admin slices will use.

### No New DB Tables
Uses existing `users` table. Admin users must have `role` set to `super_admin`, `manager`, or `inventory_staff` (set via seed data / direct DB for now — admin user management UI is Wave 6+).

### Seed Data

```sql
INSERT INTO users (name, email, password_hash, role, email_verified)
VALUES
  ('Super Admin', 'admin@store.com',    '$2b$12$...', 'super_admin',    TRUE),
  ('Manager',     'manager@store.com',  '$2b$12$...', 'manager',        TRUE),
  ('Inventory',   'inventory@store.com','$2b$12$...', 'inventory_staff',TRUE);
```

Passwords: set to known test values via bcrypt in seed script.

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/auth/login` | Public | Admin login |
| `POST` | `/api/admin/auth/logout` | Admin token | Revoke admin session |

**POST /api/admin/auth/login — Request**
```json
{ "email": "admin@store.com", "password": "AdminPass123" }
```

**Success — HTTP 200**
```json
{
  "access_token": "eyJ...",
  "expires_in": 900,
  "user": { "id": 1, "name": "Super Admin", "role": "super_admin" }
}
```

Same token mechanism as VS-09 (JWT + httpOnly refresh cookie). Separate cookie name: `admin_refresh_token`.

**Rejects login** if `role = 'customer'`. Returns 403 "Access denied."

### RBAC Middleware (the main deliverable of this slice)

Two middleware functions for all admin routes:

```
requireAdmin(req, res, next):
  → verifies JWT (reuses VS-09 verifyAccessToken)
  → rejects if role = 'customer'
  → attaches req.adminUser = { id, role }
  → calls next()

requireRole(...allowedRoles):
  → checks req.adminUser.role is in allowedRoles
  → 403 if not
  → calls next()
```

**Usage pattern for all future admin slices:**

```
router.get('/admin/orders', requireAdmin, requireRole('super_admin','manager'), handler)
router.patch('/admin/products/:id/stock', requireAdmin, requireRole('super_admin','manager','inventory_staff'), handler)
router.get('/admin/settings', requireAdmin, requireRole('super_admin'), handler)
```

**Access matrix to enforce:**

| Route Category | Allowed Roles |
|---|---|
| All admin routes | `super_admin`, `manager`, `inventory_staff` |
| Products — full CRUD | `super_admin`, `manager` |
| Products — stock only | `super_admin`, `manager`, `inventory_staff` |
| Orders | `super_admin`, `manager` |
| Customers | `super_admin`, `manager` |
| Promotions | `super_admin`, `manager` |
| Reports | `super_admin`, `manager` |
| CMS | `super_admin`, `manager` |
| Settings | `super_admin` only |

### Frontend

**Admin login page** (`/admin/login`)
- Clean, minimal form: Email + Password + "Log In" button.
- On success: redirect to `/admin` (placeholder dashboard page — just shows "Admin Dashboard — Coming in Wave 7").
- On failure: "Invalid credentials or insufficient access."

**Admin layout shell** (`/admin/*`)
- Sidebar nav with links (all lead to placeholder pages for now): Dashboard, Products, Orders, Customers, Promotions, CMS, Reports, Settings.
- Links that the current role cannot access are hidden (not just disabled — hidden).
- Logout button.

### Acceptance Criteria (from UAT TC-65, TC-79, TC-80)

- [ ] `admin@store.com` logs in → redirected to admin dashboard. (TC-65)
- [ ] Customer account (`customer1@test.com`) login rejected with 403. 
- [ ] `inventory@store.com` logged in → Orders, Customers, Reports, Settings links NOT visible. (TC-79)
- [ ] `manager@store.com` logged in → Settings link NOT visible. (TC-80)
- [ ] Direct URL to `/admin/settings` as manager → 403 response.
- [ ] Admin logout → token cleared, redirected to `/admin/login`.
- [ ] Admin session refreshes silently on page reload (refresh token).

### Definition of Done

- Seed admin users created.
- Admin login API works, rejects customer role.
- `requireAdmin` and `requireRole` middleware implemented and exported.
- Admin login page functional.
- Admin sidebar shell with role-filtered nav.
- PR passes TC-65, TC-79, TC-80.
- Merged to `main`.

---

---

## VS-43 — Customer Review Submit + Display

**Branch:** `feature/vs-43-reviews`  
**Layer:** Backend API + Frontend review section on PDP  
**DB Tables:** `REVIEW` (create)  
**Depends on:** VS-09 (auth), VS-03 (PDP and products exist)

### Goal
Logged-in customers can submit a star rating and text review for a product. Reviews display on the PDP after admin approval.

### Database Schema (new table)

```sql
CREATE TABLE reviews (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT,
  photo_url  TEXT,
  approved   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, user_id)   -- one review per product per user
);

CREATE INDEX idx_reviews_product ON reviews(product_id, approved);
```

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/products/:id/reviews` | Public | Paginated approved reviews |
| `POST` | `/api/products/:id/reviews` | Required | Submit a review |
| `GET` | `/api/admin/reviews` | Admin | List pending reviews |
| `PATCH` | `/api/admin/reviews/:id/approve` | Admin (manager+) | Approve review |
| `DELETE` | `/api/admin/reviews/:id` | Admin (manager+) | Delete review |

**GET /api/products/:id/reviews — Response**
```json
{
  "total": 12,
  "average_rating": 4.3,
  "page": 1,
  "reviews": [
    {
      "id": 3,
      "user_name": "Priya S.",
      "rating": 5,
      "body": "Beautiful saree, great quality!",
      "photo_url": null,
      "created_at": "2026-06-20T10:00:00Z"
    }
  ]
}
```

- Only `approved = TRUE` reviews returned on public endpoint.
- `user_name`: first name + last initial only (privacy).
- Sorted: most recent first.

**POST /api/products/:id/reviews — Request**
```json
{
  "rating": 4,
  "body": "Good quality fabric, fast delivery.",
  "photo_url": null
}
```

- User can only review once per product (`UNIQUE` constraint). Return 409 if already reviewed.
- No purchase verification in Wave 3 (add in post-launch if needed — ponytail: YAGNI).
- Review goes in with `approved = FALSE`. Returns: `{ "message": "Review submitted. It will appear after approval." }`

**Admin review endpoints:** Use `requireAdmin` + `requireRole('super_admin', 'manager')` from VS-27.

### Frontend

**Review section on PDP** (below product description)

**Display (public)**
- Average rating stars (e.g. ★★★★☆ 4.3 · 12 reviews).
- Paginated list of approved reviews: reviewer name, star rating, date, body.
- "Load more" button if more pages.
- "No reviews yet — be the first!" if none.

**Submit form** (logged-in users only)
- Star rating selector (click to rate 1–5).
- Text area for review body (optional, max 1000 chars).
- "Submit Review" button.
- Guest: "Log in to write a review" link shown instead of form.
- If already reviewed: "You've already reviewed this product." (no form shown).
- On submit: success message replaces form.

**Admin review moderation** (in admin sidebar → Reviews)
- List of pending reviews: product name, reviewer, rating, body, date.
- "Approve" and "Delete" buttons per review.
- No pagination needed in Wave 3 (review volume will be low initially).

### Acceptance Criteria (from UAT TC-17)

- [ ] Logged-in user submits 4-star review → success message shown; review NOT visible yet. (TC-17)
- [ ] Admin approves review → review appears on PDP.
- [ ] Average rating updates after approval.
- [ ] Guest sees "Log in to write a review" instead of form.
- [ ] User trying to review same product twice → "Already reviewed" message.
- [ ] Admin can delete a review → removed from PDP.

### Definition of Done

- `reviews` table created.
- Public review fetch and submit APIs work.
- Admin approve/delete APIs work with RBAC.
- PDP shows review section (display + submit form).
- Admin review moderation page functional.
- PR passes TC-17.
- Merged to `main`.

---

## Stack Implementation — Next.js + Drizzle + Vercel Postgres

---

### VS-07 — Next.js File Paths

**API files**

| Endpoint | File |
|---|---|
| `GET /api/categories/[slug]/products` | `app/api/categories/[slug]/products/route.ts` (add filter params) |
| `GET /api/categories/[slug]/facets` | `app/api/categories/[slug]/facets/route.ts` |

> No new schema. Filter params are query-string additions to VS-02's existing route handler.

**Frontend files**

| Component | File |
|---|---|
| Filter sidebar | `components/catalog/FilterSidebar.tsx` |
| Filter chips | `components/catalog/ActiveFilters.tsx` |
| Listing page update | `app/[category]/page.tsx` + `app/[category]/[subcategory]/page.tsx` |

---

### VS-11 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `POST /api/auth/password/forgot` | `app/api/auth/password/forgot/route.ts` |
| `POST /api/auth/password/reset` | `app/api/auth/password/reset/route.ts` |

**Drizzle schema update** (add columns to `users`)

```typescript
// Add via migration
// resetTokenHash TEXT, resetTokenExp TIMESTAMPTZ
```

**Frontend files**

| Component | File |
|---|---|
| Forgot password page | `app/(auth)/forgot-password/page.tsx` |
| Reset password page | `app/(auth)/reset-password/page.tsx` |

---

### VS-12 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `GET /api/cart` | `app/api/cart/route.ts` |
| `POST /api/cart/items` | `app/api/cart/items/route.ts` |
| `PATCH /api/cart/items/[id]` | `app/api/cart/items/[id]/route.ts` |
| `DELETE /api/cart/items/[id]` | `app/api/cart/items/[id]/route.ts` |

**Drizzle schema** (add to `drizzle/schema.ts`)

```typescript
export const carts = pgTable('carts', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 128 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const cartItems = pgTable('cart_items', {
  id:        serial('id').primaryKey(),
  cartId:    integer('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  qty:       integer('qty').notNull().default(1),
  addedAt:   timestamp('added_at').defaultNow()
}, (t) => ({ uniq: unique().on(t.cartId, t.variantId) }))
```

**Cart resolution middleware** — `lib/cart.ts`

```typescript
// Resolves or creates cart from auth header or cart_session cookie
export async function resolveCart(req: NextRequest): Promise<{ cartId: number; sessionId?: string }>
```

**Frontend files**

| Component | File |
|---|---|
| Cart page | `app/cart/page.tsx` |
| Mini-cart flyout | `components/cart/MiniCart.tsx` |
| Cart item row | `components/cart/CartItem.tsx` |

---

### VS-15 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `GET /api/wishlist` | `app/api/wishlist/route.ts` |
| `POST /api/wishlist` | `app/api/wishlist/route.ts` |
| `DELETE /api/wishlist/[id]` | `app/api/wishlist/[id]/route.ts` |
| `POST /api/wishlist/[id]/move-to-cart` | `app/api/wishlist/[id]/move-to-cart/route.ts` |

**Drizzle schema** (add to `drizzle/schema.ts`)

```typescript
export const wishlistItems = pgTable('wishlist_items', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  addedAt:   timestamp('added_at').defaultNow()
}, (t) => ({ uniq: unique().on(t.userId, t.variantId) }))
```

**Frontend files**

| Component | File |
|---|---|
| Wishlist page | `app/account/wishlist/page.tsx` |
| Wishlist heart button | `components/product/WishlistButton.tsx` |

---

### VS-27 — Next.js File Paths

**API files**

| Endpoint | File |
|---|---|
| `POST /api/admin/auth/login` | `app/api/admin/auth/login/route.ts` |
| `POST /api/admin/auth/logout` | `app/api/admin/auth/logout/route.ts` |

**RBAC middleware** — `lib/adminAuth.ts` (imported by all admin route handlers)

```typescript
import { verifyAccessToken } from './auth'

export async function requireAdmin(req: NextRequest) {
  const user = await verifyAccessToken(req)
  if (!user || user.role === 'customer') return null
  return user
}

export function requireRole(user: { role: string }, ...roles: string[]) {
  return roles.includes(user.role)
}
```

**Frontend files**

| Component | File |
|---|---|
| Admin login page | `app/admin/login/page.tsx` |
| Admin layout + sidebar | `app/admin/layout.tsx` |
| Admin dashboard shell | `app/admin/page.tsx` |

---

### VS-43 — Next.js File Paths + Drizzle Schema

**API files**

| Endpoint | File |
|---|---|
| `GET /api/products/[id]/reviews` | `app/api/products/[id]/reviews/route.ts` |
| `POST /api/products/[id]/reviews` | `app/api/products/[id]/reviews/route.ts` |
| `GET /api/admin/reviews` | `app/api/admin/reviews/route.ts` |
| `PATCH /api/admin/reviews/[id]/approve` | `app/api/admin/reviews/[id]/approve/route.ts` |
| `DELETE /api/admin/reviews/[id]` | `app/api/admin/reviews/[id]/route.ts` |

**Drizzle schema** (add to `drizzle/schema.ts`)

```typescript
import { smallint } from 'drizzle-orm/pg-core'

export const reviews = pgTable('reviews', {
  id:        serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId:    integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating:    smallint('rating').notNull(),
  body:      text('body'),
  photoUrl:  text('photo_url'),
  approved:  boolean('approved').default(false),
  createdAt: timestamp('created_at').defaultNow()
}, (t) => ({ uniq: unique().on(t.productId, t.userId) }))
```

**Frontend files**

| Component | File |
|---|---|
| Review section on PDP | `components/product/ReviewSection.tsx` |
| Review submit form | `components/product/ReviewForm.tsx` |
| Admin reviews page | `app/admin/reviews/page.tsx` |

---

## Wave 3 — Done Checklist

All six must be checked before Wave 4 begins:

- [ ] VS-07 merged — filters and sort work on listing, URL reflects state
- [ ] VS-11 merged — forgot/reset password flow functional (link console-logged)
- [ ] VS-12 merged — guest can add to cart, cart persists via session cookie
- [ ] VS-15 merged — wishlist add/remove/move-to-cart works for logged-in users
- [ ] VS-27 merged — admin login works, RBAC middleware available for all future admin routes
- [ ] VS-43 merged — reviews submit and display after admin approval
- [ ] `carts` + `cart_items` migration applied
- [ ] `wishlist_items` migration applied
- [ ] `reviews` migration applied
- [ ] `users` reset token columns applied (VS-11)
- [ ] Admin seed users created on staging
- [ ] All migrations applied cleanly on staging
- [ ] TC-06 to TC-11, TC-51, TC-19, TC-24 to TC-26, TC-65, TC-79, TC-80, TC-17 pass on staging
- [ ] No P0 or P1 defects open

---

*Wave 3 Vertical Slices v1.1 — Stack: Next.js + Drizzle + Vercel Postgres — June 25, 2026*  
*Next: docs/slices/wave4.md*
