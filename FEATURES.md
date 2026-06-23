# j-commerce-admin Features

Status: implemented admin console for `j-commerce-api`.

## Core Experience

- Protected admin-only web console with session persistence in `localStorage`.
- Login through `POST /auth/login` and role check for `ADMIN` users.
- Code-split pages using React Router lazy routes.
- Server-state cache and refetching with TanStack Query.
- Toast feedback for mutations with Sonner.
- Product-style UI system: restrained light theme, rounded controls, accessible focus states, responsive shell, and dense operational tables.

## Dashboard

- Store overview panel for operational context.
- Revenue, orders, customers, and products stat cards.
- 30-day revenue area chart via Recharts.
- Order status breakdown bar chart.
- Top products list by sold quantity and revenue.
- API endpoints used:
  - `GET /dashboard/stats`
  - `GET /dashboard/revenue?period=30d`
  - `GET /dashboard/top-products?limit=8`
  - `GET /dashboard/order-status`

## Orders

- Paginated order table using `GET /orders?limit=100`.
- Displays invoice, customer, date, order status, payment status, and total.
- Admin status update through `PATCH /orders/:id/status`.
- Badge tones for order/payment status.

## Catalog

- Product table with brand, category, price, rating, variant count, edit, and delete actions.
- Create product form with optional image bootstrap.
- Edit product form for product details, pricing, category, merchandising, and optional image attach.
- Create and update merchandising flags for Produk Pilihan and Flash Sale rails, including flash sale end time.
- Create category form.
- Add variant form.
- Attach image to an existing product.
- API endpoints used:
  - `GET /products?limit=80`
  - `POST /products`
  - `PATCH /products/:id`
  - `DELETE /products/:id`
  - `GET /categories`
  - `POST /categories`
  - `POST /products/:productId/variants`
  - `POST /products/:productId/images`

## Users

- User management table backed by `GET /users`.
- Search toolbar for name/email filtering.
- Toggle active state through `PATCH /users/:id/active`.
- Shows active/inactive status badges.

## Vouchers

- Voucher table backed by the admin list endpoint, including inactive, expired, and exhausted records.
- Create and edit voucher form with type, value, quota, validity window, active state, minimum purchase, and maximum discount.
- Disable and enable voucher actions from the table.
- API endpoints used:
  - `GET /vouchers/admin/all?limit=100`
  - fallback: `GET /vouchers?limit=100`
  - `POST /vouchers`
  - `PATCH /vouchers/:id`
  - `DELETE /vouchers/:id`

## Notifications

- Broadcast notification form.
- Supports `PROMO`, `ORDER`, and `SYSTEM` notification types.
- API endpoint used: `POST /notifications/broadcast`.

## Banners

- Banner wall with active/inactive image previews.
- Create and edit banner form for title, image, link, sort order, and active state.
- Deactivate/delete banner action.
- API endpoints used:
  - `GET /banners/admin/all`
  - fallback: `GET /banners`
  - `POST /banners`
  - `PATCH /banners/:id`
  - `DELETE /banners/:id`

## Upload

- Single or multi-image upload through API multipart upload.
- Displays returned asset URL, filename, size, and MIME type.
- Copy URL action for uploaded assets.
- API endpoint used: `POST /upload/image` or `POST /upload/images` depending on selected files.

## Current Known Issues

- Refresh-token is currently stored in `localStorage` (readable by client JS). The recommended hardening next step is to migrate the refresh-token to an HttpOnly, Secure, SameSite=Strict cookie issued by the API, so client JS cannot read it and the Content-Security-Policy can be further tightened (e.g. drop `connect-src` wildcards once the API is same-origin or cookie-authenticated).

## Resolved

- Order status dropdown no longer exposes `CANCELLED` as a selectable transition; cancelled orders render a display-only disabled `CANCELLED` option and transitions route through the Cancel action.
- Users page keeps the disabled UI hint and an explicit click-handler guard; the backend enforces self-disable and protected-admin rejection.
- Upload UI enforces the 5-file limit client-side before calling the API.
- Forms use visible `<label htmlFor>`/id pairs with inline validation messages from Zod.
- Voucher list queries the admin endpoint (`GET /vouchers/admin/all`) with a fallback to the public list when the admin endpoint is unavailable.
