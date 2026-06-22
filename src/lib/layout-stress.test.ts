import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");
const dataTable = readFileSync("src/components/DataTable.tsx", "utf8");

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
});
