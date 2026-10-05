import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearToken, getNombre } from '../../lib/auth'

const NAV_ITEMS = [
  {
    to: '/admin/paradas',
    label: 'Paradas',
    icon: (
      <path
        d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    to: '/admin/buses',
    label: 'Buses',
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 10.5h17M7 16v2M17 16v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="7.2" cy="18.3" r="1.1" fill="currentColor" />
        <circle cx="16.8" cy="18.3" r="1.1" fill="currentColor" />
      </>
    ),
  },
  {
    to: '/admin/rutas',
    label: 'Rutas',
    icon: (
      <path
        d="M5 19c3-6 3-10 0-14M19 19c-3-6-3-10 0-14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ),
  },
  {
    to: '/admin/asignaciones',
    label: 'Asignación diaria',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 9.5h16M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8.5 13.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    to: '/admin/usuarios',
    label: 'Usuarios',
    icon: (
      <>
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 20c.7-3.5 3-5.5 5.5-5.5s4.8 2 5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 5.5c1.4.4 2.5 1.7 2.5 3.2 0 1.5-1.1 2.8-2.5 3.2M18.5 14.8c1.8.6 3 2.3 3.5 4.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    to: '/admin/pasajeros',
    label: 'Pasajeros',
    icon: (
      <>
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 20c1-4 3.5-6 7-6s6 2 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    to: '/admin/llaveros',
    label: 'Llaveros RFID',
    icon: (
      <>
        <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11.2 11.2 20 20M16.5 16.5l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    to: '/admin/lectores',
    label: 'Lectores RFID',
    icon: (
      <>
        <path d="M5 8.5a10 10 0 0 1 14 0M7.5 11.7a6.3 6.3 0 0 1 9 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1.6" fill="currentColor" />
      </>
    ),
  },
  {
    to: '/admin/alertas',
    label: 'Alertas',
    icon: (
      <path
        d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4.5-1.8 5.8-1.8 5.8h14.6s-1.8-1.3-1.8-5.8A5.5 5.5 0 0 0 12 4ZM9.7 18.3a2.3 2.3 0 0 0 4.6 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    to: '/admin/monitoreo',
    label: 'Monitoreo',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    to: '/admin/estadisticas',
    label: 'Estadísticas',
    icon: (
      <path
        d="M5 20V10.5M11 20V4M17 20v-7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ),
  },
  {
    to: '/admin/reportes',
    label: 'Reportes',
    icon: (
      <>
        <path d="M6 3.5h9l3 3V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8.5 13v3M12 11v5M15.5 14.5v1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleLogout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  const brand = (
    <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg shadow-indigo-950/40">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden="true">
          <path d="M4 16V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="4" y="9" width="16" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="8" cy="19" r="1" fill="currentColor" />
          <circle cx="16" cy="19" r="1" fill="currentColor" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">Panel de administrador</p>
        <p className="text-xs text-indigo-300">Sistema de Transporte</p>
      </div>
    </div>
  )

  const navLinks = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-white/10 text-white shadow-inner'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-400 transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-200'}`}
                aria-hidden="true"
              >
                {item.icon}
              </svg>
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 lg:flex">
      <aside className="hidden w-64 flex-col bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 lg:flex">
        {brand}
        {navLinks}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pr-3">
              {brand}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-full p-1.5 text-slate-300 hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {navLinks}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-[11px] font-semibold text-white">
                {getNombre()?.charAt(0).toUpperCase() ?? '?'}
              </span>
              <span className="text-sm font-medium text-slate-700">{getNombre()}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
