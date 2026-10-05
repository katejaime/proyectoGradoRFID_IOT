import type { ReactNode } from 'react'

export interface Column<T> {
  header: ReactNode
  cell: (row: T) => ReactNode
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage = 'Sin registros',
  onEdit,
  onDelete,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  loading?: boolean
  emptyMessage?: string
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
}) {
  const showActions = Boolean(onEdit || onDelete)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/50">
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {col.header}
              </th>
            ))}
            {showActions && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-4 py-10 text-center text-sm text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                  </svg>
                  Cargando...
                </span>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-4 py-10 text-center text-sm text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-indigo-50/40">
                {columns.map((col, index) => (
                  <td key={index} className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {col.cell(row)}
                  </td>
                ))}
                {showActions && (
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                        >
                          Editar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}
