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

  return (
    <div
      className={`table-frame${rows.length === 0 ? " table-frame-empty" : ""}`}
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table>
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                <div className="table-empty-state">{emptyCopy}</div>
              </td>
            </tr>
          ) : (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
