import { type FormEvent, useEffect, useState } from 'react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import {
  ApiError,
  type Asignacion,
  type AsignacionCreate,
  type Bus,
  busesApi,
  type Ruta,
  routesApi,
  schedulesApi,
  type UserProfile,
  usersApi,
} from '../../lib/api'

const LIMIT = 10

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const emptyForm: AsignacionCreate = { fecha: hoyISO(), idBus: 0, idRuta: 0, idConductor: 0 }

export default function SchedulesPage() {
  const [items, setItems] = useState<Asignacion[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [buses, setBuses] = useState<Bus[]>([])
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [conductores, setConductores] = useState<UserProfile[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Asignacion | null>(null)
  const [form, setForm] = useState<AsignacionCreate>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Asignacion | null>(null)
  const [deleting, setDeleting] = useState(false)

  function busPlaca(id: number): string {
    return buses.find((b) => b.idBus === id)?.placa ?? `#${id}`
  }
  function rutaNombre(id: number): string {
    return rutas.find((r) => r.idRuta === id)?.nombre ?? `#${id}`
  }
  function conductorNombre(id: number): string {
    return conductores.find((c) => c.id === id)?.nombre ?? `#${id}`
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [page, busesPage, rutasPage, usersPage] = await Promise.all([
        schedulesApi.list(skip, LIMIT),
        busesApi.list(0, 100),
        routesApi.list(0, 100),
        usersApi.list(0, 100),
      ])
      setItems(page.items)
      setTotal(page.total)
      setBuses(busesPage.items)
      setRutas(rutasPage.items)
      setConductores(usersPage.items.filter((u) => u.rol === 'conductor'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las asignaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [skip])

  const listosParaCrear = buses.length > 0 && rutas.length > 0 && conductores.length > 0

  function openCreate() {
    setEditing(null)
    setForm({
      fecha: hoyISO(),
      idBus: buses[0]?.idBus ?? 0,
      idRuta: rutas[0]?.idRuta ?? 0,
      idConductor: conductores[0]?.id ?? 0,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(row: Asignacion) {
    setEditing(row)
    setForm({ fecha: row.fecha, idBus: row.idBus, idRuta: row.idRuta, idConductor: row.idConductor })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await schedulesApi.update(editing.idAsignacion, form)
      } else {
        await schedulesApi.create(form)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo guardar la asignación')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await schedulesApi.remove(deleteTarget.idAsignacion)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la asignación')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Asignación diaria</h1>
          <p className="text-sm text-slate-500">Qué bus, ruta y conductor operan cada día.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!listosParaCrear}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nueva asignación
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}
      {!loading && !listosParaCrear && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
          Necesitas al menos un bus, una ruta y un conductor para poder crear una asignación.
        </div>
      )}

      <DataTable<Asignacion>
        columns={[
          { header: 'Fecha', cell: (row) => row.fecha },
          { header: 'Bus', cell: (row) => busPlaca(row.idBus) },
          { header: 'Ruta', cell: (row) => rutaNombre(row.idRuta) },
          { header: 'Conductor', cell: (row) => conductorNombre(row.idConductor) },
        ]}
        rows={items}
        rowKey={(row) => row.idAsignacion}
        loading={loading}
        emptyMessage="No hay asignaciones registradas"
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Pagination skip={skip} limit={LIMIT} total={total} onSkipChange={setSkip} />

      <Modal
        open={modalOpen}
        title={editing ? 'Editar asignación' : 'Nueva asignación'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Fecha</label>
            <input
              type="date"
              required
              value={form.fecha}
              onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Bus</label>
            <select
              required
              value={form.idBus}
              onChange={(event) => setForm((prev) => ({ ...prev, idBus: Number(event.target.value) }))}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              {buses.map((bus) => (
                <option key={bus.idBus} value={bus.idBus}>
                  {bus.placa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Ruta</label>
            <select
              required
              value={form.idRuta}
              onChange={(event) => setForm((prev) => ({ ...prev, idRuta: Number(event.target.value) }))}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              {rutas.map((ruta) => (
                <option key={ruta.idRuta} value={ruta.idRuta}>
                  {ruta.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Conductor</label>
            <select
              required
              value={form.idConductor}
              onChange={(event) => setForm((prev) => ({ ...prev, idConductor: Number(event.target.value) }))}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              {conductores.map((conductor) => (
                <option key={conductor.id} value={conductor.id}>
                  {conductor.nombre}
                </option>
              ))}
            </select>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar asignación"
        message={`¿Eliminar la asignación del ${deleteTarget?.fecha}? Esta acción no se puede deshacer.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
