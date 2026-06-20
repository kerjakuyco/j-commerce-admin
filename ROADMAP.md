# j-commerce-admin Roadmap

## Completed

- Bootstrap Vite React TypeScript app.
- Add routing, protected shell, session context, and API helper.
- Add TanStack Query for server-state orchestration.
- Implement dashboard metrics and charts.
- Implement order management status table.
- Implement catalog product/category/variant/image operations.
- Implement user active-state management.
- Implement voucher creation and active voucher list.
- Implement broadcast notifications.
- Implement banner management.
- Implement upload workflow with URL copy.
- Polish UI toward a Google-like product-console design system.
- Validate with `npm run lint` and `npm run build`.

## Phase 1: Safety Fixes (Completed)

- [x] Remove `CANCELLED` from generic order status dropdown or call `/orders/:id/cancel` for cancellations.
- [x] Prevent disabling the current admin account.
- [x] Restrict user page actions to safe customer/admin operations.
- [x] Add upload file-count validation before API call.
- [x] Add visible form labels and inline validation messages across create/edit forms.

## Phase 2: Admin-Grade Data Contracts

- Add dedicated admin voucher endpoint for all vouchers, including inactive, expired, and exhausted records.
- Add dedicated admin product detail/edit screens.
- Add product variant/image management tables with update/delete/reorder actions.
- Add customer filtering by role and active state.
- Add order detail drawer/page with item list, address, payment, and timeline.

## Phase 3: Operational Quality

- Add optimistic updates where safe and rollback on errors.
- Add confirmation dialogs for destructive actions.
- Add empty states with next best action for every table.
- Add pagination controls to large lists instead of fixed `limit=100` queries.
- Add audit log or recent activity feed for admin mutations.

## Phase 4: Production Readiness

- Add end-to-end tests for login and primary admin flows.
- Add environment validation for `VITE_API_BASE_URL`.
- Add role-aware navigation and permission boundaries.
- Add deployment documentation for static hosting plus API origin/CORS configuration.
- Add observability hooks for API errors and failed admin mutations.

## Deferred

- Full WYSIWYG banner/campaign editor.
- Bulk product import/export.
- Advanced analytics cohorts.
- Multi-admin roles and granular permissions.
- CDN-backed media management.
