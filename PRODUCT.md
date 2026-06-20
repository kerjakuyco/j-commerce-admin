# j-commerce Admin Product Context

## Register

product

## Product Purpose

j-commerce-admin is the operations console for the single-store j-commerce storefront. It lets an admin manage catalog data, products, variants, banners, vouchers, orders, users, broadcasts, dashboard metrics, and uploaded assets.

The admin should feel like a focused control room for store operations, not a marketing site. It must prioritize readability, reliable data actions, clear status, and low-friction forms.

## Primary Users

- Store operators managing orders, catalog, promos, and banners.
- Admin users checking revenue, order status, top products, and user state.
- Reviewers evaluating the full-stack portfolio alongside the mobile app and API.

## Product Principles

- Operational clarity first. Tables, forms, status badges, and confirmations must be direct and legible.
- Same brand family as mobile. Use the white/slate/blue base with controlled colorful accents.
- Admin density is allowed. Do not make forms or tables sparse just to look airy.
- Destructive actions require confirmation and clear copy.
- Loading and error states must preserve context where possible.

## Tone

- Concise English admin copy.
- Prefer action verbs: Publish, Create, Remove, Deactivate, Broadcast.
- Avoid playful copy in destructive, auth, order, and user-management flows.

## Anti-References

- Beige monotone admin dashboards.
- Overly decorative SaaS landing-page styling inside operational screens.
- Tiny tables, weak contrast, or vague status colors.
- Sparse cards with low information value.
- Harsh loading states or loud decorative backgrounds.

## Related Repositories

- `j-commerce`: Flutter customer storefront.
- `j-commerce-api`: NestJS, Prisma, MySQL backend.
