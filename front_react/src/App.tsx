import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import { getRole, getToken, roleHome } from './lib/auth'
import AdminLayout from './pages/admin/AdminLayout'
import AlertsPage from './pages/admin/AlertsPage'
import BusesPage from './pages/admin/BusesPage'
import KeyringsPage from './pages/admin/KeyringsPage'
import MonitoringPage from './pages/admin/MonitoringPage'
import ParadasPage from './pages/admin/ParadasPage'
import PassengersPage from './pages/admin/PassengersPage'
import ReadersPage from './pages/admin/ReadersPage'
import ReportsPage from './pages/admin/ReportsPage'
import RoutesPage from './pages/admin/RoutesPage'
import SchedulesPage from './pages/admin/SchedulesPage'
import StatsPage from './pages/admin/StatsPage'
import UsersPage from './pages/admin/UsersPage'
import ConductorDashboard from './pages/ConductorDashboard'
import Login from './pages/Login'

function Home() {
  const token = getToken()
  const role = getRole()
  if (!token || !role) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={roleHome(role)} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <RequireAuth role="administrador">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="paradas" replace />} />
          <Route path="paradas" element={<ParadasPage />} />
          <Route path="buses" element={<BusesPage />} />
          <Route path="rutas" element={<RoutesPage />} />
          <Route path="asignaciones" element={<SchedulesPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="pasajeros" element={<PassengersPage />} />
          <Route path="llaveros" element={<KeyringsPage />} />
          <Route path="lectores" element={<ReadersPage />} />
          <Route path="alertas" element={<AlertsPage />} />
          <Route path="monitoreo" element={<MonitoringPage />} />
          <Route path="estadisticas" element={<StatsPage />} />
          <Route path="reportes" element={<ReportsPage />} />
        </Route>
        <Route
          path="/conductor"
          element={
            <RequireAuth role="conductor">
              <ConductorDashboard />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
