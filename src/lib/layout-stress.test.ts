import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");
const dataTable = readFileSync("src/components/DataTable.tsx", "utf8");
const panel = readFileSync("src/components/Panel.tsx", "utf8");
const selectMenu = readFileSync("src/components/SelectMenu.tsx", "utf8");
const catalogPage = readFileSync("src/pages/CatalogPage.tsx", "utf8");
const bannersPage = readFileSync("src/pages/BannersPage.tsx", "utf8");
const dashboardPage = readFileSync("src/pages/DashboardPage.tsx", "utf8");
const notificationsPage = readFileSync(
  "src/pages/NotificationsPage.tsx",
  "utf8",
);
const ordersPage = readFileSync("src/pages/OrdersPage.tsx", "utf8");
const usersPage = readFileSync("src/pages/UsersPage.tsx", "utf8");
const vouchersPage = readFileSync("src/pages/VouchersPage.tsx", "utf8");

describe("admin layout stress guardrails", () => {
  it("keeps dense tables scrollable instead of forcing page overflow", () => {
    expect(css).toContain(".table-frame");
    expect(css).toMatch(/\.table-frame\s*{[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.table-frame\s*{[^}]*height:\s*clamp\(360px, 56vh, 620px\);/s);
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
    expect(dashboardPage).toContain('cursor={{ fill: "var(--surface-3)" }}');
    expect(dashboardPage).toContain("var(--green)");
    expect(dashboardPage).toContain("var(--yellow)");
    expect(dashboardPage).toContain("var(--red)");
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
  });

  it("lets empty states occupy the available panel and table height", () => {
    expect(dashboardPage).toContain('className="panel-empty-state"');
    expect(dataTable).toContain("table-frame-empty");
    expect(dataTable).toContain('className="table-empty-state"');
    expect(dataTable).toContain("aria-describedby={isEmpty ? emptyStateId : undefined}");
    expect(css).toMatch(/\.table-frame-empty\s*{[^}]*min-height:\s*360px;/s);
    expect(css).toMatch(
      /\.table-frame-empty \.table-scroll\s*{[^}]*display:\s*flex;/s,
    );
    expect(css).toMatch(
      /\.table-frame-empty \.table-empty-state\s*{[^}]*flex:\s*1 1 auto;/s,
    );
    expect(css).toMatch(/\.panel-empty-state\s*{[^}]*min-height:\s*320px;/s);
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
    expect(ordersPage).toContain("<PaginationStrip");
    expect(ordersPage).toContain("function OrderStatusMenu");
    expect(ordersPage).toContain('className="order-status-menu"');
    expect(ordersPage).toContain('menuClassName="order-status-menu-list"');
    expect(ordersPage).toContain('optionClassName="order-status-menu-option"');
    expect(ordersPage).toContain("triggerLabel={c.statusLabels[order.status]}");
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
    expect(css).toContain(".pagination-strip");
    expect(css).toContain(".order-detail-panel");
  });

  it("adds customer role and status filters", () => {
    expect(usersPage).toContain('className="catalog-toolbar users-toolbar"');
    expect(usersPage).toContain('id="user-role-filter"');
    expect(usersPage).toContain('id="user-status-filter"');
    expect(usersPage).toContain('params.set("role", roleFilter)');
    expect(usersPage).toContain('params.set("isActive", statusFilter === "active" ? "true" : "false")');
    expect(css).toMatch(
      /\.users-toolbar\s*{[^}]*grid-template-columns:\s*minmax\(220px, 1fr\) minmax\(150px, 0\.42fr\) minmax\(150px, 0\.42fr\) auto;/s,
    );
  });

  it("gives the catalog table and edit forms enough workspace", () => {
    expect(catalogPage).toContain('className="catalog-table-panel"');
    expect(catalogPage).toContain('className="catalog-product-panel"');
    expect(catalogPage).toContain('className="catalog-side-stack"');
    expect(css).toMatch(
      /\.catalog-layout\s*{[^}]*grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\);/s,
    );
    expect(css).toMatch(
      /\.catalog-table-panel\s*{[^}]*grid-column:\s*1 \/ -1;/s,
    );
    expect(css).not.toMatch(/\.catalog-table-panel table\s*{/s);
    expect(css).toMatch(/table\s*{[^}]*min-width:\s*760px;/s);
    expect(css).toMatch(
      /\.catalog-product-panel\s*{[^}]*grid-column:\s*span 7;/s,
    );
    expect(css).toMatch(/\.catalog-side-stack\s*{[^}]*grid-column:\s*span 5;/s);
    expect(css).toMatch(
      /\.product-form-grid\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s,
    );
  });

  it("keeps page loading states centered in the available viewport", () => {
    expect(css).toMatch(
      /\.loading-state,\s*\n\.error-state\s*{[^}]*align-content:\s*center;/s,
    );
    expect(css).toMatch(/\.loading-state\s*{[^}]*min-height:\s*100vh;/s);
    expect(css).toMatch(
      /\.workspace\s*>\s*\.loading-state\s*{[^}]*min-height:\s*calc\(100vh - 136px\);/s,
    );
  });

  it("anchors the workspace topbar with stable content gap", () => {
    expect(css).toMatch(/\.workspace\s*{[^}]*display:\s*flex;/s);
    expect(css).toMatch(/\.workspace\s*{[^}]*flex-direction:\s*column;/s);
    expect(css).toMatch(/\.workspace\s*{[^}]*gap:\s*20px;/s);
    expect(css).toMatch(/\.topbar\s*{[^}]*flex:\s*0 0 auto;/s);
  });

  it("keeps banner previews stable and truncates long metadata", () => {
    expect(css).toMatch(/\.banner-wall\s*{[^}]*minmax\(280px, 1fr\)/s);
    expect(bannersPage).toContain('className="list-filter-bar banner-filter-bar"');
    expect(bannersPage).toContain('id="banner-search"');
    expect(bannersPage).toContain('id="banner-status-filter"');
    expect(bannersPage).toContain("filteredBanners.map");
    expect(css).toContain(".list-filter-bar");
    expect(css).toContain(".filter-input-with-icon");
    expect(css).toContain(".banner-filter-bar");
    expect(css).toMatch(/\.banner-media\s*{[^}]*aspect-ratio:\s*16 \/ 9;/s);
    expect(css).toMatch(/\.banner-media\s*{[^}]*margin:\s*-10px -10px 0;/s);
    expect(css).toMatch(/\.banner-media\s*{[^}]*width:\s*calc\(100% \+ 20px\);/s);
    expect(css).toMatch(/\.banner-card\s*{[^}]*min-width:\s*0;/s);
    expect(css).toMatch(/\.banner-card\s*{[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.banner-card-body\s*{[^}]*gap:\s*10px;/s);
    expect(css).toMatch(/\.banner-card-heading\s*{[^}]*min-width:\s*0;/s);
    expect(css).toMatch(
      /\.banner-card-heading strong\s*{[^}]*text-overflow:\s*ellipsis;/s,
    );
    expect(css).toMatch(
      /\.banner-card-heading strong\s*{[^}]*font-size:\s*16px;/s,
    );
    expect(css).toMatch(
      /\.banner-meta \.badge\s*{[^}]*flex:\s*0 0 auto;/s,
    );
    expect(css).toContain(".banner-card span:not(.badge)");
    expect(css).toMatch(/\.banner-meta\s*{[^}]*margin-top:\s*8px;/s);
    expect(css).toMatch(/\.banner-meta > span:not\(\.badge\)\s*{[^}]*white-space:\s*nowrap;/s);
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
    expect(panel).toContain("headerMeta?: React.ReactNode");
    expect(panel).toContain('className="panel-header-meta"');
    expect(css).toContain(".panel-header-meta");
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
    expect(bannersPage).toContain("startEditingBanner(banner)");
    expect(bannersPage).toContain(
      "title={editingBanner ? c.formTitleEdit : c.formTitleCreate}",
    );
    expect(bannersPage).toContain("request<Banner>(`/banners/${id}`");
    expect(bannersPage).toContain("Cancel edit");
    expect(css).toContain(".banner-actions");
  });

  it("exposes catalog merchandising controls for featured and flash sale rails", () => {
    expect(catalogPage).toContain('productForm.register("isFeatured")');
    expect(catalogPage).toContain('productForm.register("isFlashSale")');
    expect(catalogPage).toContain('productForm.register("flashSaleEndsAt")');
    expect(catalogPage).toContain("homeSections:");
    expect(catalogPage).toContain("featured:");
    expect(catalogPage).toContain("flashSale:");
    expect(catalogPage).toContain("request<Product>(`/products/${id}`");
    expect(css).toMatch(/\.merch-cell\s*{[^}]*min-width:\s*240px;/s);
    expect(css).toMatch(/\.merch-cell\s*{[^}]*max-width:\s*320px;/s);
    expect(css).toContain(".merch-row");
    expect(css).toMatch(
      /\.merch-row\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s,
    );
    expect(css).toMatch(/\.merch-state\s*{[^}]*min-width:\s*0;/s);
    expect(css).toMatch(
      /\.merch-action-button\s*{[^}]*white-space:\s*nowrap;/s,
    );
    expect(css).toContain(".merch-form-panel");
  });

  it("exposes catalog filters, stock visibility, and image previews", () => {
    expect(catalogPage).toContain('className="catalog-toolbar"');
    expect(catalogPage).toContain("StockCell");
    expect(catalogPage).toContain("AssetPreview");
    expect(catalogPage).toContain("ProductImageGallery");
    expect(catalogPage).toContain("`/images/${id}`");
    expect(catalogPage).toContain("/images/reorder");
    expect(catalogPage).toContain("catalogSorts");
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
    expect(catalogPage).toContain("startEditingProduct(product)");
    expect(catalogPage).toContain(
      "title={editingProduct ? c.editProduct(editingProduct.name) : c.createProduct}",
    );
    expect(catalogPage).toContain("request<Product>(`/products/${id}`");
    expect(catalogPage).toContain("c.cancelEdit");
  });

  it("keeps broadcast submit action aligned with the form", () => {
    expect(notificationsPage).toContain('<div className="form-actions">');
    expect(notificationsPage).toContain('z.enum(["PROMO", "ORDER", "SYSTEM"])');
  });

  it("supports voucher create, read, update, deactivate, and reactivate", () => {
    expect(vouchersPage).toContain("useState<Voucher | null>");
    expect(vouchersPage).toContain('className="list-filter-bar"');
    expect(vouchersPage).toContain('id="voucher-search"');
    expect(vouchersPage).toContain('id="voucher-type-filter"');
    expect(vouchersPage).toContain('id="voucher-status-filter"');
    expect(vouchersPage).toContain('params.set("search", search.trim())');
    expect(vouchersPage).toContain('params.set("type", typeFilter)');
    expect(vouchersPage).toContain('params.set("status", statusFilter)');
    expect(vouchersPage).toContain("startEditingVoucher(voucher)");
    expect(vouchersPage).toContain("request<Voucher>(`/vouchers/${id}`");
    expect(vouchersPage).toContain('method: "DELETE"');
    expect(vouchersPage).toContain(
      'aria-label={`${voucher.isActive ? c.disable : c.enable} ${c.voucherLabel} ${voucher.code}`}',
    );
    expect(vouchersPage).toContain("c.cancel");
  });

  it("marks destructive web actions with destructive button styling", () => {
    expect(css).toContain(".icon-button-danger");
    expect(css).toContain(".table-button-danger");
    expect(vouchersPage).toContain(
      'voucher.isActive ? " icon-button-danger" : ""',
    );
  });

  it("styles reusable dropdowns and keeps menus context aware", () => {
    expect(selectMenu).toContain("updatePlacement");
    expect(selectMenu).toContain("data-placement={placement}");
    expect(selectMenu).toContain("data-align={alignment}");
    expect(selectMenu).toContain("window.addEventListener(\"resize\", updatePlacement)");
    expect(selectMenu).toContain("window.addEventListener(\"scroll\", updatePlacement, true)");
    expect(css).toMatch(/\.select-menu-trigger\s*{[^}]*--select-arrow:\s*var\(--muted\);/s);
    expect(css).toMatch(
      /\.select-menu-trigger\[aria-expanded="true"\]\s*{[^}]*--select-arrow:\s*var\(--primary\);/s,
    );
    expect(css).toMatch(/\.select-menu-list\s*{[^}]*overflow-y:\s*auto;/s);
    expect(css).toMatch(/\.select-menu-list\[data-placement="top"\]\s*{[^}]*bottom:\s*calc\(100% \+ 6px\);/s);
    expect(css).toMatch(/\.pagination-size-menu \.select-menu-trigger\s*{[^}]*min-height:\s*36px;/s);
  });
});
