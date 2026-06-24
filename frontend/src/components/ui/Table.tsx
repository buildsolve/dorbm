import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyText?: string;
}

export default function Table<T extends { id: string }>({ columns, data, onRowClick, loading, emptyText = 'No records found' }: Props<T>) {
  if (loading) return (
    <div className="flex items-center justify-center py-16 text-[#6A6A6A] text-sm gap-3">
      <div className="animate-spin w-5 h-5 border-2 border-[#FF385C] border-t-transparent rounded-full" />
      Loading data…
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid #EBEBEB' }}>
            {columns.map(col => (
              <th key={col.key} className="table-header" style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-14 text-[#6A6A6A] text-sm">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
                style={{ borderBottom: '1px solid #F2F2F2', transition: 'background 0.12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F7F7F7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
              >
                {columns.map(col => (
                  <td key={col.key} className="table-cell">
                    {col.render ? col.render(row) : (row as any)[col.key]}
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
