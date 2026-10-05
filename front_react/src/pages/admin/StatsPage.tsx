import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { type AlertasEstadisticas, ApiError, getEstadisticasAlertas } from '../../lib/api'

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function haceDiasISO(dias: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

export default function StatsPage() {
  const [desde, setDesde] = useState(haceDiasISO(30))
  const [hasta, setHasta] = useState(hoyISO())
  const [datos, setDatos] = useState<AlertasEstadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const resultado = await getEstadisticasAlertas({ desde: desde || undefined, hasta: hasta || undefined })
      setDatos(resultado)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las estadísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta])

  function formatoEspera(segundos: number): string {
    const minutos = Math.floor(segundos / 60)
    const seg = Math.round(segundos % 60)
    return `${minutos}m ${seg}s`
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Estadísticas</h1>
        <p className="text-sm text-slate-500">Análisis histórico de alertas para tomar decisiones.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {loading && <p className="text-center text-sm text-slate-400">Cargando...</p>}

      {!loading && datos && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/60">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total de alertas</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{datos.totalAlertas}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/60">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Atendidas</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-600">{datos.atendidas}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/60">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sin atender</p>
              <p className="mt-1 text-3xl font-semibold text-red-600">{datos.sinAtender}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/60">
            <h2 className="text-sm font-semibold text-slate-900">Alertas por día</h2>
            {datos.porDia.length === 0 ? (
              <p className="mt-4 text-center text-sm text-slate-400">Sin datos en este rango.</p>
            ) : (
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datos.porDia} barCategoryGap="30%" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
                    <Bar dataKey="cantidad" name="Alertas" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/60">
            <h2 className="text-sm font-semibold text-slate-900">Tiempo promedio de espera por parada</h2>
            {datos.tiempoEsperaPromedioPorParada.length === 0 ? (
              <p className="mt-4 text-center text-sm text-slate-400">Sin alertas atendidas en este rango.</p>
            ) : (
              <div className="mt-4 w-full" style={{ height: Math.max(160, datos.tiempoEsperaPromedioPorParada.length * 56) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={datos.tiempoEsperaPromedioPorParada}
                    layout="vertical"
                    barCategoryGap="35%"
                    margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number) => formatoEspera(value)}
                    />
                    <YAxis
                      type="category"
                      dataKey="parada"
                      width={150}
                      tick={{ fontSize: 12, fill: '#334155' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 13, borderRadius: 8 }} formatter={(value) => formatoEspera(Number(value ?? 0))} />
                    <Bar dataKey="promedioEsperaSegundos" name="Espera promedio" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/60">
            <h2 className="text-sm font-semibold text-slate-900">Buses con más alertas</h2>
            {datos.busesConMasAlertas.length === 0 ? (
              <p className="mt-4 text-center text-sm text-slate-400">Sin datos en este rango.</p>
            ) : (
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datos.busesConMasAlertas} barCategoryGap="30%" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="bus" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
                    <Bar dataKey="cantidad" name="Alertas" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
