import type { Paginated } from "../types";
import { SelectMenu } from "./SelectMenu";

type PaginationMeta = Paginated<unknown>["meta"];

export function PaginationStrip({
  meta,
  page,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  label,
  pageSizeLabel,
  previous,
  next,
  pageOf,
  onPageChange,
  onPageSizeChange,
}: {
  meta?: PaginationMeta;
  page: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  label: string;
  pageSizeLabel?: string;
  previous: string;
  next: string;
  pageOf: (page: number, totalPages: number) => string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  if (!meta) return null;

  const totalPages = Math.max(meta.totalPages || 1, 1);
  const currentPage = Math.min(Math.max(meta.page || page, 1), totalPages);

  return (
    <div className="pagination-strip" aria-label={label}>
      {pageSize !== undefined && onPageSizeChange && pageSizeLabel && (
        <label className="pagination-size">
          {pageSizeLabel}
          <SelectMenu
            value={String(pageSize)}
            options={pageSizeOptions.map((option) => ({
              value: String(option),
              label: String(option),
            }))}
            onChange={(value) => onPageSizeChange(Number(value))}
            ariaLabel={pageSizeLabel}
            className="pagination-size-menu"
          />
        </label>
      )}
      <button
        className="ghost-button"
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        {previous}
      </button>
      <span>{pageOf(currentPage, totalPages)}</span>
      <button
        className="ghost-button"
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        {next}
      </button>
    </div>
  );
}
