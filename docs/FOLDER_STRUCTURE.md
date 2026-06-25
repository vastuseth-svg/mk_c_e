# FOLDER STRUCTURE

**Project:** Cloth Store E-Commerce Website  
**Stack:** Next.js 14 App Router · Drizzle ORM · Vercel Postgres · Vercel Blob  
**Version:** 1.0  
**Date:** June 25, 2026

---

## Root Layout

```
clothweb/                          ← project root (one repo, one Vercel deployment)
├── app/                           ← Next.js App Router (pages + API routes)
├── components/                    ← shared UI components
├── lib/                           ← shared utilities and DB client
├── drizzle/                       ← DB schema + migrations
├── public/                        ← static assets (logo, icons, og-image)
├── docs/                          ← project documentation
│   └── slices/                    ← wave slice detail files
├── .env.local                     ← local env vars (never committed)
├── drizzle.config.ts              ← Drizzle migration config
├── next.config.ts                 ← Next.js config
├── tailwind.config.ts             ← (if added later)
└── package.json
```

---

## `/app` — Pages + API Routes

```
app/
│
├── layout.tsx                     ← root layout (fonts, global CSS, providers)
├── page.tsx                       ← homepage (banners, featured products)
│
├── (store)/                       ← route group: customer-facing (shares store layout)
│   ├── layout.tsx                 ← store layout (header nav, footer, mini-cart)
│   │
│   ├── [category]/
│   │   ├── page.tsx               ← root category listing (VS-02)
│   │   └── [subcategory]/
│   │       ├── page.tsx           ← sub-category listing (VS-02)
│   │       └── [slug]/
│   │           └── page.tsx       ← product detail page / PDP (VS-03, VS-04)
│   │
│   ├── search/
│   │   └── page.tsx               ← search results (VS-05)
│   │
│   ├── cart/
│   │   └── page.tsx               ← full cart page (VS-12)
│   │
│   ├── checkout/
│   │   └── page.tsx               ← checkout (address → shipping → payment) (VS-17–VS-20)
│   │
│   └── account/                   ← protected: customer account pages
│       ├── layout.tsx             ← account layout (sidebar nav)
│       ├── page.tsx               ← profile (VS-07 accounts)
│       ├── addresses/
│       │   └── page.tsx           ← saved addresses (VS-07 accounts)
│       ├── orders/
│       │   ├── page.tsx           ← order history (VS-22)
│       │   └── [id]/
│       │       └── page.tsx       ← order detail + tracking (VS-23, VS-26)
│       └── wishlist/
│           └── page.tsx           ← wishlist (VS-15)
│
├── (auth)/                        ← route group: auth pages (no store header)
│   ├── layout.tsx                 ← minimal centered layout
│   ├── login/
│   │   └── page.tsx               ← login (VS-09)
│   ├── register/
│   │   └── page.tsx               ← register email + OTP tabs (VS-08, VS-10)
│   ├── forgot-password/
│   │   └── page.tsx               ← forgot password (VS-11)
│   ├── reset-password/
│   │   └── page.tsx               ← reset password (VS-11)
│   └── verify-email/
│       └── page.tsx               ← email verification (VS-08)
│
├── admin/                         ← protected: admin panel
│   ├── layout.tsx                 ← admin layout (sidebar, role-filtered nav) (VS-27)
│   ├── login/
│   │   └── page.tsx               ← admin login (VS-27)
│   ├── page.tsx                   ← dashboard overview (VS-12 admin)
│   ├── products/
│   │   ├── page.tsx               ← product list (VS-28)
│   │   ├── new/
│   │   │   └── page.tsx           ← create product (VS-28)
│   │   └── [id]/
│   │       └── page.tsx           ← edit product + variants (VS-28, VS-29)
│   ├── orders/
│   │   ├── page.tsx               ← order list (VS-31)
│   │   └── [id]/
│   │       └── page.tsx           ← order detail + status + AWB (VS-31, VS-32)
│   ├── customers/
│   │   ├── page.tsx               ← customer list
│   │   └── [id]/
│   │       └── page.tsx           ← customer detail
│   ├── promotions/
│   │   ├── page.tsx               ← coupons + campaigns (VS-34)
│   │   └── new/
│   │       └── page.tsx
│   ├── reviews/
│   │   └── page.tsx               ← review moderation (VS-43)
│   ├── cms/
│   │   ├── banners/
│   │   │   └── page.tsx           ← banner management (VS-41)
│   │   └── pages/
│   │       └── [slug]/
│   │           └── page.tsx       ← static page editor (VS-42)
│   ├── reports/
│   │   └── page.tsx               ← sales + bestseller reports (VS-35)
│   └── settings/
│       └── page.tsx               ← store settings (super_admin only)
│
└── api/                           ← all API route handlers
    ├── auth/
    │   ├── register/
    │   │   └── route.ts           ← POST (VS-08)
    │   ├── login/
    │   │   └── route.ts           ← POST (VS-09)
    │   ├── logout/
    │   │   └── route.ts           ← POST (VS-09)
    │   ├── token/
    │   │   └── refresh/
    │   │       └── route.ts       ← POST (VS-09)
    │   ├── verify-email/
    │   │   └── route.ts           ← GET (VS-08)
    │   ├── otp/
    │   │   ├── request/
    │   │   │   └── route.ts       ← POST (VS-10)
    │   │   └── verify/
    │   │       └── route.ts       ← POST (VS-10)
    │   └── password/
    │       ├── forgot/
    │       │   └── route.ts       ← POST (VS-11)
    │       └── reset/
    │           └── route.ts       ← POST (VS-11)
    │
    ├── categories/
    │   ├── route.ts               ← GET all (VS-01)
    │   └── [slug]/
    │       ├── route.ts           ← GET single (VS-01)
    │       ├── products/
    │       │   └── route.ts       ← GET paginated + filtered (VS-02, VS-07)
    │       └── facets/
    │           └── route.ts       ← GET filter options (VS-07)
    │
    ├── products/
    │   ├── [slug]/
    │   │   └── route.ts           ← GET detail + variants (VS-03, VS-04)
    │   └── [id]/
    │       └── reviews/
    │           └── route.ts       ← GET + POST reviews (VS-43)
    │
    ├── search/
    │   ├── route.ts               ← GET results (VS-05)
    │   └── autocomplete/
    │       └── route.ts           ← GET suggestions (VS-06)
    │
    ├── cart/
    │   ├── route.ts               ← GET cart (VS-12)
    │   ├── items/
    │   │   ├── route.ts           ← POST add item (VS-12)
    │   │   └── [id]/
    │   │       └── route.ts       ← PATCH qty, DELETE item (VS-12)
    │   ├── merge/
    │   │   └── route.ts           ← POST merge guest cart (VS-14)
    │   └── coupon/
    │       └── route.ts           ← POST apply coupon (VS-16)
    │
    ├── wishlist/
    │   ├── route.ts               ← GET + POST (VS-15)
    │   └── [id]/
    │       ├── route.ts           ← DELETE (VS-15)
    │       └── move-to-cart/
    │           └── route.ts       ← POST (VS-15)
    │
    ├── checkout/
    │   ├── shipping-rates/
    │   │   └── route.ts           ← GET (VS-18)
    │   └── orders/
    │       ├── route.ts           ← POST create order (VS-19)
    │       └── [id]/
    │           └── confirm/
    │               └── route.ts   ← POST payment confirm webhook (VS-19, VS-20)
    │
    ├── orders/
    │   ├── route.ts               ← GET order history (VS-22)
    │   └── [id]/
    │       ├── route.ts           ← GET order detail (VS-23)
    │       ├── cancel/
    │       │   └── route.ts       ← POST (VS-24)
    │       └── return/
    │           └── route.ts       ← POST (VS-25)
    │
    ├── me/
    │   ├── route.ts               ← GET + PATCH profile (VS-07 accounts)
    │   └── addresses/
    │       ├── route.ts           ← GET + POST (VS-07 accounts)
    │       └── [id]/
    │           └── route.ts       ← PATCH + DELETE (VS-07 accounts)
    │
    ├── restock-alerts/
    │   └── route.ts               ← POST (VS-40)
    │
    ├── pincodes/
    │   └── [pin]/
    │       └── route.ts           ← GET city/state lookup (VS-17)
    │
    ├── upload/
    │   └── route.ts               ← POST image → Vercel Blob (VS-03, VS-28)
    │
    └── admin/
        ├── auth/
        │   ├── login/
        │   │   └── route.ts       ← POST (VS-27)
        │   └── logout/
        │       └── route.ts       ← POST (VS-27)
        ├── products/
        │   ├── route.ts           ← GET list, POST create (VS-28)
        │   ├── import/
        │   │   └── route.ts       ← POST CSV import (VS-30)
        │   ├── export/
        │   │   └── route.ts       ← GET CSV export (VS-30)
        │   └── [id]/
        │       ├── route.ts       ← GET, PATCH, DELETE (VS-28)
        │       └── variants/
        │           └── route.ts   ← GET, POST variants (VS-29)
        ├── orders/
        │   ├── route.ts           ← GET list (VS-31)
        │   └── [id]/
        │       ├── route.ts       ← GET detail (VS-31)
        │       ├── status/
        │       │   └── route.ts   ← PATCH status (VS-31)
        │       ├── shipment/
        │       │   └── route.ts   ← POST AWB (VS-32)
        │       ├── refund/
        │       │   └── route.ts   ← POST refund (VS-33)
        │       └── invoice/
        │           └── route.ts   ← GET PDF (VS-19)
        ├── reviews/
        │   ├── route.ts           ← GET pending (VS-43)
        │   └── [id]/
        │       ├── approve/
        │       │   └── route.ts   ← PATCH (VS-43)
        │       └── route.ts       ← DELETE (VS-43)
        ├── coupons/
        │   ├── route.ts           ← GET + POST (VS-34)
        │   └── [id]/
        │       └── route.ts       ← PATCH + DELETE (VS-34)
        ├── campaigns/
        │   ├── route.ts           ← GET + POST (VS-34)
        │   └── [id]/
        │       └── route.ts       ← PATCH + DELETE (VS-34)
        ├── banners/
        │   ├── route.ts           ← GET + POST (VS-41)
        │   └── [id]/
        │       └── route.ts       ← PATCH + DELETE (VS-41)
        ├── pages/
        │   ├── route.ts           ← GET list (VS-42)
        │   └── [id]/
        │       └── route.ts       ← GET + PATCH (VS-42)
        ├── customers/
        │   ├── route.ts           ← GET list
        │   └── [id]/
        │       └── route.ts       ← GET detail
        ├── reports/
        │   ├── sales/
        │   │   └── route.ts       ← GET (VS-35)
        │   └── bestsellers/
        │       └── route.ts       ← GET (VS-35)
        └── stats/
            └── route.ts           ← GET dashboard widgets (VS-12 admin)
```

---

## `/components` — Shared UI

```
components/
├── layout/
│   ├── NavMenu.tsx                ← category mega-menu (VS-01)
│   ├── SearchBar.tsx              ← search bar + autocomplete (VS-06)
│   ├── MiniCart.tsx               ← header cart flyout (VS-12)
│   ├── Header.tsx                 ← assembles nav + search + cart
│   └── Footer.tsx
│
├── product/
│   ├── ProductCard.tsx            ← listing card (VS-02, VS-05)
│   ├── ImageGallery.tsx           ← PDP image gallery + zoom (VS-03)
│   ├── VariantSelector.tsx        ← size/color selectors (VS-04)
│   ├── WishlistButton.tsx         ← heart icon toggle (VS-15)
│   ├── ReviewSection.tsx          ← display reviews + average (VS-43)
│   ├── ReviewForm.tsx             ← submit review form (VS-43)
│   └── ProductSchema.tsx          ← JSON-LD structured data (VS-03)
│
├── catalog/
│   ├── FilterSidebar.tsx          ← filter panel (VS-07)
│   ├── ActiveFilters.tsx          ← removable filter chips (VS-07)
│   └── SortDropdown.tsx           ← sort options (VS-02, VS-07)
│
├── cart/
│   ├── CartItem.tsx               ← single cart row (VS-12)
│   └── CartSummary.tsx            ← subtotal + coupon + totals (VS-12, VS-16)
│
├── checkout/
│   ├── AddressStep.tsx            ← step 1 (VS-17)
│   ├── ShippingStep.tsx           ← step 2 (VS-18)
│   └── PaymentStep.tsx            ← step 3 Razorpay (VS-20)
│
├── auth/
│   ├── OtpFlow.tsx                ← phone OTP 2-step (VS-10)
│   └── ProtectedRoute.tsx         ← redirect if not logged in
│
├── admin/
│   ├── AdminSidebar.tsx           ← role-filtered nav (VS-27)
│   └── StatsWidget.tsx            ← dashboard metric card
│
└── ui/                            ← design system primitives
    ├── Button.tsx
    ├── Input.tsx
    ├── Modal.tsx
    ├── Toast.tsx
    ├── Badge.tsx
    └── Spinner.tsx
```

---

## `/lib` — Shared Utilities

```
lib/
├── db.ts                          ← Drizzle client (POSTGRES_URL pooled)
├── auth.ts                        ← verifyAccessToken() — used by all protected API routes
├── adminAuth.ts                   ← requireAdmin(), requireRole() — used by all /admin routes
├── cart.ts                        ← resolveCart() — session or auth cart lookup
├── password.ts                    ← bcrypt hash/compare wrappers
├── jwt.ts                         ← sign/verify JWT helpers
├── gst.ts                         ← GST calculation helpers
├── razorpay.ts                    ← Razorpay SDK wrapper (VS-20)
├── shiprocket.ts                  ← Shiprocket API wrapper (VS-18, VS-32)
├── notifications.ts               ← email + WhatsApp send helpers (VS-36, VS-37)
└── useAuth.ts                     ← client-side auth hook (React context)
```

---

## `/drizzle` — Schema + Migrations

```
drizzle/
├── schema.ts                      ← ALL table definitions (one file, grows per wave)
├── migrations/                    ← auto-generated by `drizzle-kit generate`
│   ├── 0001_wave1_categories.sql
│   ├── 0002_wave1_products.sql
│   ├── 0003_wave1_tags.sql
│   ├── 0004_wave1_users.sql
│   ├── 0005_wave2_variants.sql
│   ├── 0006_wave2_users_tokens.sql
│   └── ...
└── seed.ts                        ← seed script (categories, products, admin users)
```

---

## Environment Variables (`.env.local`)

```bash
# Vercel Postgres (auto-set by Vercel integration)
POSTGRES_URL=                      # pooled — use for API routes
POSTGRES_URL_NON_POOLING=          # direct — use for migrations only

# Auth
JWT_SECRET=                        # 32+ char random string

# Vercel Blob
BLOB_READ_WRITE_TOKEN=             # auto-set by Vercel Blob integration

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Shiprocket
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=

# Notifications
BREVO_API_KEY=                     # email
MSG91_AUTH_KEY=                    # OTP SMS
WHATSAPP_BSP_TOKEN=                # WhatsApp Business API

# App
NEXT_PUBLIC_APP_URL=               # https://yourstore.vercel.app
```

---

## Key Conventions

| Convention | Rule |
|---|---|
| API routes | All in `app/api/`, one `route.ts` per URL |
| Protected customer routes | Check `verifyAccessToken()` at top of route handler |
| Protected admin routes | Check `requireAdmin()` + `requireRole()` at top |
| DB queries | Always use `db` from `lib/db.ts`, never create new connections |
| Images | Always upload to Vercel Blob, store URL in DB |
| Money | Store as `NUMERIC(10,2)` in DB, display formatted with `₹` prefix |
| Migrations | Run `npx drizzle-kit generate` then `npx drizzle-kit migrate` |
| Branch naming | `feature/vs-XX-slice-name` |
| Env vars | Never prefix with `NEXT_PUBLIC_` unless needed client-side |

---

*Folder Structure v1.0 — Stack: Next.js 14 App Router + Drizzle + Vercel Postgres — June 25, 2026*
