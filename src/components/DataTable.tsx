import React from 'react';
import { cn } from '../lib/utils';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export default function DataTable<T>({ columns, data, onRowClick }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((column, idx) => (
              <th 
                key={idx} 
                className={cn(
                  "px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item, rowIdx) => (
            <tr 
              key={rowIdx} 
              onClick={() => onRowClick?.(item)}
              className={cn(
                "hover:bg-slate-50 transition-colors",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((column, colIdx) => (
                <td 
                  key={colIdx} 
                  className={cn(
                    "px-6 py-4 text-sm text-slate-600",
                    column.className
                  )}
                >
                  {typeof column.accessor === 'function' 
                    ? column.accessor(item) 
                    : (item[column.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-slate-400 text-sm">No data available in this view.</p>
        </div>
      )}
    </div>
  );
}
