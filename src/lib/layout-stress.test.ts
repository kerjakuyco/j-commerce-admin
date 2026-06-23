import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");
const dataTable = readFileSync("src/components/DataTable.tsx", "utf8");
const catalogPage = readFileSync("src/pages/CatalogPage.tsx", "utf8");
const bannersPage = readFileSync("src/pages/BannersPage.tsx", "utf8");
const dashboardPage = readFileSync("src/pages/DashboardPage.tsx", "utf8");
const notificationsPage = readFileSync("src/pages/NotificationsPage.tsx", "utf8");
const ordersPage = readFileSync("src/pages/OrdersPage.tsx", "utf8");
const vouchersPage = readFileSync("src/pages/VouchersPage.tsx", "utf8");

describe("admin layout stress guardrails", () => {
  it("keeps dense tables scrollable instead of forcing page overflow", () => {
    expect(css).toContain(".table-frame");
    expect(css).toMatch(/\.table-frame\s*{[^}]*overflow:\s*auto;/s);
    expect(css).toMatch(/table\s*{[^}]*min-width:\s*760px;/s);
  });

  it("truncates absurd row values while preserving full text access", () => {
    expect(css).toMatch(/\.table-cell-text\s*{[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.table-cell-text\s*{[^}]*text-overflow:\s*ellipsis;/s);
    expect(css).toMatch(/\.table-cell-text\s*{[^}]*white-space:\s*nowrap;/s);
    expect(dataTable).toContain('title={String(cell)}');
  });

  it("keeps large operational values from breaking cards or status pills", () => {
    expect(css).toMatch(/\.stat-card strong\s*{[^}]*overflow-wrap:\s*anywhere;/s);
    expect(css).toMatch(/\.api-status\s*{[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.api-status\s*{[^}]*text-overflow:\s*ellipsis;/s);
    expect(css).toMatch(/\.api-status\s*{[^}]*white-space:\s*nowrap;/s);
  });

  it("collapses shell and dashboard structure at tablet widths", () => {
    expect(css).toContain("@media (max-width: 1080px)");
    expect(css).toMatch(/\.shell,\s*\n\s*\.dashboard-grid,[\s\S]*grid-template-columns:\s*1fr;/);
    expect(css).toMatch(/\.topbar\s*{[^}]*flex-direction:\s*column;/s);
    expect(css).toMatch(/\.operation-strip\s*{[^}]*flex-wrap:\s*wrap;/s);
  });

  it("gives dashboard charts enough workspace", () => {
    expect(dashboardPage).toContain('className="dashboard-revenue-panel chart-panel"');
    expect(dashboardPage).toContain('className="dashboard-status-panel chart-panel"');
    expect(dashboardPage).toContain('const [period, setPeriod]');
    expect(dashboardPage).toContain('/dashboard/revenue?period=${period}');
    expect(css).toContain('.period-toggle');
    expect(dashboardPage).toContain('height="100%"');
    expect(css).toMatch(/\.dashboard-grid\s*{[^}]*grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\);/s);
    expect(css).toMatch(/\.dashboard-revenue-panel\s*{[^}]*grid-column:\s*1 \/ -1;/s);
    expect(css).toMatch(/\.dashboard-status-panel\s*{[^}]*grid-column:\s*span 8;/s);
    expect(css).toMatch(/\.dashboard-top-products-panel\s*{[^}]*grid-column:\s*span 4;/s);
    expect(css).toMatch(/\.dashboard-alerts-panel,\s*\n\.dashboard-recent-orders-panel\s*{[^}]*grid-column:\s*span 6;/s);
    expect(css).toMatch(/\.dashboard-grid\s*{[^}]*align-items:\s*stretch;/s);
    expect(css).toMatch(/\.chart-box\s*{[^}]*height:\s*clamp\(320px, 32vw, 390px\);/s);
    expect(css).toMatch(/\.dashboard-status-panel \.chart-box\s*{[^}]*height:\s*360px;/s);
    expect(css).toMatch(/\.dashboard-top-products-panel\s*{[^}]*display:\s*flex;/s);
  });

  it("adds dashboard alert and drill-down affordances", () => {
    expect(dashboardPage).toContain('/dashboard/alerts');
    expect(dashboardPage).toContain('className="dashboard-alerts-panel"');
    expect(dashboardPage).toContain('className="status-drill-list"');
    expect(dashboardPage).toContain('to={`/orders?status=${item.status}`}');
    expect(dashboardPage).toContain('className="dashboard-recent-orders-panel"');
    expect(css).toContain('.dashboard-alert-list');
    expect(css).toContain('.status-drill-list');
    expect(css).toContain('.recent-order-list');
  });

  it("lets empty states occupy the available panel and table height", () => {
    expect(dashboardPage).toContain('className="panel-empty-state"');
    expect(dataTable).toContain('table-frame-empty');
    expect(dataTable).toContain('className="table-empty-state"');
    expect(css).toMatch(/\.table-frame-empty\s*{[^}]*min-height:\s*360px;/s);
    expect(css).toMatch(/\.panel-empty-state\s*{[^}]*min-height:\s*320px;/s);
  });

  it("keeps order rows structured and actions compact", () => {
    expect(ordersPage).toContain('className="order-main-cell"');
    expect(ordersPage).toContain('className="order-action-cell"');
    expect(ordersPage).toContain('className="orders-toolbar"');
    expect(ordersPage).toContain('className="pagination-strip"');
    expect(ordersPage).toContain('className="order-status-select"');
    expect(ordersPage).toContain('Tracking number for ${order.orderNumber}');
    expect(ordersPage).toContain('Cancellation reason for ${order.orderNumber}');
    expect(ordersPage).toContain('reason: reason.trim() || undefined');
    expect(ordersPage).toContain('OrderDetailPanel');
    expect(ordersPage).toContain('/orders/${selectedOrderId}');
    expect(ordersPage).toContain('className="icon-button icon-button-danger"');
    expect(ordersPage).toContain('className="text-copy-button"');
    expect(css).toMatch(/\.order-action-cell\s*{[^}]*min-width:\s*184px;/s);
    expect(css).toMatch(/\.order-status-select\s*{[^}]*min-width:\s*136px;/s);
    expect(css).toContain('.orders-toolbar');
    expect(css).toContain('.pagination-strip');
    expect(css).toContain('.order-detail-panel');
  });

  it("gives the catalog table and edit forms enough workspace", () => {
    expect(catalogPage).toContain('className="catalog-table-panel"');
    expect(catalogPage).toContain('className="catalog-product-panel"');
    expect(catalogPage).toContain('className="catalog-side-stack"');
    expect(css).toMatch(/\.catalog-layout\s*{[^}]*grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\);/s);
    expect(css).toMatch(/\.catalog-table-panel\s*{[^}]*grid-column:\s*1 \/ -1;/s);
    expect(css).toMatch(/\.catalog-product-panel\s*{[^}]*grid-column:\s*span 7;/s);
    expect(css).toMatch(/\.catalog-side-stack\s*{[^}]*grid-column:\s*span 5;/s);
    expect(css).toMatch(/\.product-form-grid\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
  });

  it("keeps page loading states centered in the available viewport", () => {
    expect(css).toMatch(/\.loading-state,\s*\n\.error-state\s*{[^}]*align-content:\s*center;/s);
    expect(css).toMatch(/\.loading-state\s*{[^}]*min-height:\s*100vh;/s);
    expect(css).toMatch(/\.workspace\s*>\s*\.loading-state\s*{[^}]*min-height:\s*calc\(100vh - 136px\);/s);
  });

  it("keeps banner previews stable and truncates long metadata", () => {
    expect(css).toMatch(/\.banner-wall\s*{[^}]*minmax\(280px, 1fr\)/s);
    expect(css).toMatch(/\.banner-media\s*{[^}]*aspect-ratio:\s*16 \/ 9;/s);
    expect(css).toMatch(/\.banner-card-heading strong\s*{[^}]*text-overflow:\s*ellipsis;/s);
    expect(css).toMatch(/\.banner-meta span\s*{[^}]*white-space:\s*nowrap;/s);
  });

  it("reuses the banner form for create and edit actions", () => {
    expect(bannersPage).toContain('useState<Banner | null>');
    expect(bannersPage).toContain('startEditingBanner(banner)');
    expect(bannersPage).toContain('title={editingBanner ? "Edit banner" : "Create banner"}');
    expect(bannersPage).toContain('request<Banner>(`/banners/${id}`');
    expect(bannersPage).toContain('Cancel edit');
    expect(css).toContain('.banner-actions');
  });

  it("exposes catalog merchandising controls for featured and flash sale rails", () => {
    expect(catalogPage).toContain('productForm.register("isFeatured")');
    expect(catalogPage).toContain('productForm.register("isFlashSale")');
    expect(catalogPage).toContain('productForm.register("flashSaleEndsAt")');
    expect(catalogPage).toContain('Home sections');
    expect(catalogPage).toContain('<strong>Featured</strong>');
    expect(catalogPage).toContain('<strong>Flash sale</strong>');
    expect(catalogPage).toContain('request<Product>(`/products/${id}`');
    expect(css).toMatch(/\.merch-cell\s*{[^}]*min-width:\s*240px;/s);
    expect(css).toContain('.merch-row');
    expect(css).toContain('.merch-form-panel');
  });

  it("exposes catalog filters, stock visibility, and image previews", () => {
    expect(catalogPage).toContain('className="catalog-toolbar"');
    expect(catalogPage).toContain('StockCell');
    expect(catalogPage).toContain('AssetPreview');
    expect(catalogPage).toContain('ProductImageGallery');
    expect(catalogPage).toContain('`/images/${id}`');
    expect(catalogPage).toContain('/images/reorder');
    expect(catalogPage).toContain('catalogSorts');
    expect(css).toContain('.catalog-toolbar');
    expect(css).toContain('.stock-cell');
    expect(css).toContain('.asset-preview');
    expect(css).toContain('.product-image-gallery');
    expect(css).toContain('.image-gallery-card');
  });

  it("reuses the product form for create and edit actions", () => {
    expect(catalogPage).toContain('useState<Product | null>');
    expect(catalogPage).toContain('startEditingProduct(product)');
    expect(catalogPage).toContain('title={editingProduct ? "Edit product" : "Create product"}');
    expect(catalogPage).toContain('request<Product>(`/products/${id}`');
    expect(catalogPage).toContain('Cancel edit');
  });

  it("keeps broadcast submit action aligned with the form", () => {
    expect(notificationsPage).toContain('<div className="form-actions">');
    expect(notificationsPage).toContain('z.enum(["PROMO", "ORDER", "SYSTEM"])');
  });

  it("supports voucher create, read, update, deactivate, and reactivate", () => {
    expect(vouchersPage).toContain('useState<Voucher | null>');
    expect(vouchersPage).toContain('startEditingVoucher(voucher)');
    expect(vouchersPage).toContain('request<Voucher>(`/vouchers/${id}`');
    expect(vouchersPage).toContain('method: "DELETE"');
    expect(vouchersPage).toContain('aria-label={`${voucher.isActive ? "Disable" : "Enable"} voucher ${voucher.code}`}');
    expect(vouchersPage).toContain('Cancel edit');
  });

  it("marks destructive web actions with destructive button styling", () => {
    expect(css).toContain(".icon-button-danger");
    expect(css).toContain(".table-button-danger");
    expect(vouchersPage).toContain('voucher.isActive ? " icon-button-danger" : ""');
  });

  it("styles native selects as dense admin dropdowns", () => {
    expect(css).toMatch(/select\s*{[^}]*appearance:\s*none;/s);
    expect(css).toMatch(/select\s*{[^}]*--select-arrow:\s*var\(--muted\);/s);
    expect(css).toMatch(/select:focus\s*{[^}]*--select-arrow:\s*var\(--primary\);/s);
    expect(css).toMatch(/\.table-actions select\s*{[^}]*min-height:\s*36px;/s);
  });
});
