import { useEffect, useState } from 'react'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import { type Alerta, ApiError, getAlertasAdmin } from '../../lib/api'

const LIMIT = 10

type FiltroAtendida = 'todas' | 'pendientes' | 'atendidas'

export default function AlertsPage() {
  const [items, setItems] = useState<Alerta[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtroAtendida, setFiltroAtendida] = useState<FiltroAtendida>('todas')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [ignoradasEnRango, setIgnoradasEnRango] = useState<number | null>(null)

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

      const ignoradas = await getAlertasAdmin({
        atendida: false,
        desde: desde || undefined,
        hasta: hasta || undefined,
        skip: 0,
        limit: 1,
      })
      setIgnoradasEnRango(ignoradas.total)
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Historial de alertas</h1>
        <p className="text-sm text-slate-500">
          Alertas generadas por el sistema RFID y si el conductor las atendió.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {ignoradasEnRango !== null && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">{ignoradasEnRango}</span> alerta
          {ignoradasEnRango === 1 ? '' : 's'} sin atender por el conductor en el rango seleccionado.
        </div>
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

      <DataTable<Alerta>
        columns={[
          { header: 'Fecha', cell: (row) => new Date(row.fechaHora).toLocaleString() },
          { header: 'Pasajero', cell: (row) => row.pasajeroNombre ?? '—' },
          { header: 'Discapacidad', cell: (row) => row.pasajeroTipoDiscapacidad ?? '—' },
          { header: 'Parada', cell: (row) => row.paradaNombre ?? '—' },
          { header: 'Bus', cell: (row) => row.busPlaca ?? '—' },
          { header: 'Conductor', cell: (row) => row.conductorNombre ?? '—' },
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
