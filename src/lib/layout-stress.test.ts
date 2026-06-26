import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");
const actionSheet = readFileSync("src/components/ActionSheet.tsx", "utf8");
const dataTable = readFileSync("src/components/DataTable.tsx", "utf8");
const panel = readFileSync("src/components/Panel.tsx", "utf8");
const shell = readFileSync("src/components/Shell.tsx", "utf8");
const selectMenu = readFileSync("src/components/SelectMenu.tsx", "utf8");
const debouncedSearchParam = readFileSync(
  "src/lib/useDebouncedSearchParam.ts",
  "utf8",
);
const catalogPage = readFileSync("src/pages/CatalogPage.tsx", "utf8");
const bannersPage = readFileSync("src/pages/BannersPage.tsx", "utf8");
const dashboardPage = readFileSync("src/pages/DashboardPage.tsx", "utf8");
const notificationsPage = readFileSync(
  "src/pages/NotificationsPage.tsx",
  "utf8",
);
const ordersPage = readFileSync("src/pages/OrdersPage.tsx", "utf8");
const uploadPage = readFileSync("src/pages/UploadPage.tsx", "utf8");
const usersPage = readFileSync("src/pages/UsersPage.tsx", "utf8");
const vouchersPage = readFileSync("src/pages/VouchersPage.tsx", "utf8");

describe("admin layout stress guardrails", () => {
  it("keeps dense tables scrollable instead of forcing page overflow", () => {
    expect(css).toContain(".table-frame");
    expect(css).toMatch(/\.table-frame\s*{[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.table-frame\s*{[^}]*height:\s*clamp\(360px, 56vh, 620px\);/s);
    expect(css).toMatch(/\.catalog-table-panel \.table-frame,\s*\n\.voucher-list-panel \.table-frame,\s*\n\.orders-list-panel \.table-frame,\s*\n\.users-list-panel \.table-frame\s*{[^}]*flex:\s*1 1 auto;/s);
    expect(css).toMatch(/\.catalog-table-panel \.table-frame,\s*\n\.voucher-list-panel \.table-frame,\s*\n\.orders-list-panel \.table-frame,\s*\n\.users-list-panel \.table-frame\s*{[^}]*height:\s*auto;/s);
    expect(css).toMatch(/\.catalog-table-panel \.table-frame,\s*\n\.voucher-list-panel \.table-frame,\s*\n\.orders-list-panel \.table-frame,\s*\n\.users-list-panel \.table-frame\s*{[^}]*min-height:\s*0;/s);
    expect(css).toMatch(/\.table-scroll\s*{[^}]*overflow:\s*auto;/s);
    expect(css).toMatch(/table\s*{[^}]*min-width:\s*760px;/s);
  });

  it("truncates absurd row values while preserving full text access", () => {
    expect(css).toMatch(/\.table-cell-text\s*{[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(
      /\.table-cell-text\s*{[^}]*text-overflow:\s*ellipsis;/s,
    );
    expect(css).toMatch(/\.table-cell-text\s*{[^}]*white-space:\s*nowrap;/s);
    expect(dataTable).toContain("title={String(cell)}");
  });

  it("keeps large operational values from breaking cards or status pills", () => {
    expect(css).toMatch(
      /\.stat-card strong\s*{[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(css).toMatch(/\.api-status\s*{[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.api-status\s*{[^}]*text-overflow:\s*ellipsis;/s);
    expect(css).toMatch(/\.api-status\s*{[^}]*white-space:\s*nowrap;/s);
  });

  it("collapses shell and dashboard structure at tablet widths", () => {
    expect(css).toContain("@media (max-width: 1080px)");
    expect(css).toMatch(
      /\.shell,\s*\n\s*\.dashboard-grid,[\s\S]*grid-template-columns:\s*1fr;/,
    );
    expect(css).toMatch(/\.topbar\s*{[^}]*flex-direction:\s*column;/s);
    expect(css).toMatch(
      /@media \(max-width: 1080px\)[\s\S]*\.stat-grid\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 1080px\)[\s\S]*\.snapshot-content\s*{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 1080px\)[\s\S]*\.operation-strip\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.stat-grid\s*{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.dashboard-alerts-panel \.dashboard-alert-list\s*{[^}]*grid-template-columns:\s*1fr;/s,
    );
  });

  it("lays dashboard out with snapshot, KPI row, full-width alerts, and full-width charts", () => {
    expect(dashboardPage).toContain(
      'className="dashboard-revenue-panel chart-panel"',
    );
    expect(dashboardPage).toContain(
      'className="dashboard-status-panel chart-panel"',
    );
    expect(dashboardPage).toContain("const [period, setPeriod]");
    expect(dashboardPage).toContain("/dashboard/revenue?period=${period}");
    expect(dashboardPage).toContain("formatRevenueDate(value");
    expect(dashboardPage).toContain('period === "1y" ? "month" : "day"');
    expect(dashboardPage).toContain('formatRevenueDate(value, "full", language)');
    expect(css).toContain(".period-toggle");
    expect(dashboardPage).toContain('height="100%"');
    expect(dashboardPage).toContain('className="hero-panel"');
    expect(dashboardPage).toContain('className="snapshot-content"');
    expect(dashboardPage.indexOf('className="hero-panel"')).toBeLessThan(
      dashboardPage.indexOf('className="stat-grid"'),
    );
    expect(dashboardPage.indexOf('className="stat-grid"')).toBeLessThan(
      dashboardPage.indexOf('className="dashboard-alerts-panel"'),
    );
    expect(
      dashboardPage.indexOf('className="dashboard-alerts-panel"'),
    ).toBeLessThan(
      dashboardPage.indexOf('className="dashboard-status-panel chart-panel"'),
    );
    expect(
      dashboardPage.indexOf('className="dashboard-status-panel chart-panel"'),
    ).toBeLessThan(
      dashboardPage.indexOf('className="dashboard-recent-orders-panel"'),
    );
    expect(
      dashboardPage.indexOf('className="dashboard-recent-orders-panel"'),
    ).toBeLessThan(
      dashboardPage.indexOf('className="dashboard-top-products-panel"'),
    );
    expect(
      dashboardPage.indexOf('className="dashboard-top-products-panel"'),
    ).toBeLessThan(
      dashboardPage.indexOf('className="dashboard-revenue-panel chart-panel"'),
    );
    expect(css).toMatch(
      /\.dashboard-grid\s*{[^}]*grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\);/s,
    );
    expect(css).toMatch(
      /\.dashboard-alerts-panel\s*{[^}]*grid-column:\s*1 \/ -1;/s,
    );
    expect(css).toMatch(/\.stat-grid\s*{[^}]*grid-column:\s*1 \/ -1;/s);
    expect(css).toMatch(
      /\.stat-grid\s*{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/s,
    );
    expect(css).toMatch(
      /\.dashboard-alerts-panel \.dashboard-alert-list\s*{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 300px\), 1fr\)\);/s,
    );
    expect(css).toMatch(/\.hero-panel\s*{[^}]*grid-column:\s*1 \/ -1;/s);
    expect(css).toMatch(/\.hero-panel\s*{[^}]*min-height:\s*154px;/s);
    expect(css).toMatch(
      /:root\[data-theme="dark"\] \.hero-panel\s*{[^}]*oklch\(44% 0\.12 185 \/ 0\.36\)/s,
    );
    expect(css).toMatch(
      /:root\[data-theme="dark"\] \.hero-panel\s*{[^}]*oklch\(38% 0\.13 292 \/ 0\.28\)/s,
    );
    expect(css).toMatch(
      /\.snapshot-content\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(280px, 390px\);/s,
    );
    expect(css).toMatch(/\.snapshot-content\s*{[^}]*align-items:\s*start;/s);
    expect(css).toMatch(
      /\.operation-strip\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s,
    );
    expect(css).toMatch(/\.operation-strip\s*{[^}]*width:\s*min\(100%, 390px\);/s);
    expect(dashboardPage).not.toContain('className="snapshot-copy"');
    expect(css).toMatch(/\.snapshot-content p\s*{[^}]*font-size:\s*15px;/s);
    expect(css).toMatch(/\.snapshot-content p\s*{[^}]*max-width:\s*56ch;/s);
    expect(css).toMatch(
      /\.dashboard-revenue-panel\s*{[^}]*grid-column:\s*1 \/ -1;/s,
    );
    expect(css).toMatch(
      /\.dashboard-status-panel\s*{[^}]*grid-column:\s*1 \/ -1;/s,
    );
    expect(css).toMatch(
      /\.dashboard-top-products-panel\s*{[^}]*grid-column:\s*span 6;/s,
    );
    expect(css).toMatch(
      /\.dashboard-recent-orders-panel\s*{[^}]*grid-column:\s*span 6;/s,
    );
    expect(css).toMatch(/\.dashboard-grid\s*{[^}]*align-items:\s*stretch;/s);
    expect(css).toMatch(
      /\.chart-box\s*{[^}]*height:\s*clamp\(300px, 30vw, 370px\);/s,
    );
    expect(css).toMatch(
      /\.dashboard-status-panel \.chart-box\s*{[^}]*height:\s*360px;/s,
    );
    expect(dashboardPage).toContain("<Cell");
    expect(dashboardPage).toContain("fill={statusBarFill(item.status)}");
    expect(dashboardPage).toContain("fillOpacity={0.92}");
    expect(dashboardPage).toContain('cursor={{ fill: "var(--surface-3)" }}');
    expect(dashboardPage).toContain('case "PENDING"');
    expect(dashboardPage).toContain('case "PAID"');
    expect(dashboardPage).toContain('case "PACKED"');
    expect(dashboardPage).toContain('case "SHIPPED"');
    expect(dashboardPage).toContain('case "DELIVERED"');
    expect(dashboardPage).toContain('case "CANCELLED"');
    expect(dashboardPage).toContain("var(--chart-order-pending)");
    expect(dashboardPage).toContain("var(--chart-order-paid)");
    expect(dashboardPage).toContain("var(--chart-order-packed)");
    expect(dashboardPage).toContain("var(--chart-order-shipped)");
    expect(dashboardPage).toContain("var(--chart-order-delivered)");
    expect(dashboardPage).toContain("var(--chart-order-cancelled)");
    expect(css).toContain("--chart-order-pending: oklch(77% 0.145 76)");
    expect(css).toContain("--chart-order-paid: oklch(63% 0.16 262)");
    expect(css).toContain("--chart-order-packed: oklch(66% 0.135 220)");
    expect(css).toContain("--chart-order-shipped: oklch(63% 0.145 300)");
    expect(css).toContain("--chart-order-delivered: oklch(65% 0.145 148)");
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*{[\s\S]*--chart-order-delivered:\s*oklch\(70% 0\.14 148\);/s);
    expect(css).toMatch(
      /\.dashboard-top-products-panel\s*{[^}]*display:\s*flex;/s,
    );
    expect(dashboardPage).toContain('className="top-product-list"');
    expect(dashboardPage).toContain('className="top-product-item"');
    expect(dashboardPage).toContain('className="top-product-rank"');
    expect(dashboardPage).toContain('className="top-product-revenue"');
    expect(css).toMatch(/\.top-product-list\s*{[^}]*display:\s*grid;/s);
    expect(css).toMatch(
      /\.top-product-item\s*{[^}]*grid-template-columns:\s*38px minmax\(0, 1fr\) minmax\(96px, auto\);/s,
    );
  });

  it("adds dashboard alert and drill-down affordances", () => {
    expect(dashboardPage).toContain("/dashboard/alerts");
    expect(dashboardPage).toContain('className="dashboard-alerts-panel"');
    expect(dashboardPage).toContain('className="status-drill-list"');
    expect(dashboardPage).toContain("to={`/orders?status=${item.status}`}");
    expect(dashboardPage).toContain(
      'className="dashboard-recent-orders-panel"',
    );
    expect(css).toContain(".dashboard-alert-list");
    expect(css).toContain(".status-drill-list");
    expect(css).toContain(".recent-order-list");
    expect(css).toMatch(
      /\.dashboard-alerts-panel \.dashboard-alert-link strong\s*{[^}]*white-space:\s*normal;/s,
    );
    expect(css).toMatch(
      /\.dashboard-alerts-panel \.dashboard-alert-link \.badge\s*{[^}]*align-self:\s*center;/s,
    );
    expect(css).toMatch(/\.status-drill-list\s*{[^}]*display:\s*flex;/s);
    expect(css).toMatch(/\.status-drill-list\s*{[^}]*flex-wrap:\s*wrap;/s);
    expect(css).toMatch(/\.status-drill-list a\s*{[^}]*width:\s*fit-content;/s);
    expect(css).toMatch(
      /\.status-drill-list a > span:not\(\.badge\)\s*{[^}]*color:\s*var\(--muted\);/s,
    );
    expect(css).toMatch(/\.badge-good\s*{[^}]*color:\s*var\(--green-foreground\);/s);
    expect(css).toMatch(/\.badge-warn\s*{[^}]*color:\s*var\(--yellow-foreground\);/s);
    expect(css).toMatch(/\.badge-danger\s*{[^}]*color:\s*var\(--red-foreground\);/s);
    expect(css).toMatch(/\.badge-hot\s*{[^}]*color:\s*var\(--primary-foreground\);/s);
    expect(css).toContain(".badge-order-pending");
    expect(css).toContain(".badge-order-paid");
    expect(css).toContain(".badge-order-packed");
    expect(css).toContain(".badge-order-shipped");
    expect(css).toContain(".badge-order-delivered");
    expect(css).toContain(".badge-order-cancelled");
    expect(css).toContain("--badge-order-pending-foreground");
    expect(css).toContain("--badge-order-pending-bg");
    expect(css).toContain("--badge-order-pending-border");
    expect(css).toMatch(/\.badge-order-pending\s*{[^}]*--badge-order-foreground:\s*var\(--badge-order-pending-foreground\);/s);
    expect(css).toMatch(/\.badge-order-paid\s*{[^}]*--badge-order-bg:\s*var\(--badge-order-paid-bg\);/s);
    expect(css).toMatch(/\.badge-order-delivered\s*{[^}]*--badge-order-border:\s*var\(--badge-order-delivered-border\);/s);
    expect(css).not.toContain("--badge-order-color: var(--chart-order");
  });

  it("lets empty states occupy the available panel and table height", () => {
    expect(dashboardPage).toContain('className="panel-empty-state"');
    expect(dataTable).toContain("table-frame-empty");
    expect(dataTable).toContain('className="table-empty-state"');
    expect(dataTable).toContain("aria-describedby={isEmpty ? emptyStateId : undefined}");
    expect(css).toContain("--empty-state-bg: var(--surface-2)");
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*{[\s\S]*--empty-state-glow:\s*oklch\(30% 0\.07 262 \/ 0\.28\);/s);
    expect(css).toMatch(/\.table-frame-empty\s*{[^}]*min-height:\s*360px;/s);
    expect(css).toMatch(
      /\.table-frame-empty \.table-scroll\s*{[^}]*display:\s*flex;/s,
    );
    expect(css).toMatch(
      /\.table-frame-empty \.table-empty-state\s*{[^}]*flex:\s*1 1 auto;/s,
    );
    expect(css).toMatch(/\.table-frame-empty \.table-empty-state\s*{[^}]*var\(--empty-state-glow\)/s);
    expect(css).toMatch(/\.table-frame-empty \.table-empty-state\s*{[^}]*var\(--empty-state-bg\)/s);
    expect(css).toMatch(/\.panel-empty-state\s*{[^}]*min-height:\s*320px;/s);
    expect(css).toMatch(/\.panel-empty-state\s*{[^}]*var\(--empty-state-glow\)/s);
    expect(css).toMatch(/\.panel-empty-state\s*{[^}]*var\(--empty-state-bg\)/s);
    expect(css).toMatch(
      /\.dashboard-recent-orders-panel \.panel-empty-state\s*{[^}]*flex:\s*1;/s,
    );
    expect(css).toMatch(
      /\.dashboard-recent-orders-panel \.panel-empty-state\s*{[^}]*min-height:\s*320px;/s,
    );
  });

  it("keeps order rows structured and actions compact", () => {
    expect(ordersPage).toContain('className="order-main-cell"');
    expect(ordersPage).toContain('className="order-action-cell"');
    expect(ordersPage).toContain('className="order-detail-button"');
    expect(ordersPage).toContain('className="orders-toolbar"');
    expect(ordersPage).toContain('"orders-list-panel"');
    expect(ordersPage).toContain("orders-list-panel-with-detail");
    expect(ordersPage).toContain("<PaginationStrip");
    expect(dataTable).toContain("export type SortDirection");
    expect(dataTable).toContain('className="table-sort-button"');
    expect(dataTable).toContain("aria-sort=");
    expect(ordersPage).toContain("sortByParam");
    expect(ordersPage).toContain('ordersPath.set("sortBy", sortBy)');
    expect(dataTable).toContain("export type SortChangeDirection");
    expect(dataTable).toContain("oppositeSortDirection");
    expect(ordersPage).toContain('next.delete("sortBy")');
    expect(ordersPage).toContain('next.delete("sortDir")');
    expect(ordersPage).toContain("sort={{ key: visibleSortBy, direction: visibleSortDir, onSort: setOrderSort }}");
    expect(ordersPage).toContain('sortKey: "createdAt"');
    expect(debouncedSearchParam).toContain("window.setTimeout");
    expect(debouncedSearchParam).toContain('next.set("search", trimmed)');
    expect(ordersPage).toContain("orderSearchDraft");
    expect(ordersPage).toContain("placeholderData: (previousData) => previousData");
    expect(ordersPage).toContain("function OrderStatusMenu");
    expect(ordersPage).toContain('className="order-status-menu"');
    expect(ordersPage).toContain('menuClassName="order-status-menu-list"');
    expect(ordersPage).toContain('optionClassName="order-status-menu-option"');
    expect(ordersPage).toContain("triggerLabel={c.statusLabels[order.status]}");
    expect(ordersPage).toContain('PENDING: "Menunggu"');
    expect(ordersPage).toContain('PAID: "Dibayar"');
    expect(ordersPage).toContain('PACKED: "Dikemas"');
    expect(ordersPage).toContain('SHIPPED: "Dikirim"');
    expect(ordersPage).toContain('DELIVERED: "Selesai"');
    expect(ordersPage).toContain('CANCELLED: "Dibatalkan"');
    expect(ordersPage).toContain('UNPAID: "Belum bayar"');
    expect(ordersPage).toContain('REFUNDED: "Dikembalikan"');
    expect(ordersPage).toContain('FAILED: "Gagal"');
    expect(ordersPage).toContain('EXPIRED: "Expired"');
    expect(ordersPage).toContain("c.trackingPrompt(order.orderNumber)");
    expect(ordersPage).toContain("c.cancelReasonPrompt(order.orderNumber)");
    expect(ordersPage).toContain("reason: reason.trim() || undefined");
    expect(ordersPage).toContain("OrderDetailPanel");
    expect(ordersPage).toContain("/orders/${selectedOrderId}");
    expect(ordersPage).toContain('className="icon-button icon-button-danger order-cancel-button"');
    expect(ordersPage).toContain('className="text-copy-button"');
    expect(ordersPage).toContain('className="order-detail-summary"');
    expect(ordersPage).toContain('className="order-detail-section"');
    expect(ordersPage).toContain('className="order-section-heading"');
    expect(ordersPage).toContain('className="order-item-total"');
    expect(css).toMatch(/\.order-action-cell\s*{[^}]*min-width:\s*292px;/s);
    expect(css).toMatch(/\.order-status-menu\s*{[^}]*min-width:\s*136px;/s);
    expect(css).toContain(".order-status-menu-option");
    expect(css).toMatch(/\.order-detail-summary\s*{[^}]*grid-template-columns:\s*minmax\(0, 1\.2fr\) repeat\(2, minmax\(0, 0\.9fr\)\);/s);
    expect(css).toContain(".order-detail-copy-button");
    expect(css).toContain(".orders-toolbar");
    expect(css).toMatch(/\.orders-toolbar\s*{[^}]*display:\s*grid;/s);
    expect(css).toMatch(/\.orders-toolbar\s*{[^}]*grid-template-columns:\s*minmax\(260px, 1fr\) repeat\(3, minmax\(150px, 170px\)\) auto;/s);
    expect(css).toMatch(/@media \(max-width: 1180px\)[\s\S]*\.orders-toolbar\s*{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) auto;/s);
    expect(css).toMatch(/@media \(max-width: 1180px\)[\s\S]*\.orders-toolbar label:first-child\s*{[^}]*grid-column:\s*1 \/ -1;/s);
    expect(css).not.toMatch(/@media \(max-width: 1080px\)[\s\S]*\.orders-toolbar[\s\S]*grid-template-columns:\s*1fr;/s);
    expect(css).toMatch(/\.orders-toolbar label:not\(:first-child\)\s*{[^}]*min-width:\s*0;/s);
    expect(css).toContain(".pagination-strip");
    expect(css).toContain(".table-sort-button");
    expect(css).toContain(".table-sort-indicator");
    expect(css).toContain(".order-detail-panel");
    expect(css).toMatch(/\.orders-list-panel-with-detail \.table-frame\s*{[^}]*flex:\s*1 1 260px;/s);
    expect(css).toMatch(/\.orders-list-panel-with-detail \.table-frame\s*{[^}]*min-height:\s*180px;/s);
    expect(css).toMatch(/\.order-detail-panel\s*{[^}]*max-height:\s*min\(420px, 42vh\);/s);
    expect(css).toMatch(/\.order-detail-panel\s*{[^}]*overflow:\s*auto;/s);
    expect(css).toMatch(/\.orders-list-panel,\s*\n\.users-list-panel\s*{[^}]*height:\s*calc\(100vh - 150px\);/s);
  });

  it("adds customer role and status filters", () => {
    expect(usersPage).toContain('className="catalog-toolbar users-toolbar"');
    expect(usersPage).toContain('className="users-list-panel"');
    expect(usersPage).toContain('id="user-role-filter"');
    expect(usersPage).toContain('id="user-status-filter"');
    expect(usersPage).toContain('params.set("role", roleFilter)');
    expect(usersPage).toContain('params.set("isActive", statusFilter === "active" ? "true" : "false")');
    expect(usersPage).toContain('active: "Active"');
    expect(usersPage).toContain('disabled: "Inactive"');
    expect(usersPage).not.toContain('active: "Aktif"');
    expect(usersPage).not.toContain('disabled: "Nonaktif"');
    expect(usersPage).not.toContain('active: "ACTIVE"');
    expect(usersPage).not.toContain('disabled: "DISABLED"');
    expect(usersPage).toContain('params.set("sortBy", effectiveSortBy)');
    expect(usersPage).toContain('params.set("sortDir", effectiveSortDir)');
    expect(usersPage).toContain('const effectiveSortBy = sortBy || "createdAt"');
    expect(usersPage).toContain("userSortKeys");
    expect(usersPage).toContain("sort={{ key: sortBy, direction: sortDir, onSort: setUserSort }}");
    expect(css).toMatch(
      /\.users-toolbar\s*{[^}]*grid-template-columns:\s*minmax\(220px, 1fr\) minmax\(150px, 0\.42fr\) minmax\(150px, 0\.42fr\) auto;/s,
    );
  });

  it("corrects out-of-range pagination after filtered data loads", () => {
    expect(catalogPage).toContain("productsQuery.isPlaceholderData");
    expect(catalogPage).toContain('next.set("page", String(productTotalPages))');
    expect(catalogPage).toContain("setSearchParams(next, { replace: true })");
    expect(ordersPage).toContain("ordersQuery.isPlaceholderData");
    expect(ordersPage).toContain('next.set("page", String(orderTotalPages))');
    expect(ordersPage).toContain("setSearchParams(next, { replace: true })");
    expect(vouchersPage).toContain("vouchersQuery.isPlaceholderData");
    expect(vouchersPage).toContain("setPage(voucherTotalPages)");
    expect(usersPage).toContain("usersQuery.isPlaceholderData");
    expect(usersPage).toContain("setPage(userTotalPages)");
  });

  it("gives the catalog table and edit forms enough workspace", () => {
    expect(catalogPage).toContain('className="catalog-table-panel"');
    expect(catalogPage).toContain("<ActionSheet");
    expect(catalogPage).not.toContain('className="catalog-side-stack"');
    expect(css).toMatch(
      /\.catalog-layout\s*{[^}]*grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\);/s,
    );
    expect(css).toMatch(/\.catalog-layout,\s*\n\.vouchers-layout,\s*\n\.banners-layout\s*{[^}]*grid-template-rows:\s*minmax\(0, 1fr\) auto;/s);
    expect(css).toMatch(/\.catalog-layout,\s*\n\.vouchers-layout,\s*\n\.banners-layout\s*{[^}]*height:\s*calc\(100vh - 150px\);/s);
    expect(css).toMatch(/\.catalog-table-panel,\s*\n\.voucher-list-panel,\s*\n\.banner-list-panel,\s*\n\.orders-list-panel,\s*\n\.users-list-panel\s*{[^}]*display:\s*flex;/s);
    expect(css).toMatch(
      /\.catalog-table-panel\s*{[^}]*grid-column:\s*1 \/ -1;/s,
    );
    expect(css).not.toContain(".catalog-product-panel");
    expect(css).not.toContain(".catalog-side-stack");
    expect(css).not.toMatch(/\.catalog-table-panel table\s*{/s);
    expect(css).toMatch(/table\s*{[^}]*min-width:\s*760px;/s);
    expect(css).toMatch(
      /\.product-form-grid\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s,
    );
    expect(css).toMatch(
      /\.catalog-toolbar\s*{[^}]*grid-template-columns:\s*minmax\(220px, 1fr\) minmax\(180px, 0\.55fr\) auto;/s,
    );
    expect(css).toMatch(
      /\.action-sheet-form\.product-form-grid,\s*\n\.action-sheet-form\.product-form-grid \.check-grid\s*{[^}]*grid-template-columns:\s*1fr;/s,
    );
  });

  it("keeps page loading states centered in the available viewport", () => {
    expect(css).toMatch(
      /\.loading-state,\s*\n\.error-state\s*{[^}]*align-content:\s*center;/s,
    );
    expect(css).toMatch(/\.loading-state\s*{[^}]*min-height:\s*100vh;/s);
    expect(css).toMatch(
      /\.workspace\s*>\s*\.loading-state,\s*\n\.workspace\s*>\s*\.error-state\s*{[^}]*height:\s*calc\(100vh - 150px\);/s,
    );
    expect(css).toMatch(
      /\.workspace\s*>\s*\.loading-state,\s*\n\.workspace\s*>\s*\.error-state\s*{[^}]*min-height:\s*0;/s,
    );
  });

  it("anchors the workspace topbar with stable content gap", () => {
    expect(css).toMatch(/\.workspace\s*{[^}]*display:\s*flex;/s);
    expect(css).toMatch(/\.workspace\s*{[^}]*flex-direction:\s*column;/s);
    expect(css).toMatch(/\.workspace\s*{[^}]*gap:\s*20px;/s);
    expect(css).toMatch(/\.topbar\s*{[^}]*flex:\s*0 0 auto;/s);
  });

  it("keeps banner previews stable and truncates long metadata", () => {
    expect(css).toMatch(/\.banner-wall\s*{[^}]*display:\s*flex;/s);
    expect(css).toMatch(/\.banner-wall\s*{[^}]*flex-wrap:\s*wrap;/s);
    expect(css).toMatch(/\.banner-wall\s*{[^}]*flex:\s*1 1 auto;/s);
    expect(css).toMatch(/\.banner-wall\s*{[^}]*min-height:\s*0;/s);
    expect(css).toMatch(/\.banner-wall\s*{[^}]*overflow-x:\s*hidden;/s);
    expect(css).toMatch(/\.banner-wall\s*{[^}]*overflow-y:\s*auto;/s);
    expect(css).toMatch(/\.banner-wall\s*{[^}]*padding:\s*0 4px 18px 0;/s);
    expect(css).toMatch(/\.banner-wall\s*{[^}]*scroll-padding-bottom:\s*18px;/s);
    expect(css).toMatch(/\.banner-card\s*{[^}]*flex:\s*0 1 calc\(\(100% - 28px\) \/ 3\);/s);
    expect(css).toMatch(/\.banner-card\s*{[^}]*align-self:\s*flex-start;/s);
    expect(css).toMatch(/@container \(min-width: 1600px\)[\s\S]*\.banner-card\s*{[^}]*flex-basis:\s*calc\(\(100% - 42px\) \/ 4\);/s);
    expect(css).toMatch(/@container \(max-width: 1180px\)[\s\S]*\.banner-card\s*{[^}]*flex-basis:\s*calc\(\(100% - 14px\) \/ 2\);/s);
    expect(css).toMatch(/@container \(max-width: 760px\)[\s\S]*\.banner-card\s*{[^}]*flex-basis:\s*100%;/s);
    expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*\.banner-card\s*{[^}]*flex-basis:\s*100%;/s);
    expect(css).toMatch(/@container \(max-width: 720px\)[\s\S]*\.banner-filter-bar\s*{[^}]*grid-template-columns:\s*1fr;/s);
    expect(bannersPage).toContain('className="list-filter-bar banner-filter-bar"');
    expect(bannersPage).toContain('id="banner-search"');
    expect(bannersPage).toContain('id="banner-status-filter"');
    expect(bannersPage).toContain("filteredBanners.map");
    expect(css).toContain(".list-filter-bar");
    expect(css).toContain(".filter-input-with-icon");
    expect(css).toContain(".banner-filter-bar");
    expect(css).toMatch(/\.banner-media\s*{[^}]*aspect-ratio:\s*16 \/ 9;/s);
    expect(css).toMatch(/\.banner-media\s*{[^}]*position:\s*relative;/s);
    expect(css).toMatch(/\.banner-media\s*{[^}]*margin:\s*0;/s);
    expect(css).toMatch(/\.banner-media\s*{[^}]*width:\s*100%;/s);
    expect(css).toContain(".banner-media::after");
    expect(css).toMatch(/\.banner-card\s*{[^}]*min-width:\s*0;/s);
    expect(css).toMatch(/\.banner-card\s*{[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.banner-card\s*{[^}]*padding:\s*0;/s);
    expect(css).toMatch(/\.banner-card\s*{[^}]*transform 160ms ease;/s);
    expect(css).toMatch(/\.banner-card-body\s*{[^}]*gap:\s*8px;/s);
    expect(css).toMatch(/\.banner-card-body\s*{[^}]*padding:\s*13px 14px 14px;/s);
    expect(css).toMatch(/\.banner-card-heading\s*{[^}]*min-width:\s*0;/s);
    expect(css).toMatch(
      /\.banner-card-heading strong\s*{[^}]*text-overflow:\s*ellipsis;/s,
    );
    expect(css).toMatch(
      /\.banner-card-heading strong\s*{[^}]*font-size:\s*16px;/s,
    );
    expect(bannersPage).toContain('className="banner-card-overlay"');
    expect(bannersPage).toContain('className="banner-card-overlay-actions"');
    expect(css).toContain(".banner-card-overlay");
    expect(css).toContain(".banner-card-overlay-actions");
    expect(bannersPage).toContain("startEditingBanner(banner)");
    expect(bannersPage).toContain("permanentDeleteBanner");
    expect(bannersPage).toContain('/banners/${id}/permanent');
    expect(bannersPage).toContain("confirmDeletePermanent");
    expect(bannersPage).toContain("deletingBanner");
    expect(bannersPage).toContain("toggleBanner");
    expect(bannersPage).toContain('method: "DELETE"');
    expect(bannersPage).toContain('body: JSON.stringify({ isActive: true })');
    expect(bannersPage).toContain("c.deactivateBanner(banner.title)");
    expect(bannersPage).toContain("c.reactivateBanner(banner.title)");
    expect(bannersPage).toContain('icon-button-destructive-glyph');
    expect(bannersPage).toContain("<PowerOff");
    expect(bannersPage).toContain("<Power");
    expect(bannersPage).toContain('title={c.deletePermanent}');
    expect(bannersPage).toContain('className="danger-button"');
    expect(bannersPage).not.toContain("window.confirm(c.confirmDeletePermanent");
    expect(bannersPage).toContain('className="icon-button icon-button-danger"');
    expect(bannersPage).toContain("<Trash2");
    expect(bannersPage).not.toContain("banner-action");
    expect(css).toContain(".banner-card-overlay-actions .icon-button-danger");
    expect(css).toContain(".icon-button-destructive-glyph");
    expect(css).toMatch(/\.banner-card-overlay-actions \.icon-button\s*{[^}]*border-color:\s*var\(--line\);/s);
    expect(css).toMatch(/\.banner-card-overlay-actions \.icon-button:hover\s*{[^}]*border-color:\s*var\(--primary-border-medium\);/s);
    expect(css).not.toContain(".banner-action");
    expect(css).toMatch(/\.banner-card\s*{[^}]*max-width:\s*100%;/s);
    expect(css).toMatch(/\.banner-card-overlay\s*{[^}]*min-width:\s*0;/s);
    expect(css).toMatch(/\.banner-card-overlay \.badge\s*{[^}]*max-width:\s*calc\(100% - 120px\);/s);
    expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*\.banner-card-overlay \.badge\s*{[^}]*max-width:\s*calc\(100% - 112px\);/s);
    expect(css).toContain(".banner-card span:not(.badge)");
    expect(css).toMatch(/\.banner-meta\s*{[^}]*margin-top:\s*0;/s);
    expect(css).toMatch(/\.banner-meta > span:not\(\.badge\)\s*{[^}]*white-space:\s*nowrap;/s);
    expect(css).toMatch(/\.banner-wall > \.empty-inline\s*{[^}]*flex:\s*1 0 100%;/s);
    expect(css).toMatch(/\.empty-inline\s*{[^}]*var\(--empty-state-glow\)/s);
    expect(css).toMatch(/\.empty-inline\s*{[^}]*var\(--empty-state-bg\)/s);
    expect(css).not.toMatch(/\.banner-wall > \.empty-inline\s*{[^}]*oklch\(95% 0\.032 262/s);
    expect(bannersPage).toContain('banner.isActive ? "badge-good" : "badge-danger"');
    expect(bannersPage.indexOf('banner.isActive ? "badge-good" : "badge-danger"')).toBeLessThan(
      bannersPage.indexOf("<span>{c.order} {banner.sortOrder}</span>"),
    );
    expect(
      bannersPage.indexOf("<span>{c.order} {banner.sortOrder}</span>"),
    ).toBeLessThan(
      bannersPage.indexOf("<span title={banner.link ?? undefined}>"),
    );
  });

  it("keeps result counts in the panel header meta slot", () => {
    expect(panel).toContain("headerMeta?: ReactNode");
    expect(panel).toContain('className="panel-header-aside"');
    expect(panel).toContain('className="panel-header-meta"');
    expect(css).toContain(".panel-header-meta");
    expect(css).toContain(".panel-external-actions");
    expect(css).toContain(".panel-header-aside");
    expect(css).toMatch(/\.panel-header-aside\s*{[^}]*display:\s*inline-flex;/s);
    expect(css).toMatch(/\.panel-header-aside\s*{[^}]*justify-content:\s*flex-end;/s);
    expect(css).toMatch(/\.panel-external-actions\s*{[^}]*grid-column:\s*1 \/ -1;/s);
    expect(css).toMatch(/\.panel-external-actions\s*{[^}]*justify-content:\s*flex-end;/s);
    expect(css).toMatch(/\.panel-external-actions\s*{[^}]*gap:\s*8px;/s);
    expect(css).not.toContain(".panel-header-actions-row .primary-button");
    expect(css).toMatch(/\.panel-header-meta\s*{[^}]*white-space:\s*nowrap;/s);
    expect(catalogPage).toContain("headerMeta={c.productsCount");
    expect(catalogPage).toContain("c.productsCount");
    expect(usersPage).toContain("headerMeta={c.usersCount");
    expect(usersPage).toContain("c.usersCount");
    expect(vouchersPage).toContain("headerMeta={c.vouchersCount");
    expect(vouchersPage).toContain("c.vouchersCount");
    expect(bannersPage).toContain("headerMeta={c.bannersCount(filteredBanners.length)}");
    expect(ordersPage).toContain("headerMeta={c.ordersCount");
  });

  it("reuses the banner form for create and edit actions", () => {
    expect(bannersPage).toContain("useState<Banner | null>");
    expect(bannersPage).toContain("bannerSheetOpen");
    expect(bannersPage).toContain("startCreatingBanner");
    expect(bannersPage).toContain("startEditingBanner(banner)");
    expect(bannersPage).toContain("<ActionSheet");
    expect(bannersPage).toContain('className="panel-external-actions"');
    expect(bannersPage.indexOf('</Panel>')).toBeLessThan(
      bannersPage.indexOf('className="panel-external-actions"'),
    );
    expect(bannersPage).toContain('className="control-form action-sheet-form"');
    expect(bannersPage).toContain(
      "title={editingBanner ? c.formTitleEdit : c.formTitleCreate}",
    );
    expect(bannersPage).toContain("request<Banner>(`/banners/${id}`");
    expect(bannersPage).toContain('cancel: "Cancel"');
    expect(bannersPage).toContain('publishDialog: "Publish"');
    expect(bannersPage).toContain("editingBanner ? c.update : c.publishDialog");
    expect(css).toContain(".banner-card-overlay-actions");
    expect(css).toContain(".danger-button");
    expect(bannersPage).toContain('id="banner-isActive"');
    expect(bannersPage).toContain('form.register("isActive")');
  });

  it("exposes catalog merchandising controls for featured and flash sale rails", () => {
    expect(catalogPage).toContain('productForm.register("isFeatured")');
    expect(catalogPage).toContain('productForm.register("isFlashSale")');
    expect(catalogPage).toContain('productForm.register("flashSaleEndsAt")');
    expect(catalogPage).toContain("homeSections:");
    expect(catalogPage).toContain("featured:");
    expect(catalogPage).toContain("flashSale:");
    expect(catalogPage).toContain("request<Product>(`/products/${id}`");
    expect(css).toMatch(/\.merch-cell\s*{[^}]*min-width:\s*268px;/s);
    expect(css).toMatch(/\.merch-cell\s*{[^}]*max-width:\s*360px;/s);
    expect(css).toContain(".merch-row");
    expect(css).toMatch(
      /\.merch-row\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) max-content;/s,
    );
    expect(catalogPage).toContain('data-state={product.isFeatured ? "on" : "off"}');
    expect(catalogPage).toContain('className="merch-state-heading"');
    expect(catalogPage).toContain('className="merch-state-detail"');
    expect(catalogPage).toContain('className="merch-dot"');
    expect(catalogPage).toContain('aria-label={`${product.isFeatured ? c.hide : c.show} ${c.featured}`}');
    expect(catalogPage).toContain('aria-label={`${flashActionLabel} ${c.flashSale}`}');
    expect(css).toMatch(/\.merch-state\s*{[^}]*min-width:\s*0;/s);
    expect(css).toContain('.merch-row[data-state="live"]');
    expect(css).toContain('.merch-row[data-state="expired"]');
    expect(css).toContain(".merch-state-detail");
    expect(css).toContain(".merch-dot");
    expect(css).toMatch(
      /\.merch-action-button\s*{[^}]*white-space:\s*nowrap;/s,
    );
    expect(css).toContain(".merch-form-panel");
  });

  it("exposes catalog filters, stock visibility, and image previews", () => {
    expect(catalogPage).toContain('className="catalog-toolbar"');
    expect(catalogPage).toContain("catalogSearchDraft");
    expect(catalogPage).toContain("placeholderData: (previousData) => previousData");
    expect(catalogPage).toContain("StockCell");
    expect(catalogPage).toContain("AssetPreview");
    expect(catalogPage).toContain("ProductImageGallery");
    expect(catalogPage).toContain("`/images/${id}`");
    expect(catalogPage).toContain("/images/reorder");
    expect(catalogPage).toContain("catalogSortKeys");
    expect(catalogPage).toContain("productQuery");
    expect(catalogPage).toContain('sortBy,');
    expect(catalogPage).toContain('sortDir,');
    expect(catalogPage).toContain('const sortBy = visibleSortBy || "createdAt"');
    expect(catalogPage).toContain('next.delete("sortBy")');
    expect(catalogPage).toContain('next.delete("sortDir")');
    expect(catalogPage).toContain("sort={{ key: visibleSortBy, direction: visibleSortDir, onSort: setCatalogSort }}");
    expect(catalogPage).toContain('sortKey: "basePrice"');
    expect(catalogPage).not.toContain('id="catalog-sort"');
    expect(css).toContain(".catalog-toolbar");
    expect(css).toContain(".stock-cell");
    expect(css).toMatch(
      /\.stock-cell > span:not\(\.badge\)\s*{[^}]*color:\s*var\(--muted\);/s,
    );
    expect(css).toContain(".asset-preview");
    expect(css).toContain(".product-image-gallery");
    expect(css).toContain(".image-gallery-card");
  });

  it("reuses the product form for create and edit actions", () => {
    expect(catalogPage).toContain("useState<Product | null>");
    expect(catalogPage).toContain("productSheetOpen");
    expect(catalogPage).toContain("variantSheetOpen");
    expect(catalogPage).toContain("imageSheetOpen");
    expect(catalogPage).toContain("categorySheetOpen");
    expect(catalogPage).toContain("startCreatingProduct");
    expect(catalogPage).toContain("startEditingProduct(product)");
    expect(catalogPage).toContain("<ActionSheet");
    expect(catalogPage).toContain('className="panel-external-actions"');
    expect(catalogPage.indexOf('</Panel>')).toBeLessThan(
      catalogPage.indexOf('className="panel-external-actions"'),
    );
    expect(catalogPage).toContain("setVariantSheetOpen(true)");
    expect(catalogPage).toContain("setImageSheetOpen(true)");
    expect(catalogPage).toContain("setCategorySheetOpen(true)");
    expect(catalogPage).toContain('className="control-form product-form-grid action-sheet-form"');
    expect(catalogPage).toContain('className="control-form action-sheet-form"');
    expect(catalogPage).toContain("closeVariantSheet");
    expect(catalogPage).toContain("closeImageSheet");
    expect(catalogPage).toContain("closeCategorySheet");
    expect(catalogPage).toContain(
      "title={editingProduct ? c.editProduct(editingProduct.name) : c.createProduct}",
    );
    expect(catalogPage).toContain("request<Product>(`/products/${id}`");
    expect(catalogPage).toContain('cancelEdit: "Cancel"');
    expect(catalogPage).toContain('createCategoryDialog: "Create"');
    expect(catalogPage).toContain("{c.createCategoryDialog}");
    expect(catalogPage).toContain('manageVariants: "Manage variants"');
    expect(catalogPage).toContain('manageImages: "Manage images"');
    expect(catalogPage).toContain('noOptions: "No options found"');
    expect(catalogPage).toContain('noOptions: "Tidak ada opsi"');
    expect(catalogPage).toContain("searchPlaceholder={c.search}");
    expect(catalogPage).toContain("noResultsLabel={c.noOptions}");
    expect(catalogPage).toContain('id="catalog-category-filter"');
    expect(catalogPage).toContain("onCancel={closeImageSheet}");
    expect(catalogPage).toContain("<ImagePlus size={16} /> {c.attachImage}");
    expect(catalogPage).not.toContain("imageTarget");
    expect(catalogPage).not.toContain("Target gambar");
    expect(catalogPage).not.toContain("minor-form");
    expect(css).not.toContain(".minor-form");
  });

  it("keeps broadcast and upload panels aligned to the URLs panel", () => {
    expect(notificationsPage).toContain('className="broadcast-panel"');
    expect(uploadPage).toContain('className="upload-main-panel"');
    expect(uploadPage).toContain('className="upload-urls-panel"');
    expect(uploadPage).toContain("setUploaded((previous) => [...result, ...previous])");
    expect(shell).toContain('"workspace workspace-messages"');
    expect(shell).toContain('"workspace workspace-upload"');
    expect(notificationsPage).toContain('className="control-form broadcast-form"');
    expect(notificationsPage).toContain('className="broadcast-message-field"');
    expect(notificationsPage).toContain('<div className="form-actions broadcast-form-actions">');
    expect(notificationsPage).toContain('z.enum(["PROMO", "ORDER", "SYSTEM"])');
    expect(css).toMatch(/\.workspace-messages\s*{[^}]*gap:\s*14px;/s);
    expect(css).toMatch(/\.broadcast-panel,\s*\n\.upload-main-panel,\s*\n\.upload-urls-panel\s*{[^}]*height:\s*461px;/s);
    expect(css).not.toMatch(/\.broadcast-panel\s*{[^}]*height:/s);
    expect(css).toMatch(/\.broadcast-panel,\s*\n\.upload-main-panel,\s*\n\.upload-urls-panel\s*{[^}]*display:\s*flex;/s);
    expect(css).toMatch(/\.broadcast-form\s*{[^}]*flex:\s*1 1 auto;/s);
    expect(css).toMatch(/\.broadcast-form\s*{[^}]*min-height:\s*0;/s);
    expect(css).toMatch(/\.broadcast-form\s*{[^}]*grid-template-rows:\s*auto auto minmax\(0, 1fr\) auto;/s);
    expect(css).toMatch(/\.broadcast-message-field\s*{[^}]*min-height:\s*0;/s);
    expect(css).toMatch(/\.broadcast-message-field\s*{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/s);
    expect(css).toMatch(/\.broadcast-message-field textarea\s*{[^}]*height:\s*100%;/s);
    expect(css).toMatch(/\.broadcast-message-field textarea\s*{[^}]*min-height:\s*0;/s);
    expect(css).toMatch(/\.broadcast-form-actions\s*{[^}]*justify-content:\s*flex-end;/s);
    expect(css).toMatch(/\.dropzone\s*{[^}]*box-sizing:\s*border-box;/s);
    expect(css).toMatch(/\.dropzone\s*{[^}]*flex:\s*1 1 auto;/s);
    expect(css).toMatch(/\.dropzone\s*{[^}]*min-height:\s*0;/s);
    expect(css).toMatch(/\.dropzone\s*{[^}]*var\(--empty-state-glow-strong\)/s);
    expect(css).toMatch(/\.dropzone\s*{[^}]*var\(--empty-state-bg\)/s);
    expect(css).toMatch(/\.upload-urls-panel \.asset-list\s*{[^}]*flex:\s*1 1 auto;/s);
    expect(css).toMatch(/\.upload-urls-panel \.asset-list\s*{[^}]*overflow:\s*auto;/s);
    expect(css).toMatch(/\.asset-list-empty\s*{[^}]*var\(--empty-state-glow-strong\)/s);
    expect(css).toMatch(/\.asset-list-empty\s*{[^}]*var\(--empty-state-bg\)/s);
    expect(css).toMatch(/\.upload-urls-panel \.asset-list-empty\s*{[^}]*min-height:\s*0;/s);
    expect(css).toMatch(/\.upload-urls-panel \.asset-list-empty\s*{[^}]*height:\s*100%;/s);
  });

  it("supports voucher create, read, update, deactivate, reactivate, and guarded hard delete", () => {
    expect(actionSheet).toContain('role="dialog"');
    expect(actionSheet).toContain('aria-modal="true"');
    expect(actionSheet).toContain("Escape");
    expect(vouchersPage).toContain("useState<Voucher | null>");
    expect(vouchersPage).toContain("voucherSheetOpen");
    expect(vouchersPage).toContain("startCreatingVoucher");
    expect(vouchersPage).toContain("<ActionSheet");
    expect(vouchersPage).toContain('className="panel-external-actions"');
    expect(vouchersPage.indexOf('</Panel>')).toBeLessThan(
      vouchersPage.indexOf('className="panel-external-actions"'),
    );
    expect(vouchersPage).toContain('className="control-form action-sheet-form"');
    expect(vouchersPage).toContain('className="list-filter-bar"');
    expect(vouchersPage).toContain('id="voucher-search"');
    expect(vouchersPage).toContain('id="voucher-type-filter"');
    expect(vouchersPage).toContain('id="voucher-status-filter"');
    expect(vouchersPage).toContain("debouncedSearch");
    expect(vouchersPage).toContain('params.set("search", debouncedSearch.trim())');
    expect(vouchersPage).toContain('params.set("type", typeFilter)');
    expect(vouchersPage).toContain('params.set("status", statusFilter)');
    expect(vouchersPage).toContain('params.set("sortBy", effectiveSortBy)');
    expect(vouchersPage).toContain('params.set("sortDir", effectiveSortDir)');
    expect(vouchersPage).toContain('const effectiveSortBy = sortBy || "createdAt"');
    expect(vouchersPage).toContain("type VoucherListData = Paginated<Voucher> & { fetchedAt: number }");
    expect(vouchersPage).toContain("return { ...data, fetchedAt: Date.now() }");
    expect(vouchersPage).toContain("const statusNow = vouchersQuery.data?.fetchedAt ?? 0");
    expect(vouchersPage).not.toContain("const statusNow = vouchersQuery.dataUpdatedAt");
    expect(vouchersPage).toContain(": new Date().toISOString()");
    expect(vouchersPage).toContain("voucherSortKeys");
    expect(vouchersPage).toContain("sort={{ key: sortBy, direction: sortDir, onSort: setVoucherSort }}");
    expect(vouchersPage).toContain("placeholderData: (previousData) => previousData");
    expect(vouchersPage).toContain("startEditingVoucher(voucher)");
    expect(vouchersPage).toContain("request<Voucher>(`/vouchers/${id}`");
    expect(vouchersPage).toContain('method: "DELETE"');
    expect(vouchersPage).toContain("permanentDeleteVoucher");
    expect(vouchersPage).toContain('/vouchers/${id}/permanent');
    expect(vouchersPage).toContain("deletingVoucher");
    expect(vouchersPage).toContain("confirmDeletePermanent");
    expect(vouchersPage).toContain("hardDeleteDisabled = voucher.usedCount > 0");
    expect(vouchersPage).toContain("deletingVoucher.usedCount > 0");
    expect(vouchersPage).toContain(
      "disabled={hardDeleteDisabled || permanentDeleteVoucher.isPending}",
    );
    expect(vouchersPage).toContain('title={c.deletePermanent}');
    expect(vouchersPage).toContain('className="danger-button"');
    expect(vouchersPage).toContain("<Trash2");
    expect(vouchersPage).not.toContain("window.confirm(c.confirmDeletePermanent");
    expect(vouchersPage).toContain(
      'aria-label={`${voucher.isActive ? c.disable : c.enable} ${c.voucherLabel} ${voucher.code}`}',
    );
    expect(vouchersPage).toContain("c.cancel");
    expect(vouchersPage).toContain('cancel: "Cancel"');
    expect(vouchersPage).toContain('cancel: "Batal"');
    expect(vouchersPage).toContain('createDialog: "Create"');
    expect(vouchersPage).toContain('createDialog: "Buat"');
    expect(vouchersPage).toContain("editingVoucher ? c.update : c.createDialog");
    expect(css).toContain(".action-sheet-layer");
    expect(css).toMatch(/\.action-sheet-layer\s*{[^}]*align-items:\s*center;/s);
    expect(css).toMatch(/\.action-sheet-layer\s*{[^}]*justify-content:\s*center;/s);
    expect(css).toMatch(/\.action-sheet\s*{[^}]*width:\s*min\(100%, 560px\);/s);
    expect(css).toMatch(/\.action-sheet\s*{[^}]*max-height:\s*calc\(100vh - 56px\);/s);
    expect(css).toMatch(/\.action-sheet\s*{[^}]*border-radius:\s*22px;/s);
    expect(css).toContain("animation: dialog-enter");
    expect(css).toContain(".action-sheet-close");
    expect(actionSheet).toContain("action-sheet-close");
    expect(css).toContain(".action-sheet-form .form-actions");
  });

  it("marks destructive web actions with destructive button styling", () => {
    expect(css).toContain(".icon-button-danger");
    expect(css).toContain(".icon-button-destructive-glyph");
    expect(css).toContain(".table-button-danger");
    expect(vouchersPage).toContain(
      'voucher.isActive ? " icon-button-destructive-glyph" : ""',
    );
    expect(usersPage).toContain(
      'user.isActive && !protectedUser ? " icon-button-destructive-glyph" : ""',
    );
    expect(vouchersPage).toContain('className="icon-button icon-button-danger"');
  });

  it("styles reusable dropdowns and keeps menus context aware", () => {
    expect(selectMenu).toContain("updatePlacement");
    expect(selectMenu).toContain("data-placement={placement}");
    expect(selectMenu).toContain("data-align={alignment}");
    expect(selectMenu).toContain("searchable = false");
    expect(selectMenu).toContain("visibleOptions");
    expect(selectMenu).toContain("const closeMenu = () =>");
    expect(selectMenu).toContain("event.stopPropagation()");
    expect(selectMenu).toContain('className="select-menu-search"');
    expect(selectMenu).toContain('className="select-menu-empty"');
    expect(selectMenu).toContain("window.addEventListener(\"resize\", updatePlacement)");
    expect(selectMenu).toContain("window.addEventListener(\"scroll\", updatePlacement, true)");
    expect(css).toMatch(/\.select-menu-trigger\s*{[^}]*--select-arrow:\s*var\(--muted\);/s);
    expect(css).toMatch(
      /\.select-menu-trigger\[aria-expanded="true"\]\s*{[^}]*--select-arrow:\s*var\(--primary\);/s,
    );
    expect(css).toMatch(/\.select-menu-list\s*{[^}]*overflow-y:\s*auto;/s);
    expect(css).toMatch(/\.select-menu-list\[data-searchable="true"\]\s*{[^}]*max-width:\s*min\(420px, 90vw\);/s);
    expect(css).toMatch(/\.select-menu-search\s*{[^}]*position:\s*sticky;/s);
    expect(css).toMatch(/\.select-menu-search input\s*{[^}]*min-height:\s*36px;/s);
    expect(css).toContain(".select-menu-empty");
    expect(css).toMatch(/\.select-menu-list\[data-placement="top"\]\s*{[^}]*bottom:\s*calc\(100% \+ 6px\);/s);
    expect(css).toMatch(/\.pagination-size-menu \.select-menu-trigger\s*{[^}]*min-height:\s*36px;/s);
  });
});
