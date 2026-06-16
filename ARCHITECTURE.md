# j-commerce-admin Architecture

## Purpose

`j-commerce-admin` is the web operations console for `j-commerce-api`. It manages catalog, fulfillment, users, vouchers, notifications, banners, upload assets, and dashboard analytics.

## Stack

- Vite 8 for local dev and production bundling.
- React 19 for UI.
- TypeScript 6 for typed contracts.
- React Router 7 for route composition and protected navigation.
- TanStack Query 5 for server-state fetching, caching, invalidation, and mutation orchestration.
- React Hook Form and Zod for form state and validation.
- Recharts for dashboard visualization.
- Lucide React for iconography.
- Sonner for toast feedback.
- Plain CSS design system in `src/index.css`.

## Runtime Configuration

The admin API base URL is resolved in `src/lib/api.ts`:

```ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
```

Expected local backend:

```text
http://localhost:3000/api/v1
```

## Application Flow

```text
main.tsx
  BrowserRouter
  QueryClientProvider
  AuthProvider
  Toaster
  App
    /login -> LoginPage
    protected routes -> Shell
      / -> DashboardPage
      /orders -> OrdersPage
      /catalog -> CatalogPage
      /users -> UsersPage
      /vouchers -> VouchersPage
      /notifications -> NotificationsPage
      /banners -> BannersPage
      /upload -> UploadPage
```

## Auth Model

- `AuthContext` stores the API auth response in browser `localStorage`.
- `useToken()` exposes the current access token.
- `ProtectedShell` redirects unauthenticated users to `/login`.
- `LoginPage` calls `POST /auth/login` and checks `user.role === 'ADMIN'` before entering the console.

## API Layer

`src/lib/api.ts` provides a small typed fetch wrapper:

- Adds `Authorization: Bearer <token>` when provided.
- Adds `Content-Type: application/json` for JSON requests.
- Parses JSON response bodies.
- Throws `ApiError` with HTTP status and API message.

Feature pages call `request<T>()` directly so each page owns its query key and mutation invalidation logic.

## State Management

Server state:

- TanStack Query owns reads and mutation invalidation.
- Query keys are feature-oriented, for example `['dashboard', 'stats']`, `['orders']`, `['products']`.

Client state:

- Auth session lives in `AuthContext` and `localStorage`.
- Form state lives in React Hook Form instances per page.
- Toasts are emitted through Sonner.

## Design System

The current UI system is centralized in `src/index.css`:

- OKLCH-inspired restrained color tokens.
- Light product-console theme.
- System font stack.
- Rounded form controls, buttons, panels, tables, badges, and nav links.
- Consistent focus rings and hover states.
- Responsive shell collapse at tablet/mobile widths.

Primary classes:

- `.shell`, `.sidebar`, `.workspace`, `.topbar`
- `.panel`, `.stat-card`, `.dashboard-grid`, `.split-layout`, `.catalog-layout`
- `.table-frame`, `table`, `.toolbar`
- `.primary-button`, `.ghost-button`, `.table-button`
- `.badge-*`
- `.login-scene`, `.login-layout`, `.login-poster`, `.login-card`

## Component Boundaries

- `Shell.tsx`: persistent navigation, operator card, API target display.
- `Panel.tsx`: reusable page section and stat-card components.
- `DataTable.tsx`: simple table primitive for admin lists.
- `Badge.tsx`: typed status badge tones and order/payment tone helpers.
- `LoadingState.tsx` and `ErrorState.tsx`: shared data-state affordances.

## Page Responsibilities

- `DashboardPage`: read-only analytics across dashboard endpoints.
- `OrdersPage`: order list and status mutation.
- `CatalogPage`: product/category/variant/image creation and product deletion.
- `UsersPage`: user list/search and active-state toggle.
- `VouchersPage`: voucher list and creation.
- `NotificationsPage`: notification broadcast.
- `BannersPage`: active banner list, create, delete/deactivate.
- `UploadPage`: multipart image upload and returned asset URL display.

## Validation And Build

Primary commands:

```bash
npm run lint
npm run build
```

The build command runs TypeScript project build and Vite production bundling:

```bash
tsc -b && vite build
```

## Integration Assumptions

- Backend global prefix is `/api/v1`.
- Admin routes require a valid JWT access token.
- Seeded local admin is `admin@jcommerce.com / admin123`.
- API CORS must allow the Vite dev origin, normally `http://localhost:5173`.
- Upload URLs returned by the API must be reachable by the browser.

## Risk Areas

- Admin status mutation must not bypass business side effects such as stock restore on cancellation.
- Public endpoints reused for admin views may hide inactive/expired records.
- Form validation should be visible, not only enforced silently by Zod.
- Destructive actions should use confirmation before production deployment.
- Auth session user type should match the API auth response shape exactly.
