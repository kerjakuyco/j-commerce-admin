type ColumnDef = { label: string; key: string } | string

export function DataTable({
  columns,
  rows,
  empty = 'No records yet.',
  keyExtractor,
}: {
  columns: ColumnDef[]
  rows: React.ReactNode[][]
  empty?: string
  keyExtractor?: (row: React.ReactNode[], index: number) => string | number
}) {
  return (
    <div className="table-frame">
      <table>
        <thead>
          <tr>
            {columns.map((column) => {
              const key = typeof column === 'string' ? column : column.key
              const label = typeof column === 'string' ? column : column.label
              return <th key={key}>{label}</th>
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={keyExtractor ? keyExtractor(row, index) : index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
