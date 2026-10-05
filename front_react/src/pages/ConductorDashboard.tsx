import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EstadoBadge from '../components/ui/EstadoBadge'
import {
  type Alerta,
  ApiError,
  atenderAlerta,
  confirmarCheckin,
  getMisAlertas,
  getMiTurnoHoy,
  type TurnoHoy,
  wsUrl,
} from '../lib/api'
import { clearToken, getNombre, getToken } from '../lib/auth'

export default function ConductorDashboard() {
  const navigate = useNavigate()

  const [turno, setTurno] = useState<TurnoHoy | null>(null)
  const [turnoError, setTurnoError] = useState<string | null>(null)
  const [pendientes, setPendientes] = useState<Alerta[]>([])
  const [historial, setHistorial] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [atendiendoId, setAtendiendoId] = useState<number | null>(null)
  const [confirmandoLlegada, setConfirmandoLlegada] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enVivo, setEnVivo] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())
  const loadRef = useRef<() => void>(() => {})

  // Recalcula cada segundo para que el color de las alertas pendientes
  // vaya escalando (verde -> amarillo -> rojo) sin necesidad de recargar.
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  function urgenciaAlerta(fechaHora: string): 'verde' | 'amarillo' | 'rojo' {
    const segundos = (ahora - new Date(fechaHora).getTime()) / 1000
    if (segundos >= 60) return 'rojo'
    if (segundos >= 30) return 'amarillo'
    return 'verde'
  }

  const ESTILOS_URGENCIA = {
    verde: {
      card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-emerald-100/60 ring-emerald-100/50',
      iconBg: 'bg-emerald-100 text-emerald-700',
      subtitulo: 'text-emerald-700',
    },
    amarillo: {
      card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-amber-100/60 ring-amber-100/50',
      iconBg: 'bg-amber-100 text-amber-700',
      subtitulo: 'text-amber-700',
    },
    rojo: {
      card: 'border-red-200 bg-gradient-to-br from-red-50 to-white shadow-red-100/60 ring-red-100/50 animate-pulse',
      iconBg: 'bg-red-100 text-red-700',
      subtitulo: 'text-red-700',
    },
  } as const

  function handleLogout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  async function load() {
    setLoading(true)
    setError(null)
    setTurnoError(null)
    try {
      const turnoHoy = await getMiTurnoHoy()
      setTurno(turnoHoy)
    } catch (err) {
      setTurno(null)
      setTurnoError(err instanceof ApiError ? err.message : 'No se pudo cargar tu turno de hoy')
    }
    try {
      const [pendientesPage, historialPage] = await Promise.all([
        getMisAlertas({ atendida: false, limit: 50 }),
        getMisAlertas({ limit: 50 }),
      ])
      setPendientes(pendientesPage.items)
      setHistorial(historialPage.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las alertas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) return

    let socket: WebSocket | null = null
    let reintentoId: ReturnType<typeof setTimeout> | null = null
    let ultimoMensaje = Date.now()
    let cerradoPorLimpieza = false

    function conectar() {
      socket = new WebSocket(`${wsUrl('/ws/alertas')}?token=${encodeURIComponent(token as string)}`)

      socket.onopen = () => {
        setEnVivo(true)
        ultimoMensaje = Date.now()
      }

      socket.onmessage = () => {
        ultimoMensaje = Date.now()
        loadRef.current()
      }

      socket.onclose = () => {
        setEnVivo(false)
        if (!cerradoPorLimpieza) {
          reintentoId = setTimeout(conectar, 3000)
        }
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    conectar()


    const pingId = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send('ping')
      }
    }, 20000)

    const watchdogId = setInterval(() => {
      if (Date.now() - ultimoMensaje > 45000) {
        socket?.close()
      }
    }, 5000)

    return () => {
      cerradoPorLimpieza = true
      if (reintentoId) clearTimeout(reintentoId)
      clearInterval(pingId)
      clearInterval(watchdogId)
      socket?.close()
    }
  }, [])

  function formatoDuracion(segundos: number): string {
    const minutos = Math.floor(segundos / 60)
    const seg = segundos % 60
    return `${minutos}m ${seg}s`
  }

  async function handleCheckin() {
    setConfirmandoLlegada(true)
    setError(null)
    try {
      const turnoActualizado = await confirmarCheckin()
      setTurno(turnoActualizado)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo confirmar la llegada a la parada')
    } finally {
      setConfirmandoLlegada(false)
    }
  }

  async function handleAtender(idAlerta: number) {
    setAtendiendoId(idAlerta)
    try {
      await atenderAlerta(idAlerta)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo marcar la alerta como atendida')
    } finally {
      setAtendiendoId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40">
      <header className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 px-4 py-4 shadow-lg lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg shadow-indigo-950/40">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden="true">
                <path d="M4 16V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <rect x="4" y="9" width="16" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="8" cy="19" r="1" fill="currentColor" />
                <circle cx="16" cy="19" r="1" fill="currentColor" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">Panel de conductor</p>
              <span
                className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                  enVivo ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/10 text-slate-300'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${enVivo ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                {enVivo ? 'En vivo' : 'Conectando...'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[11px] font-semibold text-white">
                {getNombre()?.charAt(0).toUpperCase() ?? '?'}
              </span>
              <span className="text-sm font-medium text-slate-200">{getNombre()}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-300"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 lg:px-8">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
        )}

        {loading && !turno && !turnoError && (
          <p className="text-center text-sm text-slate-400">Cargando tu turno...</p>
        )}

        {turnoError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-800">
            {turnoError}. Pídele al administrador que te asigne un bus y una ruta para hoy.
          </div>
        )}

        {turno && (
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/60">
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
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Bus asignado</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {turno.busPlaca} · {turno.ruta.nombre}
                  </p>
                </div>
              </div>
              <EstadoBadge estado={turno.busEstado} />
            </div>

            {/* Línea de tiempo vertical: solo en móvil */}
            <ol className="mt-5 sm:hidden">
              {turno.ruta.paradas.map((parada, index) => (
                <li key={`${parada.idParada}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < turno.ruta.paradas.length - 1 && (
                    <span
                      className={`absolute left-[5px] top-3 h-full w-0.5 ${
                        turno.paradaActualOrden !== null && parada.orden < turno.paradaActualOrden
                          ? 'bg-indigo-600'
                          : 'bg-slate-200'
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full ${
                      turno.paradaActualOrden !== null && parada.orden < turno.paradaActualOrden
                        ? 'bg-indigo-600'
                        : parada.orden === turno.paradaActualOrden
                          ? 'bg-indigo-600 ring-4 ring-indigo-100'
                          : 'bg-slate-200'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      parada.orden === turno.paradaActualOrden ? 'font-semibold text-indigo-700' : 'text-slate-500'
                    }`}
                  >
                    {parada.nombre}
                  </span>
                </li>
              ))}
            </ol>

            {/* Stepper horizontal: desde sm hacia arriba */}
            <div className="mt-5 hidden overflow-x-auto sm:block">
              <div className="flex min-w-max items-center">
                {turno.ruta.paradas.map((parada, index) => (
                  <div key={`${parada.idParada}-${index}`} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`flex h-3 w-3 items-center justify-center rounded-full ${
                          turno.paradaActualOrden !== null && parada.orden < turno.paradaActualOrden
                            ? 'bg-indigo-600'
                            : parada.orden === turno.paradaActualOrden
                              ? 'ring-4 ring-indigo-100 bg-indigo-600'
                              : 'bg-slate-200'
                        }`}
                      />
                      <span
                        className={`w-20 text-center text-xs ${
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
                        className={`h-0.5 w-10 ${
                          turno.paradaActualOrden !== null && parada.orden < turno.paradaActualOrden
                            ? 'bg-indigo-600'
                            : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        )}

        {turno && (
          <div className="grid grid-cols-2 gap-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/60">
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-100/60" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Alertas pendientes</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">{pendientes.length}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4.5-1.8 5.8-1.8 5.8h14.6s-1.8-1.3-1.8-5.8A5.5 5.5 0 0 0 12 4ZM9.7 18.3a2.3 2.3 0 0 0 4.6 0"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/60">
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-indigo-100/60" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Próxima parada</p>
                  <p className="mt-1 truncate text-xl font-semibold text-slate-900" title={turno.proximaParada ?? '—'}>
                    {turno.proximaParada ?? '—'}
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {turno && turno.proximaParadaOrden !== null && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCheckin}
              disabled={confirmandoLlegada}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmandoLlegada ? 'Confirmando...' : `Confirmar llegada a ${turno.proximaParada}`}
            </button>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Alertas pendientes</h2>
          {pendientes.length === 0 && !loading && (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
              No hay alertas pendientes.
            </p>
          )}
          {pendientes.map((alerta) => {
            const urgencia = urgenciaAlerta(alerta.fechaHora)
            const estilo = ESTILOS_URGENCIA[urgencia]
            const segundos = Math.max(0, Math.floor((ahora - new Date(alerta.fechaHora).getTime()) / 1000))
            return (
              <div
                key={alerta.idAlerta}
                className={`flex flex-col gap-3 rounded-xl border p-4 shadow-md ring-1 transition-colors duration-700 sm:flex-row sm:items-center sm:justify-between ${estilo.card}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-700 ${estilo.iconBg}`}>
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path
                        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{alerta.pasajeroNombre ?? 'Pasajero sin identificar'}</p>
                    {alerta.pasajeroTipoDiscapacidad && (
                      <p className={`text-xs ${estilo.subtitulo}`}>{alerta.pasajeroTipoDiscapacidad}</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {alerta.paradaNombre ?? 'Parada desconocida'} ·{' '}
                      {new Date(alerta.fechaHora).toLocaleTimeString()} · hace {segundos}s
                    </p>
                    <p className={`mt-1.5 text-xs font-medium ${estilo.subtitulo}`}>
                      Debes esperar y ayudar al pasajero a subir o bajar si lo necesita.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAtender(alerta.idAlerta)}
                  disabled={atendiendoId === alerta.idAlerta}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {atendiendoId === alerta.idAlerta ? 'Guardando...' : 'Marcar como atendida'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Historial de alertas</h2>
          {historial.length === 0 && !loading && (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
              Todavía no hay alertas registradas.
            </p>
          )}
          {historial.map((alerta) => (
            <div
              key={alerta.idAlerta}
              className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{alerta.pasajeroNombre ?? 'Pasajero sin identificar'}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {alerta.paradaNombre ?? 'Parada desconocida'} · {new Date(alerta.fechaHora).toLocaleString()}
                  {alerta.atendida && alerta.tiempoEsperaSegundos !== null && (
                    <> · espera: {formatoDuracion(alerta.tiempoEsperaSegundos)}</>
                  )}
                </p>
              </div>
              <span
                className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  alerta.atendida ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {alerta.atendida ? 'Atendida' : 'Sin atender'}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
