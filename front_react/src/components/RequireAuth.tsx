import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import type { UserRole } from '../lib/api'
import { getRole, getToken, roleHome } from '../lib/auth'

export default function RequireAuth({
  role,
  children,
}: {
  role: UserRole
  children: ReactElement
}) {
  const token = getToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }

  const currentRole = getRole()
  if (currentRole !== role) {
    return <Navigate to={currentRole ? roleHome(currentRole) : '/login'} replace />
  }

  return children
}
