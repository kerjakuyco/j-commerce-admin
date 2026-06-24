import { useId } from "react";

import { useI18n } from "../context/I18nContext";

type ColumnDef = { label: string; key: string } | string;

export function DataTable({
  columns,
  rows,
  empty,
  keyExtractor,
  caption,
}: {
  columns: ColumnDef[];
  rows: React.ReactNode[][];
  empty?: string;
  keyExtractor?: (row: React.ReactNode[], index: number) => string | number;
  caption: string;
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
                return (
                  <th key={key} scope="col">
                    {label}
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
