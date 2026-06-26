import { useId } from "react";

import { useI18n } from "../context/I18nContext";

export type SortDirection = "asc" | "desc";
export type SortChangeDirection = SortDirection | null;

export type ColumnDef =
  | string
  | {
      label: string;
      key: string;
      sortable?: boolean;
      sortKey?: string;
      defaultSortDirection?: SortDirection;
    };

export function DataTable({
  columns,
  rows,
  empty,
  keyExtractor,
  caption,
  sort,
}: {
  columns: ColumnDef[];
  rows: React.ReactNode[][];
  empty?: string;
  keyExtractor?: (row: React.ReactNode[], index: number) => string | number;
  caption: string;
  sort?: {
    key: string;
    direction: SortDirection;
    onSort: (key: string, direction: SortChangeDirection) => void;
  };
}) {
  const { t } = useI18n();
  const emptyCopy = empty ?? t.common.noRecords;
  const emptyStateId = useId();
  const isEmpty = rows.length === 0;

  return (
    <div className={`table-frame${isEmpty ? " table-frame-empty" : ""}`}>
      <div
        className="table-scroll"
        role="region"
        aria-label={caption}
        tabIndex={0}
      >
        <table aria-describedby={isEmpty ? emptyStateId : undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const key = typeof column === "string" ? column : column.key;
                const label = typeof column === "string" ? column : column.label;
                const sortable = typeof column !== "string" && column.sortable;
                const sortKey = typeof column === "string" ? key : column.sortKey ?? key;
                const activeSort = sort && sortable && sort.key === sortKey ? sort : undefined;
                const active = Boolean(activeSort);
                const defaultDirection =
                  typeof column === "string"
                    ? "desc"
                    : column.defaultSortDirection ?? "desc";
                const direction = activeSort ? activeSort.direction : defaultDirection;
                const nextDirection: SortChangeDirection = activeSort
                  ? activeSort.direction === defaultDirection
                    ? oppositeSortDirection(defaultDirection)
                    : null
                  : defaultDirection;
                return (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={
                      activeSort
                        ? activeSort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {sortable && sort ? (
                      <button
                        className="table-sort-button"
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          sort.onSort(
                            sortKey,
                            active ? nextDirection : defaultDirection,
                          );
                        }}
                      >
                        <span>{label}</span>
                        <span
                          className="table-sort-indicator"
                          data-direction={direction}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {!isEmpty &&
              rows.map((row, index) => (
                <tr key={keyExtractor ? keyExtractor(row, index) : index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      {typeof cell === "string" || typeof cell === "number" ? (
                        <span className="table-cell-text" title={String(cell)}>
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        {isEmpty ? (
          <div id={emptyStateId} className="table-empty-state">
            {emptyCopy}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function oppositeSortDirection(direction: SortDirection): SortDirection {
  return direction === "asc" ? "desc" : "asc";
}
