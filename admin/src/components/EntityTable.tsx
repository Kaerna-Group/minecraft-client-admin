import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type EntityTableProps<T> = {
  columns: Column<T>[];
  emptyLabel: string;
  rows: T[];
};

export function EntityTable<T>({ columns, emptyLabel, rows }: EntityTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

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
            <tr key={index} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-slate-300">
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
