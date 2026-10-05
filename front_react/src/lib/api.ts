import { clearToken, getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL

export function wsUrl(path: string): string {
  return `${API_URL.replace(/^http/, 'ws')}${path}`
}

export class ApiError extends Error {}

export type UserRole = 'administrador' | 'conductor'

export interface LoginPayload {
  correo: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface UserProfile {
  id: number
  nombre: string
  correo: string
  rol: UserRole
  estado: boolean
}

export interface Page<T> {
  total: number
  skip: number
  limit: number
  items: T[]
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null)
  return typeof body?.detail === 'string' ? body.detail : fallback
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudo iniciar sesión'))
  }

  return response.json() as Promise<TokenResponse>
}

export async function getMe(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudo obtener el perfil'))
  }

  return response.json() as Promise<UserProfile>
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (response.status === 401) {
    clearToken()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  return response
}

function crudApi<TRead, TCreate, TUpdate, TId extends string | number = number>(resource: string) {
  return {
    async list(skip = 0, limit = 20): Promise<Page<TRead>> {
      const response = await authFetch(`/${resource}/?skip=${skip}&limit=${limit}`)
      if (!response.ok) {
        throw new ApiError(await parseErrorMessage(response, 'No se pudo cargar la lista'))
      }
      return response.json() as Promise<Page<TRead>>
    },

    async create(payload: TCreate): Promise<TRead> {
      const response = await authFetch(`/${resource}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new ApiError(await parseErrorMessage(response, 'No se pudo crear el registro'))
      }
      return response.json() as Promise<TRead>
    },

    async update(id: TId, payload: TUpdate): Promise<TRead> {
      const response = await authFetch(`/${resource}/${encodeURIComponent(String(id))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new ApiError(await parseErrorMessage(response, 'No se pudo actualizar el registro'))
      }
      return response.json() as Promise<TRead>
    },

    async remove(id: TId): Promise<void> {
      const response = await authFetch(`/${resource}/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new ApiError(await parseErrorMessage(response, 'No se pudo eliminar el registro'))
      }
    },
  }
}

export type EstadoTexto = 'activo' | 'inactivo'

export interface Parada {
  idParada: number
  nombre: string
  estado: string
}
export interface ParadaCreate {
  nombre: string
  estado?: string
}
export interface ParadaUpdate {
  nombre?: string
  estado?: string
}
export const paradasApi = crudApi<Parada, ParadaCreate, ParadaUpdate>('busStations')

export interface Bus {
  idBus: number
  placa: string
  estado: string
}
export interface BusCreate {
  placa: string
  estado?: string
}
export interface BusUpdate {
  placa?: string
  estado?: string
}
export const busesApi = crudApi<Bus, BusCreate, BusUpdate>('buses')

export interface Pasajero {
  id_pasajero: number
  nombre: string
  tipo_discapacidad: string
  telefono: string
  estado: string
}
export interface PasajeroCreate {
  nombre: string
  tipo_discapacidad: string
  telefono: string
  estado?: string
}
export interface PasajeroUpdate {
  nombre?: string
  tipo_discapacidad?: string
  telefono?: string
  estado?: string
}
export const passengersApi = crudApi<Pasajero, PasajeroCreate, PasajeroUpdate>('passengers')

export interface LectorRfid {
  idLector: number
  nombre: string
  estado: string
  idParada: number
}
export interface LectorRfidCreate {
  nombre: string
  estado?: string
  idParada: number
}
export interface LectorRfidUpdate {
  nombre?: string
  estado?: string
  idParada?: number
}
export const readersApi = crudApi<LectorRfid, LectorRfidCreate, LectorRfidUpdate>('rfidReaders')

export interface LlaveroRfid {
  uidRfid: string
  estado: string
  fechaAsignacion: string | null
  id_pasajero: number
}
export interface LlaveroRfidCreate {
  uidRfid: string
  estado?: string
  fechaAsignacion?: string | null
  id_pasajero: number
}
export interface LlaveroRfidUpdate {
  estado?: string
  fechaAsignacion?: string | null
  id_pasajero?: number
}
export const keyringsApi = crudApi<LlaveroRfid, LlaveroRfidCreate, LlaveroRfidUpdate, string>(
  'keyringRfids',
)

export interface UsuarioCreate {
  nombre: string
  correo: string
  password: string
  rol: UserRole
}
export interface UsuarioUpdate {
  nombre?: string
  correo?: string
  password?: string
  rol?: UserRole
  estado?: boolean
}
export const usersApi = crudApi<UserProfile, UsuarioCreate, UsuarioUpdate>('users')

export interface RutaParadaItem {
  idParada: number
  nombre: string
  orden: number
}
export interface Ruta {
  idRuta: number
  nombre: string
  estado: string
  paradas: RutaParadaItem[]
}
export interface RutaCreate {
  nombre: string
  estado?: string
  paradaIds: number[]
}
export interface RutaUpdate {
  nombre?: string
  estado?: string
  paradaIds?: number[]
}
export const routesApi = crudApi<Ruta, RutaCreate, RutaUpdate>('routes')

export interface Asignacion {
  idAsignacion: number
  fecha: string
  idBus: number
  idRuta: number
  idConductor: number
}
export interface AsignacionCreate {
  fecha: string
  idBus: number
  idRuta: number
  idConductor: number
}
export interface AsignacionUpdate {
  fecha?: string
  idBus?: number
  idRuta?: number
  idConductor?: number
}
export const schedulesApi = crudApi<Asignacion, AsignacionCreate, AsignacionUpdate>('schedules')

export interface TurnoHoy {
  idAsignacion: number
  fecha: string
  busPlaca: string
  busEstado: string
  ruta: Ruta
  paradaActual: string | null
  paradaActualOrden: number | null
  proximaParada: string | null
  proximaParadaOrden: number | null
}

export async function getMiTurnoHoy(): Promise<TurnoHoy> {
  const response = await authFetch('/schedules/hoy')
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudo obtener el turno de hoy'))
  }
  return response.json() as Promise<TurnoHoy>
}

export async function confirmarCheckin(): Promise<TurnoHoy> {
  const response = await authFetch('/schedules/hoy/checkin', { method: 'POST' })
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudo confirmar la llegada a la parada'))
  }
  return response.json() as Promise<TurnoHoy>
}

export interface TurnoAdmin extends TurnoHoy {
  conductorNombre: string
  alertasPendientes: number
  minutosEnTramoActual: number | null
}

export async function getTurnosHoyAdmin(): Promise<TurnoAdmin[]> {
  const response = await authFetch('/schedules/hoy/todas')
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudo obtener el monitoreo de hoy'))
  }
  return response.json() as Promise<TurnoAdmin[]>
}

export interface Alerta {
  idAlerta: number
  fechaHora: string
  estado: string
  idDeteccion: number
  atendida: boolean
  fechaAtencion: string | null
  tiempoEsperaSegundos: number | null
  uidRfid: string | null
  pasajeroNombre: string | null
  pasajeroTipoDiscapacidad: string | null
  paradaNombre: string | null
  busPlaca: string | null
  conductorNombre: string | null
}

export async function getMisAlertas(params: {
  atendida?: boolean
  skip?: number
  limit?: number
}): Promise<Page<Alerta>> {
  const query = new URLSearchParams()
  if (params.atendida !== undefined) query.set('atendida', String(params.atendida))
  query.set('skip', String(params.skip ?? 0))
  query.set('limit', String(params.limit ?? 20))
  const response = await authFetch(`/alerts/mias?${query.toString()}`)
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudieron cargar las alertas'))
  }
  return response.json() as Promise<Page<Alerta>>
}

export async function atenderAlerta(idAlerta: number): Promise<Alerta> {
  const response = await authFetch(`/alerts/${idAlerta}/atender`, { method: 'PUT' })
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudo marcar la alerta como atendida'))
  }
  return response.json() as Promise<Alerta>
}

export async function getAlertasAdmin(params: {
  atendida?: boolean
  idBus?: number
  desde?: string
  hasta?: string
  skip?: number
  limit?: number
}): Promise<Page<Alerta>> {
  const query = new URLSearchParams()
  if (params.atendida !== undefined) query.set('atendida', String(params.atendida))
  if (params.idBus !== undefined) query.set('id_bus', String(params.idBus))
  if (params.desde) query.set('desde', params.desde)
  if (params.hasta) query.set('hasta', params.hasta)
  query.set('skip', String(params.skip ?? 0))
  query.set('limit', String(params.limit ?? 20))
  const response = await authFetch(`/alerts/?${query.toString()}`)
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudieron cargar las alertas'))
  }
  return response.json() as Promise<Page<Alerta>>
}

export interface AlertasEstadisticas {
  totalAlertas: number
  atendidas: number
  sinAtender: number
  porDia: { fecha: string; cantidad: number }[]
  tiempoEsperaPromedioPorParada: { parada: string; promedioEsperaSegundos: number; cantidad: number }[]
  busesConMasAlertas: { bus: string; cantidad: number }[]
}

export async function getEstadisticasAlertas(params: { desde?: string; hasta?: string }): Promise<AlertasEstadisticas> {
  const query = new URLSearchParams()
  if (params.desde) query.set('desde', params.desde)
  if (params.hasta) query.set('hasta', params.hasta)
  const response = await authFetch(`/alerts/estadisticas?${query.toString()}`)
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudieron cargar las estadísticas'))
  }
  return response.json() as Promise<AlertasEstadisticas>
}

interface FiltrosReporte {
  atendida?: boolean
  idBus?: number
  desde?: string
  hasta?: string
  ids?: number[]
}

function queryReporte(params: FiltrosReporte): string {
  const query = new URLSearchParams()
  if (params.ids && params.ids.length > 0) {
    params.ids.forEach((id) => query.append('ids', String(id)))
    return query.toString()
  }
  if (params.atendida !== undefined) query.set('atendida', String(params.atendida))
  if (params.idBus !== undefined) query.set('id_bus', String(params.idBus))
  if (params.desde) query.set('desde', params.desde)
  if (params.hasta) query.set('hasta', params.hasta)
  return query.toString()
}

async function descargarArchivo(path: string, nombreArchivo: string): Promise<void> {
  const response = await authFetch(path)
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response, 'No se pudo generar el reporte'))
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

export function descargarReporteExcel(params: FiltrosReporte): Promise<void> {
  return descargarArchivo(`/alerts/reporte/excel?${queryReporte(params)}`, 'reporte_alertas.xlsx')
}

export function descargarReportePdf(params: FiltrosReporte): Promise<void> {
  return descargarArchivo(`/alerts/reporte/pdf?${queryReporte(params)}`, 'reporte_alertas.pdf')
}
