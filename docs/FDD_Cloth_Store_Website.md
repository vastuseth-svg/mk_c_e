# FUNCTIONAL DESIGN DOCUMENT (FDD)

**Project Title:** Modern E-Commerce Website — Cloth Store  
**Reference RFP:** RFP-CLOTH-ECOM-2026-001  
**Document Version:** 1.0  
**Date:** June 25, 2026  
**Status:** Draft

---

## 1. Purpose

This FDD translates the requirements of RFP-CLOTH-ECOM-2026-001 into a concrete description of what the system **does**, screen by screen and function by function. It is the contract between design/dev and the business owner.

---

## 2. System Overview

A multi-vendor-ready (single-vendor initially) Indian e-commerce web application for a cloth retailer. Customers browse, filter, and purchase; admins manage products, orders, and content. India-specific: Razorpay payments, GST invoicing, WhatsApp notifications, Shiprocket shipping.

**Key actors**

| Actor | What they do |
|---|---|
| Guest | Browse, search, view products |
| Registered Customer | Everything guest does + cart, checkout, wishlist, order tracking, account |
| Admin (Super Admin / Manager / Inventory Staff) | Manage products, orders, customers, promotions, content |

---

## 3. Functional Modules

### 3.1 Product Catalog

**3.1.1 Category Tree**

```
Root
├── Men's Wear (shirts, trousers, casuals, ethnic, accessories)
├── Women's Wear (sarees, kurtis, salwar suits, western, fusion)
├── Kids' Wear (boys, girls — by age group)
└── Fabrics & Accessories (fabrics, dupattas, stoles, fashion accessories)
```

- Categories and sub-categories are configurable from the admin panel.
- Each category has: name, slug, parent, banner image, SEO fields, display order, active flag.

**3.1.2 Product**

Each product has:

| Field | Type | Notes |
|---|---|---|
| Name | Text | |
| Slug | URL-safe string | Auto-generated, editable |
| Category / Sub-category | FK | Multi-level |
| Short Description | Text | Shown on listing cards |
| Full Description | Rich text | Shown on PDP |
| Tags / Collections | Many-to-many | e.g. "New Arrivals", "Sale" |
| Base Price | Decimal (INR) | |
| Sale Price | Decimal (INR) | Optional; shown with strikethrough |
| GST Rate | % | Applied at checkout |
| Images | Array (min 1, max 10) | WebP/AVIF served |
| Status | Draft / Active / Archived | |

**3.1.3 Variants**

Each variant of a product has its own: SKU, size, color, material, price override (optional), stock count, low-stock threshold.

- Adding a product with no variants is allowed (single-SKU product).
- Variant selection on PDP updates price, stock status, and images in-place (no page reload).

**3.1.4 Inventory**

- Stock decrements on order placement (not on payment confirmation, to avoid oversell window).
- Low-stock alert email sent to admin when `stock ≤ low_stock_threshold`.
- Out-of-stock variants show "Notify Me" button (captures email for restock alert).

---

### 3.2 Product Discovery

**3.2.1 Search**

- Full-text search across product name, description, tags.
- Autocomplete dropdown shows top 5 matches as user types (debounced, 300 ms).
- Zero-results page shows popular products and a "Browse All" link.

**3.2.2 Listing & Filters**

Filters available on every listing page:

| Filter | Type |
|---|---|
| Price Range | Slider (min/max) |
| Size | Multi-select checkbox |
| Color | Color swatch multi-select |
| Fabric / Material | Multi-select checkbox |
| Occasion | Multi-select checkbox |
| Brand | Multi-select checkbox |
| Discount | Toggle (On Sale only) |

Sort options: Relevance (default), Price Low→High, Price High→Low, Newest, Bestsellers, Customer Rating.

Filters update listing without full page reload. Active filters shown as removable chips above results.

**3.2.3 Product Detail Page (PDP)**

- Image gallery with zoom on hover (desktop) and swipe (mobile).
- 360° view: optional per-product; skipped if no 360° images uploaded.
- Variant selector (size, color) with real-time price/stock update.
- Size chart: modal triggered by "Size Guide" link.
- Customer reviews & ratings (star rating + text; photo upload optional).
- "Add to Cart" and "Buy Now" CTAs; both disabled when out of stock.
- Related products carousel (same category, ≤ 8 products).
- Breadcrumb navigation.

---

### 3.3 Shopping Cart & Wishlist

**Cart**

- Persistent for logged-in users (synced to server); session-based for guests (localStorage).
- Guest cart merges into account cart on login.
- Cart shows: product image, name, variant, qty stepper, unit price, line total, remove button.
- Cart summary: subtotal, discount, shipping estimate, GST, total.
- Coupon code field with real-time validation.
- "Proceed to Checkout" button; also a mini-cart flyout accessible from header on all pages.

**Wishlist**

- Requires login (guest prompted to sign in).
- Products saved per account; move item to cart from wishlist.

---

### 3.4 Checkout Flow

Step-by-step, single-page (accordion or multi-step wizard):

```
1. Address  →  2. Shipping Method  →  3. Payment  →  4. Confirmation
```

**Step 1 — Address**
- Logged-in: choose saved address or add new (Name, Phone, Address Line 1 & 2, City, State, PIN, optional label).
- Guest: full address form + email for order updates.
- Pincode validation: lookup state/city auto-fill; flag if COD not available for that PIN.

**Step 2 — Shipping Method**
- Options configured in admin (flat rate, weight-based, or Shiprocket real-time quote).
- Display: carrier name, estimated delivery window, cost.

**Step 3 — Payment**
- Razorpay checkout modal (UPI, cards, net banking, wallets).
- COD option if enabled for that pincode.
- Payment failure: user stays on payment step with retry option; order not created until payment succeeds (except COD).

**Step 4 — Confirmation**
- Order ID displayed.
- GST-compliant PDF invoice link (generated immediately).
- WhatsApp message sent to customer's number.
- Email confirmation sent.

---

### 3.5 Order Management

**Customer view**

| Page | What it shows |
|---|---|
| Order History | List of orders: ID, date, status, total, "View Details" |
| Order Detail | Items, shipping address, payment method, status timeline, invoice download, tracking link |
| Order Tracking | Live AWB tracking embedded from Shiprocket (or external carrier page) |

**Statuses (lifecycle)**

```
Placed → Confirmed → Processing → Shipped → Delivered
                  ↘ Cancelled
                         ↘ Return Requested → Return Accepted → Refunded
```

Status changes trigger: email + WhatsApp notification to customer.

**Cancellation & Returns**
- Customer can cancel before "Processing".
- Return request within 7 days of delivery (configurable).
- Admin approves/rejects return; refund initiated via Razorpay refund API.

---

### 3.6 Customer Accounts

| Feature | Detail |
|---|---|
| Registration | Email + password OR phone + OTP |
| Login | Email/password; "Forgot Password" via email OTP |
| Profile | Name, phone, email, profile photo |
| Saved Addresses | Add / edit / delete / set default |
| Order History | See §3.5 |
| Wishlist | See §3.3 |
| Notification Preferences | Email on/off, WhatsApp on/off |

---

### 3.7 Promotions & Discount Engine

| Type | How it works |
|---|---|
| Percentage discount | e.g. 20% off — applied to eligible items |
| Flat discount | e.g. ₹200 off — applied to cart total |
| Coupon code | Single-use or multi-use; expiry date; minimum cart value |
| Seasonal campaign | Admin marks products / categories as part of a campaign; discount auto-applied |
| Flash sale | Time-bounded sale price on selected products |

Rules:
- One coupon per order.
- Coupon + product-level sale price can stack (configurable per coupon).

**Abandoned Cart Recovery**
- If a logged-in user has items in cart and has not checked out after 2 hours: send email 1.
- After 24 hours: send email 2 with optional extra discount coupon (configurable).
- Sequence stops on checkout.

---

### 3.8 Payments & Compliance

**Razorpay integration**

- Server-side order creation → client-side Razorpay modal → server-side webhook for payment confirmation.
- Webhook events handled: `payment.captured`, `payment.failed`, `refund.processed`.
- All amounts in INR paise (Razorpay standard).

**GST**

- GST rate configured per product (0%, 5%, 12%, 18%).
- Invoice line items show: price ex-GST, GST amount, total.
- PDF invoice: GST-compliant format with GSTIN fields (store's GSTIN required in settings).

**COD**

- Configurable per-pincode or blanket enable/disable.
- COD orders placed directly; payment status = "Pending (COD)".

---

### 3.9 Shipping

- Admin configures shipping rules: flat rate, or rate by weight/pincode range.
- Optional Shiprocket API: real-time rate fetch at checkout; AWB generation on order confirmation; tracking webhook to update order status.
- Order tracking page polls Shiprocket for status or shows static status if not integrated.

---

### 3.10 Admin Dashboard

**Overview panel (home)**

Real-time widgets:
- Total revenue (today / this week / this month)
- Order count by status
- Average order value
- Top 5 selling products
- Conversion rate (sessions → orders, via GA4 or internal)
- Low-stock alerts list

**Products**
- CRUD for products and variants.
- Bulk CSV/Excel import (template provided) and export.
- Image upload with auto WebP conversion.

**Orders**
- List with filters (status, date range, search by order ID / customer).
- Order detail: update status, add tracking number, trigger notifications manually, download invoice.

**Customers**
- List with search.
- Customer detail: profile, order history, support notes.

**Promotions**
- Create / edit / deactivate coupons and campaigns.
- Schedule flash sales with start/end datetime.

**Content (CMS)**
- Hero banners: image, title, CTA link, display order, active dates.
- Category banners.
- Featured collections.
- Static pages: About, Contact, Shipping & Returns, Privacy, T&C.
- Optional: Blog posts (title, body, slug, publish date, SEO fields).

**Reports**
- Sales report: daily / weekly / monthly — filterable by date range.
- Bestsellers report.
- Customer segmentation (new vs returning, by geography).
- Export all reports as CSV.

**Settings**
- Store name, logo, GSTIN, address, contact info.
- Shipping rules.
- Payment gateway keys (masked display).
- Notification templates (email, WhatsApp).
- COD on/off and pincode rules.
- Low-stock threshold defaults.

**Role-Based Access**

| Role | Access |
|---|---|
| Super Admin | Everything |
| Manager | Products, Orders, Customers, Promotions, Reports — no Settings |
| Inventory Staff | Products (stock only), low-stock report |

---

### 3.11 Notifications

All notifications use configurable templates with variables (customer name, order ID, tracking link, etc.).

| Event | Email | WhatsApp | SMS |
|---|---|---|---|
| Registration / Welcome | ✓ | — | — |
| Order Placed | ✓ | ✓ | Optional |
| Order Confirmed | ✓ | ✓ | — |
| Order Shipped + AWB | ✓ | ✓ | Optional |
| Order Delivered | ✓ | ✓ | — |
| Order Cancelled | ✓ | ✓ | — |
| Refund Initiated | ✓ | — | — |
| Abandoned Cart (×2) | ✓ | — | — |
| Low Stock (admin) | ✓ | — | — |
| Restock Alert (customer) | ✓ | — | — |
| Password Reset | ✓ | — | — |

Email provider: Brevo (primary) or MSG91. WhatsApp: WhatsApp Business API via approved BSP. SMS: MSG91 or Twilio (optional).

---

### 3.12 SEO & Analytics

- Each product, category, and static page has editable: `<title>`, `<meta name="description">`, canonical URL.
- Sitemap.xml auto-generated and submitted to Google Search Console.
- Structured data: `Product`, `Offer`, `BreadcrumbList` schemas on PDP.
- Clean, human-readable URLs: `/women/sarees/banarasi-silk-saree-red`.
- Google Analytics 4 + Google Tag Manager pre-configured; events: page_view, add_to_cart, begin_checkout, purchase, search.
- Meta Pixel configured for purchase and add_to_cart events.

---

### 3.13 Performance & Security

| Requirement | Implementation |
|---|---|
| Page load < 3s (4G) | Next.js SSR/SSG, image optimization (WebP/AVIF, lazy load), CDN (Cloudflare) |
| Core Web Vitals | LCP images preloaded, CLS avoided via reserved image dimensions, INP kept low |
| HTTPS | SSL via Let's Encrypt or Cloudflare; HSTS header |
| Auth security | Bcrypt hashing, JWT with short expiry + refresh tokens, rate-limit on login/OTP endpoints |
| OWASP Top 10 | Input validation, parameterized queries, CSRF tokens, Content-Security-Policy header |
| Backups | Automated daily DB + media backups; 30-day retention |
| Monitoring | Uptime monitoring (e.g., BetterStack free tier); error tracking (Sentry) |

---

## 4. Page / Screen Inventory

| # | Page | Auth Required |
|---|---|---|
| 1 | Home | No |
| 2 | Category / Sub-category Listing | No |
| 3 | Search Results | No |
| 4 | Product Detail Page (PDP) | No |
| 5 | Cart | No (guest cart) |
| 6 | Checkout — Address | Guest / Logged-in |
| 7 | Checkout — Shipping | Guest / Logged-in |
| 8 | Checkout — Payment | Guest / Logged-in |
| 9 | Order Confirmation | Guest / Logged-in |
| 10 | Login / Register | No |
| 11 | Forgot Password | No |
| 12 | My Account — Profile | Yes |
| 13 | My Account — Addresses | Yes |
| 14 | My Account — Order History | Yes |
| 15 | My Account — Order Detail + Tracking | Yes |
| 16 | My Account — Wishlist | Yes |
| 17 | Static Pages (About, Contact, Policy, T&C) | No |
| 18 | Blog Listing + Post Detail (optional) | No |
| 19 | Admin — Dashboard | Admin |
| 20 | Admin — Product List + Edit | Admin |
| 21 | Admin — Order List + Detail | Admin |
| 22 | Admin — Customer List + Detail | Admin |
| 23 | Admin — Promotions | Admin |
| 24 | Admin — Content / CMS | Admin |
| 25 | Admin — Reports | Admin |
| 26 | Admin — Settings | Super Admin |

---

## 5. Integrations Summary

| Integration | Purpose | Library / API |
|---|---|---|
| Razorpay | Payments (UPI, cards, wallets) | Razorpay Node/PHP SDK |
| Shiprocket | Shipping rates, AWB, tracking | Shiprocket REST API |
| WhatsApp Business API | Order & shipping notifications | Approved BSP (e.g., Wati, Interakt) |
| Brevo / MSG91 | Transactional email + OTP SMS | REST API |
| Google Analytics 4 | Traffic & conversion analytics | gtag.js via GTM |
| Google Tag Manager | Tag management container | GTM snippet |
| Meta Pixel | Facebook/Instagram ad attribution | Pixel via GTM |
| Cloudflare | CDN, DDoS protection, SSL | DNS proxy |
| Sentry | Error tracking | Sentry SDK |

---

## 6. Out of Scope (v1)

The following are **explicitly deferred** to avoid scope creep; add when validated demand exists:

- Mobile apps (iOS / Android) — API-first architecture makes this straightforward later.
- Multi-vendor / marketplace features.
- Live chat (WhatsApp button covers support for now).
- Loyalty / reward points program.
- Advanced ML-based product recommendations (use same-category carousel for now).
- B2B / wholesale pricing tiers.

---

## 7. Open Items & Assumptions

| # | Item | Owner | Due |
|---|---|---|---|
| A1 | Store name, logo, brand colors, GSTIN | Client | Before Phase 2 |
| A2 | Razorpay account credentials | Client | Before Phase 4 |
| A3 | WhatsApp BSP selection and approval | Client + Vendor | Before Phase 4 |
| A4 | Shiprocket account (if using API integration) | Client | Before Phase 4 |
| A5 | Product catalog data (CSV or manual entry) | Client | Before Phase 3 |
| A6 | Confirm 360° view requirement (optional per RFP) | Client | Phase 2 |
| A7 | Blog / news section required at launch or post-launch? | Client | Phase 1 |
| A8 | COD pincode list (blanket or restricted) | Client | Phase 3 |

---

## 8. Acceptance Criteria (high-level)

A feature is done when:
1. It matches the functional description in this document.
2. It passes QA on latest Chrome, Firefox, Safari, and Chrome-Android.
3. Core Web Vitals pass on Google PageSpeed Insights (Staging, real-4G throttle).
4. No P0/P1 bugs open.
5. Admin can perform the corresponding operation without developer assistance.

---

*FDD v1.0 — Derived from RFP-CLOTH-ECOM-2026-001 — June 25, 2026*  
*Update this document if scope changes are agreed in writing.*
