import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type EntityTableProps<T> = {
  columns: Column<T>[];
  emptyLabel: string;
  rows: T[];
  loading?: boolean;
  density?: 'comfortable' | 'compact';
  skeletonRows?: number;
  getRowKey?: (row: T, index: number) => string;
};

function TableSkeleton({ columns, rows, density }: { columns: number; rows: number; density: 'comfortable' | 'compact' }) {
  const padding = density === 'compact' ? 'px-4 py-2.5' : 'px-4 py-3.5';

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-200">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.22em] text-slate-500">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-4 py-3 font-semibold">
                <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-[#09101d]/60">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="align-top">
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <td key={columnIndex} className={`${padding} text-slate-300`}>
                  <div className="h-4 animate-pulse rounded bg-white/10" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EntityTable<T>({ columns, emptyLabel, rows, loading = false, density = 'comfortable', skeletonRows = 5, getRowKey }: EntityTableProps<T>) {
  if (loading) {
    return <TableSkeleton columns={columns.length} rows={skeletonRows} density={density} />;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  const cellPadding = density === 'compact' ? 'px-4 py-2.5' : 'px-4 py-3.5';

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-200">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.22em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-[#09101d]/60">
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row, index) : index} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className={`${cellPadding} ${column.className ?? ''} text-slate-300`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
