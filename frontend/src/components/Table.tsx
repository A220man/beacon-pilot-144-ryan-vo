import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyAccessor: (row: T) => string | number;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyAccessor,
  emptyMessage = "No data",
  className = "",
}: TableProps<T>) {
  return (
    <div className={`table-container ${className}`}>
      {data.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: "3rem" }}>📭</div>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={keyAccessor(row)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}