import React from 'react'

interface DataTableProps<T> {
  data: T[]
  columns: { key: keyof T; label: string }[]
  className?: string
}

export function DataTable<T>({ data, columns, className = '' }: DataTableProps<T>) {
  return (
    <div className={`overflow-x-auto border border-gray-200 rounded-xl ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-label-sm font-medium text-gray-600 border-b border-gray-100 bg-gray-50"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 text-body-sm text-gray-700">
                  {String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}