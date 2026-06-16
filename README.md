# j-commerce-admin

Admin web untuk `j-commerce-api`, dibangun dengan Vite, React 19, TypeScript, TanStack Query, React Router, Recharts, Motion, React Hook Form, dan Zod.

## Scope

- Admin login via `POST /auth/login`
- Dashboard revenue, status pressure, top products
- Order fulfillment board dengan status update
- Catalog operations: product, category, variant, image attach
- User access control
- Voucher creation and active voucher table
- Notification broadcast
- Banner management
- Local image upload to API

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Default API base:

```text
http://localhost:3000/api/v1
```

Seeded admin account from `j-commerce-api`:

```text
admin@jcommerce.com / admin123
```

## Scripts

- `npm run dev` starts Vite dev server
- `npm run build` typechecks and builds production assets
- `npm run lint` runs ESLint
- `npm run preview` previews production build
