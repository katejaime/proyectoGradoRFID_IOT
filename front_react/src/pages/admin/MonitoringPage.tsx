import { useEffect, useState } from 'react'
import { ApiError, getTurnosHoyAdmin, type TurnoAdmin } from '../../lib/api'

const INTERVALO_MS = 15000

function formatoTiempo(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return `${horas}h ${resto}min`
}

export default function MonitoringPage() {
  const [turnos, setTurnos] = useState<TurnoAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualizando, setActualizando] = useState(false)

  async function load(silencioso = false) {
    if (silencioso) setActualizando(true)
    setError(null)
    try {
      const data = await getTurnosHoyAdmin()
      setTurnos(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el monitoreo')
    } finally {
      setLoading(false)
      setActualizando(false)
    }
  }

  useEffect(() => {
    load()
    const intervalo = setInterval(() => load(true), INTERVALO_MS)
    return () => clearInterval(intervalo)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Monitoreo en vivo</h1>
          <p className="text-sm text-slate-500">
            Dónde va cada bus activo hoy, según la última parada confirmada por el conductor.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity ${
            actualizando ? 'bg-indigo-50 text-indigo-600 opacity-100' : 'bg-emerald-50 text-emerald-700 opacity-100'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${actualizando ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}
          />
          {actualizando ? 'Actualizando...' : 'En vivo · cada 15s'}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {loading && <p className="text-center text-sm text-slate-400">Cargando...</p>}

      {!loading && turnos.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
          No hay buses con asignación para hoy.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {turnos.map((turno) => (
          <div
            key={turno.idAsignacion}
            className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/60"
          >
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-500" />
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                      <rect x="3.5" y="5" width="17" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M3.5 10.5h17M7 16v2M17 16v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <circle cx="7.2" cy="18.3" r="1.1" fill="currentColor" />
                      <circle cx="16.8" cy="18.3" r="1.1" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {turno.ruta.nombre}
                    </p>
                    <p className="text-lg font-semibold text-slate-900">{turno.busPlaca}</p>
                    <p className="text-xs text-slate-500">{turno.conductorNombre}</p>
                  </div>
                </div>

                {turno.alertasPendientes > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    {turno.alertasPendientes} alerta{turno.alertasPendientes === 1 ? '' : 's'} pendiente
                    {turno.alertasPendientes === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {/* Stepper horizontal de la ruta */}
              <div className="mt-5 flex items-start">
                {turno.ruta.paradas.map((parada, index) => (
                  <div
                    key={`${parada.idParada}-${index}`}
                    className={`flex items-center ${index < turno.ruta.paradas.length - 1 ? 'flex-1' : ''}`}
                  >
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                      <div
                        className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full ${
                          turno.paradaActualOrden !== null && parada.orden < turno.paradaActualOrden
                            ? 'bg-indigo-600'
                            : parada.orden === turno.paradaActualOrden
                              ? 'ring-4 ring-indigo-100 bg-indigo-600'
                              : 'bg-slate-200'
                        }`}
                      />
                      <span
                        className={`max-w-16 text-center text-[11px] leading-tight ${
                          parada.orden === turno.paradaActualOrden
                            ? 'font-semibold text-indigo-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {parada.nombre}
                      </span>
                    </div>
                    {index < turno.ruta.paradas.length - 1 && (
                      <div
                        className={`mx-1 h-0.5 flex-1 ${
                          turno.paradaActualOrden !== null && parada.orden < turno.paradaActualOrden
                            ? 'bg-indigo-600'
                            : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Próxima parada</p>
                  <p className="text-sm font-semibold text-slate-900">{turno.proximaParada ?? '—'}</p>
                </div>
                {turno.minutosEnTramoActual !== null && (
                  <div className="text-right">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">En este tramo</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatoTiempo(turno.minutosEnTramoActual)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
