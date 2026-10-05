export default function Pagination({
  skip,
  limit,
  total,
  onSkipChange,
}: {
  skip: number
  limit: number
  total: number
  onSkipChange: (skip: number) => void
}) {
  const page = Math.floor(skip / limit) + 1
  const pageCount = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-sm text-slate-500">
      <span>{total === 0 ? 'Sin resultados' : `Página ${page} de ${pageCount} · ${total} en total`}</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={skip === 0}
          onClick={() => onSkipChange(Math.max(0, skip - limit))}
          className="rounded-md border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={skip + limit >= total}
          onClick={() => onSkipChange(skip + limit)}
          className="rounded-md border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
