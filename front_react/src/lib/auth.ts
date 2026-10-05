import type { UserRole } from './api'

const TOKEN_KEY = 'access_token'
const ROLE_KEY = 'user_role'
const NAME_KEY = 'user_nombre'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRole(): UserRole | null {
  return localStorage.getItem(ROLE_KEY) as UserRole | null
}

export function getNombre(): string | null {
  return localStorage.getItem(NAME_KEY)
}

export function setSession(token: string, rol: UserRole, nombre: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY, rol)
  localStorage.setItem(NAME_KEY, nombre)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(NAME_KEY)
}

export function roleHome(rol: UserRole): string {
  return rol === 'administrador' ? '/admin' : '/conductor'
}
