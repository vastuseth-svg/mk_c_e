# USER ACCEPTANCE TESTING (UAT) DOCUMENT

**Project:** Cloth Store E-Commerce Website  
**References:** RFP-CLOTH-ECOM-2026-001 · FDD v1.0 · ERD v1.0  
**Version:** 1.0  
**Date:** June 25, 2026  
**Environment:** Staging (pre-production)  
**Tested By:** _(Business Owner / QA Lead)_  
**Sign-off Required By:** _(Proprietor / Digital Lead)_

---

## How to Use This Document

- Run each test case on the **staging URL** before production deployment.
- Mark **Status** as `Pass`, `Fail`, or `Blocked` (blocked = dependency not ready).
- Log failures in the **Defects** table at the bottom with severity: `P0` (blocker), `P1` (major), `P2` (minor).
- All `P0` and `P1` defects must be resolved and re-tested before sign-off.

**Test User Accounts to prepare before testing:**

| Account | Role | Details |
|---|---|---|
| `customer1@test.com` | Customer | Registered, Indian mobile number |
| `customer2@test.com` | Customer | Fresh account (no orders) |
| `admin@store.com` | Super Admin | Full access |
| `manager@store.com` | Manager | No Settings access |
| `inventory@store.com` | Inventory Staff | Products (stock) only |

---

## Module 1 — Product Catalog & Discovery

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-01 | Browse category listing | At least 5 products active in "Women's Wear / Sarees" | 1. Open homepage. 2. Click "Women's Wear" mega-menu. 3. Click "Sarees". | Category listing page loads with product cards. URL is `/women/sarees`. Breadcrumb shows Home › Women's Wear › Sarees. | |
| TC-02 | Sub-category navigation | Category tree has at least 2 levels | 1. Navigate to any root category. 2. Click a sub-category. | Products filtered to sub-category only. Page title and `<h1>` match sub-category name. | |
| TC-03 | Search with autocomplete | Products with "kurti" in name are active | 1. Click search bar. 2. Type "kur". | Autocomplete dropdown appears within 1 s with ≥1 suggestion containing "kurti". | |
| TC-04 | Search — full results | Same as TC-03 | 1. Type "kurti" and press Enter. | Search results page shows all matching products. URL contains query param. | |
| TC-05 | Search — zero results | No product matches "xyzgarment" | 1. Search "xyzgarment". | Zero-results page shown. Popular products displayed below. "Browse All" link visible. | |
| TC-06 | Filter by price range | Listing has products with varied prices | 1. Open a category listing. 2. Move price slider to ₹500 – ₹2000. | Only products with price in range remain. Filter chip "₹500–₹2000" shown above grid. | |
| TC-07 | Filter by size | Variants of different sizes exist | 1. Open listing. 2. Select size "M". | Only products/variants with size M displayed. | |
| TC-08 | Filter by color | Variants of different colors exist | 1. Open listing. 2. Select color swatch "Red". | Products filtered to red variants. | |
| TC-09 | Multiple filters combined | Various products available | 1. Select size "L" AND color "Blue" AND On Sale toggle. | Only products matching ALL selected filters shown. All active chips displayed. | |
| TC-10 | Remove filter chip | TC-09 complete | 1. Click ✕ on the "Blue" chip. | Color filter removed; results update to L + On Sale only. | |
| TC-11 | Sort — Price Low→High | Listing has ≥5 products | 1. Open listing. 2. Select sort "Price: Low to High". | Products ordered by price ascending. | |
| TC-12 | Product Detail Page loads | Active product with 3 images, 2 variants | 1. Click any product card. | PDP loads. Images show in gallery. Variant selector visible. "Add to Cart" button enabled. Breadcrumb correct. | |
| TC-13 | Variant selection updates price & stock | Product has variants with different prices and one OOS variant | 1. On PDP select a variant. 2. Select OOS variant. | Price updates in-place. OOS variant shows "Out of Stock" + "Notify Me" button; Add to Cart disabled. | |
| TC-14 | Image zoom (desktop) | PDP with high-res image | 1. Hover over product image on desktop. | Zoomed view appears. No page navigation. | |
| TC-15 | Size chart modal | PDP with size chart configured | 1. Click "Size Guide" link. | Size chart modal opens. Closes on ✕ click or backdrop click. | |
| TC-16 | Related products | Category has ≥4 other active products | 1. Open any PDP. | Related products carousel shows ≤8 items from same category. | |
| TC-17 | Submit a review | Logged-in customer who purchased product | 1. On PDP scroll to Reviews. 2. Submit 4-star rating + text. | Review submitted. Pending approval message shown. Review appears after admin approves. | |

---

## Module 2 — Cart & Wishlist

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-18 | Add to cart (logged in) | Active product, logged-in customer | 1. On PDP click "Add to Cart". | Item added. Mini-cart count increments. Success toast shown. | |
| TC-19 | Add to cart (guest) | Not logged in | 1. On PDP click "Add to Cart". | Item added to guest cart (localStorage). Mini-cart reflects item. No login required. | |
| TC-20 | Guest cart merges on login | TC-19 cart in session | 1. Proceed to login. | Guest cart items appear in account cart after login. No items lost. | |
| TC-21 | Update quantity in cart | Item in cart | 1. Open cart. 2. Increase qty to 3. | Qty updates. Line total and cart total recalculate correctly. | |
| TC-22 | Remove item from cart | Item in cart | 1. Click remove on a cart item. | Item removed. Cart totals recalculate. Empty cart message if last item removed. | |
| TC-23 | Buy Now | Active product, logged-in | 1. Click "Buy Now" on PDP. | Cart is set to single item, navigated directly to checkout Step 1. | |
| TC-24 | Add to wishlist | Logged-in customer | 1. Click wishlist icon on product card or PDP. | Item saved to wishlist. Icon turns filled. | |
| TC-25 | Wishlist — guest prompt | Not logged in | 1. Click wishlist icon. | Login / register prompt shown. Item saved after login. | |
| TC-26 | Move wishlist item to cart | Item in wishlist | 1. Open wishlist. 2. Click "Add to Cart". | Item moved to cart. Removed from wishlist. | |
| TC-27 | Apply valid coupon | Coupon `SAVE10` (10% off, min ₹500) exists; cart total ≥ ₹500 | 1. Open cart. 2. Enter `SAVE10` and apply. | Discount line shown. Total reduced by 10%. Coupon chip displayed. | |
| TC-28 | Apply invalid coupon | Coupon `BADCODE` does not exist | 1. Enter `BADCODE` and apply. | Error message: "Invalid or expired coupon code." No discount applied. | |
| TC-29 | Coupon min-cart not met | Coupon min ₹500; cart total ₹300 | 1. Apply valid coupon. | Error: "Minimum cart value of ₹500 required." | |

---

## Module 3 — Checkout Flow

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-30 | Checkout Step 1 — use saved address | Logged-in user with 1 saved address | 1. Proceed to checkout. 2. Select saved address. 3. Click Continue. | Address selected. Proceed to Step 2. | |
| TC-31 | Checkout Step 1 — add new address | Logged-in user | 1. Click "Add New Address". 2. Fill form. 3. Save and continue. | Address saved to account. Used for this order. Proceed to Step 2. | |
| TC-32 | Pincode auto-fill | Valid Indian pincode | 1. Enter a 6-digit pincode in address form. | City and state auto-populated from pincode lookup. | |
| TC-33 | Checkout Step 2 — shipping options | Shipping rules configured | 1. On Step 2 view shipping options. | At least one option shown with carrier name, cost, and estimated delivery. | |
| TC-34 | Checkout Step 3 — Razorpay UPI | Razorpay test mode | 1. Select Razorpay. 2. In modal choose UPI. 3. Complete test payment. | Razorpay modal opens. On success, redirected to Order Confirmation page with order ID. | |
| TC-35 | Checkout Step 3 — Card payment | Razorpay test mode | 1. Select Razorpay. 2. Enter test card. 3. Complete. | Payment captured. Order confirmation page shown. | |
| TC-36 | Checkout — COD | COD enabled for test pincode | 1. Select COD. 2. Place order. | Order placed. Status = `placed`. No payment modal. Confirmation page with "Cash on Delivery" label. | |
| TC-37 | Payment failure — retry | Razorpay test failure card | 1. Use failing test card. | Payment fails. Error shown on payment step. "Retry Payment" button available. Order NOT created. | |
| TC-38 | Order confirmation — invoice | Successful checkout | 1. Complete checkout. 2. Check confirmation page. | Order ID displayed. PDF invoice link present and downloadable. GST line items visible in PDF. | |
| TC-39 | Order confirmation — email | Successful checkout | 1. Complete checkout. | Order confirmation email received at customer email within 2 minutes. Contains order ID and item summary. | |
| TC-40 | Order confirmation — WhatsApp | WhatsApp BSP configured | 1. Complete checkout. | WhatsApp message received on customer's registered phone within 5 minutes. | |

---

## Module 4 — Order Management (Customer)

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-41 | View order history | Logged-in customer with ≥1 order | 1. Go to My Account → Orders. | All orders listed with ID, date, status, total. | |
| TC-42 | View order detail | TC-41 complete | 1. Click "View Details" on any order. | Order detail shows items, address, payment method, status timeline, invoice download. | |
| TC-43 | Cancel order (before Processing) | Order in `placed` or `confirmed` status | 1. On order detail click "Cancel Order". 2. Confirm. | Order status changes to `cancelled`. Cancellation email sent. | |
| TC-44 | Cancel order (blocked after Processing) | Order in `processing` or later | 1. Open order detail. | "Cancel Order" button not shown (or disabled with tooltip). | |
| TC-45 | Track shipment | Order `shipped` with AWB | 1. Click "Track Order" on order detail. | Tracking page shows carrier + AWB link or embedded status from Shiprocket. | |
| TC-46 | Request return | Order `delivered` within 7 days | 1. Click "Return Item". 2. Select reason. 3. Submit. | Return request logged. Status = `return_requested`. Confirmation email sent. | |
| TC-47 | Notify Me — restock | OOS variant | 1. On PDP select OOS variant. 2. Click "Notify Me". 3. Submit email. | Email captured in RESTOCK_ALERT. Confirmation message shown. | |

---

## Module 5 — Customer Accounts

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-48 | Register with email + password | Fresh email | 1. Click Register. 2. Fill name, email, password. 3. Submit. | Account created. Verification email sent. Redirect to account dashboard. | |
| TC-49 | Register with phone OTP | Fresh phone number | 1. Click "Register with Phone". 2. Enter number. 3. Submit OTP. | Account created and phone verified. | |
| TC-50 | Login with email + password | Registered account | 1. Enter credentials. 2. Login. | Logged in. Redirect to dashboard or intended page. | |
| TC-51 | Forgot password | Registered email | 1. Click "Forgot Password". 2. Enter email. 3. Open email link. 4. Set new password. | Password reset successful. New password works on login. | |
| TC-52 | Edit profile | Logged in | 1. Go to Profile. 2. Change name. 3. Save. | Name updated. Success toast shown. | |
| TC-53 | Add saved address | Logged in | 1. Go to Addresses → Add New. 2. Fill form. 3. Save. | Address appears in address list and is selectable at checkout. | |
| TC-54 | Set default address | 2 saved addresses | 1. Click "Set as Default" on second address. | Second address marked default. Shown pre-selected at checkout. | |
| TC-55 | Delete address | ≥2 saved addresses | 1. Click Delete on one address. 2. Confirm. | Address removed from list. | |

---

## Module 6 — Promotions & Abandoned Cart

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-56 | Percentage coupon applied at checkout | Coupon `SAVE20` = 20% off | 1. Add ₹1000 item to cart. 2. Apply `SAVE20` in checkout. | Discount = ₹200. Total = ₹800 (+ GST + shipping). | |
| TC-57 | Flat discount coupon | Coupon `FLAT100` = ₹100 off | 1. Apply in cart. | ₹100 deducted from cart total. | |
| TC-58 | Expired coupon rejected | Coupon with past expiry date | 1. Apply expired coupon. | Error: "This coupon has expired." | |
| TC-59 | Coupon max-uses exhausted | Coupon used max times | 1. Try to apply. | Error: "This coupon is no longer available." | |
| TC-60 | Flash sale pricing | Flash sale campaign active on a product | 1. View product during active campaign window. | Sale price shown on listing card and PDP. Countdown timer (if implemented) shown. | |
| TC-61 | Flash sale ends — price reverts | TC-60; advance clock past campaign end | 1. View same product after campaign ends. | Original price shown. No sale badge. | |
| TC-62 | Abandoned cart email 1 | Logged-in user with items in cart; do NOT checkout | 1. Add item to cart. 2. Wait 2+ hours (or trigger manually in admin). | First abandoned cart email received with cart contents and checkout link. | |
| TC-63 | Abandoned cart email 2 | TC-62 complete; still not checked out | 1. Wait 24+ hours (or trigger manually). | Second email received, optionally with discount code. | |
| TC-64 | Abandoned cart emails stop on checkout | TC-62 in progress | 1. Complete checkout before email 2 fires. | No second abandoned cart email received. | |

---

## Module 7 — Admin Dashboard

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-65 | Admin login | `admin@store.com` credentials | 1. Navigate to `/admin`. 2. Login. | Admin dashboard loads with revenue/order widgets. | |
| TC-66 | Create product | Logged in as Super Admin / Manager | 1. Products → Add New. 2. Fill all required fields. 3. Add 1 variant. 4. Upload 2 images. 5. Publish. | Product active on storefront. Appears in its category listing. | |
| TC-67 | Edit product price | Existing product | 1. Edit product. 2. Change base price. 3. Save. | New price shown on storefront within 1 page reload. | |
| TC-68 | Update variant stock | Existing variant | 1. Edit product → variant. 2. Set stock to 3. 3. Save. | Stock = 3. If ≤ low-stock threshold, admin alert email triggered. | |
| TC-69 | Bulk CSV import | Sample CSV with 5 products (provided template) | 1. Products → Import CSV. 2. Upload file. 3. Confirm. | All 5 products created. Any row errors reported with line number. | |
| TC-70 | Export products CSV | ≥10 active products | 1. Products → Export CSV. | CSV downloaded containing all products with correct columns. | |
| TC-71 | Update order status | Order in `confirmed` | 1. Orders → find order. 2. Change status to `processing`. 3. Save. | Status updated. Status history entry added. Customer notification triggered. | |
| TC-72 | Add tracking number | Order in `processing` | 1. Open order. 2. Enter AWB number. 3. Save + mark `shipped`. | Shipment record created. Customer receives shipped email + WhatsApp with tracking link. | |
| TC-73 | Download order invoice | Any completed order | 1. Open order detail in admin. 2. Click "Download Invoice". | GST-compliant PDF opens with store GSTIN, order items, GST breakdown, totals. | |
| TC-74 | Create coupon | Admin access | 1. Promotions → Coupons → Add. 2. Set code, type, value, expiry. 3. Save. | Coupon active. Usable at checkout. | |
| TC-75 | Deactivate coupon | Active coupon | 1. Toggle coupon to inactive. | Coupon rejected at checkout with "no longer available" message. | |
| TC-76 | Upload homepage banner | Admin access | 1. Content → Banners → Add. 2. Upload image, set CTA link, set active dates. 3. Save. | Banner appears on homepage hero section within those dates. | |
| TC-77 | Edit static page | Admin access | 1. Content → Pages → "About Us". 2. Edit body text. 3. Save. | Updated text appears on `/about` page. | |
| TC-78 | Sales report — date range | Orders exist | 1. Reports → Sales. 2. Set custom date range. 3. Apply. | Report shows revenue/order count for range. CSV export downloads correct data. | |
| TC-79 | Role-based access — Inventory Staff | Logged in as `inventory@store.com` | 1. Try to access Orders, Customers, Reports, Settings. | Access denied / menu items not visible. Only Products (stock fields) accessible. | |
| TC-80 | Role-based access — Manager | Logged in as `manager@store.com` | 1. Try to access Settings. | Settings page access denied. All other sections accessible. | |

---

## Module 8 — Notifications

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-81 | Welcome email on registration | Fresh account | Complete TC-48. | Welcome email received with store name and login link. | |
| TC-82 | Order shipped — email + WhatsApp | Order status set to `shipped` with AWB | TC-72. | Customer receives both email and WhatsApp message with carrier + tracking link. | |
| TC-83 | Low stock admin alert | Variant stock set to value ≤ threshold | TC-68 (set stock = 2, threshold = 5). | Alert email sent to admin email within 5 minutes. | |
| TC-84 | Restock notification to customer | Variant back in stock after RESTOCK_ALERT captured | 1. Admin updates OOS variant stock to > 0. | Email sent to all emails registered in RESTOCK_ALERT for that variant. | |
| TC-85 | Refund notification | Refund initiated from admin | 1. Admin processes refund on a return. | Customer email received confirming refund amount and expected timeline. | |

---

## Module 9 — SEO & Performance

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-86 | Page titles and meta descriptions | Products and categories with SEO fields filled | 1. Open any PDP. 2. View page source. | `<title>` and `<meta name="description">` match configured values. | |
| TC-87 | Product structured data | Active product | 1. Run any PDP URL through Google Rich Results Test. | Product + Offer schema detected. No errors. | |
| TC-88 | Sitemap.xml | Site deployed | 1. Open `/sitemap.xml`. | Valid XML listing product, category, and static page URLs. | |
| TC-89 | Clean URLs | Active product "Banarasi Silk Saree (Red)" in Sarees | 1. Open the PDP. | URL is `/women/sarees/banarasi-silk-saree-red` (no ID in URL). | |
| TC-90 | Core Web Vitals — homepage | Staging deployed | 1. Run homepage through PageSpeed Insights (Mobile, simulated 4G). | LCP < 3 s. CLS < 0.1. Pass. | |
| TC-91 | Core Web Vitals — PDP | Same | 1. Run a PDP through PageSpeed Insights. | LCP < 3 s. CLS < 0.1. | |
| TC-92 | Mobile responsive — homepage | Any smartphone browser | 1. Open homepage on mobile. | No horizontal scroll. All buttons tappable. Images fit screen. | |
| TC-93 | Mobile responsive — checkout | Any smartphone browser | 1. Complete checkout on mobile. | All 3 checkout steps usable on mobile without layout breaks. | |

---

## Module 10 — Security

| TC# | Test Name | Precondition | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-94 | HTTPS enforced | Site deployed | 1. Try `http://` URL. | Redirected to `https://`. HSTS header present. | |
| TC-95 | Admin route protected | Not logged in | 1. Navigate directly to `/admin/orders`. | Redirected to admin login page. | |
| TC-96 | Customer data isolation | Two test customer accounts | 1. As customer2 try to access customer1's order URL directly. | 403 / redirect to own orders. customer1's data not visible. | |
| TC-97 | Rate limiting on OTP | Test environment | 1. Request OTP 6 times rapidly for same number. | After 5 attempts, requests blocked for cooldown period. Error message shown. | |
| TC-98 | SQL injection check | Any search or filter field | 1. Enter `' OR 1=1 --` in search box. | No database error shown. Normal zero-results or filtered results returned. | |

---

## Defect Log

_Log all failures here during testing._

| Defect ID | TC# | Severity | Description | Assigned To | Status |
|---|---|---|---|---|---|
| | | | | | |

**Severity guide:**
- `P0` — Blocker: feature completely broken, data loss risk, security issue. Must fix before launch.
- `P1` — Major: core flow broken or significantly degraded. Must fix before launch.
- `P2` — Minor: cosmetic, edge-case, or low-impact. Fix in first patch release.

---

## UAT Sign-Off

| Role | Name | Signature / Initials | Date |
|---|---|---|---|
| Business Owner / Proprietor | | | |
| QA Lead | | | |
| Lead Developer | | | |
| Project Manager | | | |

**Go / No-Go Decision:** ☐ Go  ☐ No-Go (pending defects listed above)

---

*UAT v1.0 — Derived from RFP-CLOTH-ECOM-2026-001, FDD v1.0, ERD v1.0 — June 25, 2026*  
*Re-run any TC marked Fail after the corresponding fix is deployed to staging.*
