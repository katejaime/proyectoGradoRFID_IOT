import { useEffect, useState } from 'react'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import {
  type Alerta,
  ApiError,
  descargarReporteExcel,
  descargarReportePdf,
  getAlertasAdmin,
} from '../../lib/api'

const LIMIT = 10

type FiltroAtendida = 'todas' | 'pendientes' | 'atendidas'

export default function ReportsPage() {
  const [items, setItems] = useState<Alerta[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtroAtendida, setFiltroAtendida] = useState<FiltroAtendida>('todas')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())
  const [descargando, setDescargando] = useState<'excel' | 'pdf' | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const atendida = filtroAtendida === 'todas' ? undefined : filtroAtendida === 'atendidas'
      const page = await getAlertasAdmin({
        atendida,
        desde: desde || undefined,
        hasta: hasta || undefined,
        skip,
        limit: LIMIT,
      })
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las alertas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [skip, filtroAtendida, desde, hasta])

  function handleFiltroChange(value: FiltroAtendida) {
    setFiltroAtendida(value)
    setSkip(0)
  }

  function toggleUna(id: number) {
    setSeleccionadas((prev) => {
      const nuevas = new Set(prev)
      if (nuevas.has(id)) {
        nuevas.delete(id)
      } else {
        nuevas.add(id)
      }
      return nuevas
    })
  }

  const todasVisiblesSeleccionadas = items.length > 0 && items.every((a) => seleccionadas.has(a.idAlerta))

  function toggleTodasVisibles() {
    setSeleccionadas((prev) => {
      const nuevas = new Set(prev)
      if (todasVisiblesSeleccionadas) {
        items.forEach((a) => nuevas.delete(a.idAlerta))
      } else {
        items.forEach((a) => nuevas.add(a.idAlerta))
      }
      return nuevas
    })
  }

  function limpiarSeleccion() {
    setSeleccionadas(new Set())
  }

  async function handleDescargar(formato: 'excel' | 'pdf') {
    setDescargando(formato)
    setError(null)
    const params =
      seleccionadas.size > 0
        ? { ids: Array.from(seleccionadas) }
        : {
            atendida: filtroAtendida === 'todas' ? undefined : filtroAtendida === 'atendidas',
            desde: desde || undefined,
            hasta: hasta || undefined,
          }
    try {
      if (formato === 'excel') {
        await descargarReporteExcel(params)
      } else {
        await descargarReportePdf(params)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo generar el reporte')
    } finally {
      setDescargando(null)
    }
  }

  function formatoEspera(segundos: number | null): string {
    if (segundos === null) return '—'
    const minutos = Math.floor(segundos / 60)
    const seg = segundos % 60
    return `${minutos}m ${seg}s`
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500">
          Marca las alertas que quieras incluir en el reporte, o descarga todas las que cumplen el filtro.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500">Estado</label>
          <select
            value={filtroAtendida}
            onChange={(event) => handleFiltroChange(event.target.value as FiltroAtendida)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="todas">Todas</option>
            <option value="pendientes">Sin atender</option>
            <option value="atendidas">Atendidas</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(event) => {
              setDesde(event.target.value)
              setSkip(0)
            }}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(event) => {
              setHasta(event.target.value)
              setSkip(0)
            }}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
        <p className="text-sm text-indigo-800">
          {seleccionadas.size > 0 ? (
            <>
              <span className="font-semibold">{seleccionadas.size}</span> alerta
              {seleccionadas.size === 1 ? '' : 's'} seleccionada{seleccionadas.size === 1 ? '' : 's'} —
              el reporte incluirá solo estas.{' '}
              <button type="button" onClick={limpiarSeleccion} className="underline hover:no-underline">
                Quitar selección
              </button>
            </>
          ) : (
            'No hay ninguna seleccionada — el reporte incluirá todas las que cumplen el filtro de arriba.'
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleDescargar('excel')}
            disabled={descargando !== null}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {descargando === 'excel' ? 'Generando...' : 'Descargar Excel'}
          </button>
          <button
            type="button"
            onClick={() => handleDescargar('pdf')}
            disabled={descargando !== null}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {descargando === 'pdf' ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      <DataTable<Alerta>
        columns={[
          {
            header: (
              <input
                type="checkbox"
                checked={todasVisiblesSeleccionadas}
                onChange={toggleTodasVisibles}
                aria-label="Seleccionar todas las de esta página"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
              />
            ),
            cell: (row) => (
              <input
                type="checkbox"
                checked={seleccionadas.has(row.idAlerta)}
                onChange={() => toggleUna(row.idAlerta)}
                aria-label={`Seleccionar alerta ${row.idAlerta}`}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
              />
            ),
          },
          { header: 'Fecha', cell: (row) => new Date(row.fechaHora).toLocaleString() },
          { header: 'Pasajero', cell: (row) => row.pasajeroNombre ?? '—' },
          { header: 'Discapacidad', cell: (row) => row.pasajeroTipoDiscapacidad ?? '—' },
          { header: 'Parada', cell: (row) => row.paradaNombre ?? '—' },
          { header: 'Bus', cell: (row) => row.busPlaca ?? '—' },
          { header: 'Conductor', cell: (row) => row.conductorNombre ?? '—' },
          { header: 'Tiempo de espera', cell: (row) => formatoEspera(row.tiempoEsperaSegundos) },
          {
            header: 'Estado',
            cell: (row) => (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  row.atendida ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {row.atendida ? 'Atendida' : 'Sin atender'}
              </span>
            ),
          },
        ]}
        rows={items}
        rowKey={(row) => row.idAlerta}
        loading={loading}
        emptyMessage="No hay alertas en el rango seleccionado"
      />

      <Pagination skip={skip} limit={LIMIT} total={total} onSkipChange={setSkip} />
    </div>
  )
}
