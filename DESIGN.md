# j-commerce Admin Design System

## Visual Direction

Clean operations UI with white surfaces, slate text, blue primary actions, and small colorful accents in navigation/status. It should match the mobile app's cleaner brand direction while staying denser and more table-friendly.

## Color Strategy

Restrained product UI.

- Background: cool near-white via `--bg`
- Surface: white via `--surface`
- Primary: blue via `--primary`
- Text: slate via `--ink`
- Secondary text: muted slate via `--muted`
- Borders: cool slate via `--line`
- Status colors: green, yellow, red, blue, with soft backgrounds

Avoid beige, terracotta, and warm paper surfaces.

## Navigation

The sidebar stays neutral white/slate, but icons use controlled category-like colors:

- Dashboard: blue
- Orders: green
- Catalog: cyan
- Users: purple
- Vouchers: pink
- Messages: orange
- Banners: teal
- Upload: red

Active navigation uses blue soft background and blue text.

## Components

- Panels: white cards, subtle slate border, soft cool shadow.
- Tables: dense rows, cool header background, clear hover state, readable truncation.
- Forms: white inputs, slate borders, blue focus ring.
- Primary buttons: blue fill, white text, subtle blue shadow.
- Ghost/table buttons: white surface, slate border, blue text for table actions.
- Badges: soft semantic backgrounds, high-readability semantic text.
- Login poster: cool blue/teal gradient, not a beige marketing hero.
- Loading states: low-contrast cool spinner and neutral surface.

## Typography

- Plus Jakarta Sans for major headings and display values.
- DM Sans/system sans for labels, forms, tables, and body text.
- Keep table labels compact and uppercase only for headers/eyebrows.

## Layout Rules

- Keep sidebar stable on desktop and stacked on tablet/mobile.
- Preserve table density. Do not over-expand rows or controls.
- Dashboard cards may be visually stronger than data-entry panels, but still restrained.
- Use color to identify function or state, not as decoration.

## Design Bans

- Beige or terracotta admin theme.
- Decorative glass cards.
- Gradient text.
- Colored side-stripe accents.
- Landing-page hero patterns in CRUD pages.
- Low-contrast table text.
