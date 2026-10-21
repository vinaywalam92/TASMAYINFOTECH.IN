# TASMAY INFOTECH: storefront

Next.js 15 (App Router) · TypeScript · Tailwind · React Three Fiber · GSAP · Framer Motion · Prisma/PostgreSQL · Razorpay.

> **Honest status.** This code base was written in a sandbox where `npm install` was blocked, so it has **never been compiled, type-checked or run**. All import paths and named imports were cross-checked by script, but expect a first-build pass of small fixes (Prisma `Json` typings, drei/R3F prop types, light intensities, etc.). Run `npm run typecheck`/`npm run build` first and fix what it reports.

## Quick start

```bash
npm install
cp .env.example .env          # fill DATABASE_URL, AUTH_SECRET (openssl rand -base64 48), CRON_SECRET, SEED_ADMIN_*
npx prisma generate
npx prisma migrate dev --name init   # creates the migration SQL: commit prisma/migrations/
npm run db:seed                       # categories + first admin (+ labelled demo data if SEED_DEMO_DATA=true)
npm run dev                           # http://localhost:3000   admin: /admin
npm test                              # pricing unit tests (vitest)
```
Production: `npx prisma migrate deploy && npm run build && npm start`.

## First things to do in Admin
1. **Shipping rules**: checkout is **blocked** until at least one active rule covers the PIN (add a blank-prefix fallback rule).
2. **Settings**: business details, GSTIN (invoices become "tax invoices" only when set), delivery policy, policies, about text.
3. **Brands / products**: add only what you really stock. Demo rows are labelled "Demo" and hidden in production.
4. Razorpay keys + webhook, SMTP.

## Integrations

| Area | Status |
|---|---|
| Catalogue, search, filters, compare, wishlist, reviews (purchasers only, moderated) | Implemented |
| Cart (server-authoritative), coupons, GST, PIN-based delivery estimate & fee | Implemented |
| Guest + account checkout, order numbers, stock hold/release, invoice/receipt page | Implemented |
| Razorpay payments, signature + server re-fetch verification, webhook, refunds | Implemented, **needs your Razorpay keys**. With no keys checkout refuses to take orders (no fake payment path) |
| Webhook | Razorpay Dashboard → Webhooks → `https://<domain>/api/payments/razorpay/webhook`, same secret as `RAZORPAY_WEBHOOK_SECRET`; events `payment.captured`, `order.paid`, `payment.failed` |
| Stock-hold release | Call `GET/POST /api/cron/release-stock` with `Authorization: Bearer $CRON_SECRET` every 5–10 min (Vercel Cron, cron-job.org…) |
| Email (order/enquiry/reset/newsletter confirm) | Implemented, **needs SMTP**. UI never claims an email was sent when it wasn't |
| Bot protection | Honeypot + timing always on; Cloudflare Turnstile optional via env |
| Admin dashboard with RBAC (CUSTOMER/STAFF/ADMIN), audit log, settings | Implemented |
| Order tracking | Shows statuses staff record + courier/tracking staff enter. **No live courier API** (see `src/lib/integrations/shipping.ts`) |
| Delivery estimates | Policy-based (cut-off, working days, holidays, rule ETA). Labelled as estimates, never as courier data |
| Interactive 3D (hero, showcase) | Implemented with procedural models, no asset downloads, lazy-loaded; lite SVG fallback on phones, low-power, data-saver, no-WebGL and reduced-motion |
| Per-product GLB 3D viewer | Not implemented |
| Newsletter sending / unsubscribe page | Double opt-in capture only; no campaign sending or unsubscribe page yet |
| Email verification at sign-up | Not implemented |

## Caveats
- Rate limiting is **in-memory per server instance**; swap `src/lib/rate-limit.ts` for Redis/Upstash when running multiple instances.
- Prices are integer paise; `Settings → Listed prices are` decides if GST is inside or added.
- No certifications, authorised-reseller/GeM claims, testimonials, statistics, phone numbers or addresses are invented. Everything is blank until you fill it in.
- `_superseded/` holds earlier files kept for reference; delete after review.
- Order retry after a dismissed payment creates a new order; the old one's stock hold is released by the cron.

## Structure
`prisma/` schema + seed · `src/lib/` domain logic (pricing, cart, orders, delivery, auth) · `src/actions/` server actions (+ `admin/`) · `src/app/(site)` storefront · `src/app/admin` dashboard · `src/app/api` payments, cron, search, delivery · `src/components/three` R3F scenes.
