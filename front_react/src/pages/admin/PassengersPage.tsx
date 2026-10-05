import { type FormEvent, useEffect, useState } from 'react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DataTable from '../../components/ui/DataTable'
import EstadoBadge from '../../components/ui/EstadoBadge'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { ApiError, type Pasajero, type PasajeroCreate, passengersApi } from '../../lib/api'

const LIMIT = 10
const emptyForm: PasajeroCreate = { nombre: '', tipo_discapacidad: '', telefono: '', estado: 'activo' }

export default function PassengersPage() {
  const [items, setItems] = useState<Pasajero[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Pasajero | null>(null)
  const [form, setForm] = useState<PasajeroCreate>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Pasajero | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const page = await passengersApi.list(skip, LIMIT)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los pasajeros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [skip])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(row: Pasajero) {
    setEditing(row)
    setForm({
      nombre: row.nombre,
      tipo_discapacidad: row.tipo_discapacidad,
      telefono: row.telefono,
      estado: row.estado,
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    const payload: PasajeroCreate = {
      ...form,
      tipo_discapacidad: form.tipo_discapacidad.trim(),
    }
    try {
      if (editing) {
        await passengersApi.update(editing.id_pasajero, payload)
      } else {
        await passengersApi.create(payload)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo guardar el pasajero')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await passengersApi.remove(deleteTarget.id_pasajero)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el pasajero')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Pasajeros</h1>
          <p className="text-sm text-slate-500">Pasajeros con discapacidad registrados en el sistema.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 hover:shadow-md"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nuevo pasajero
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}

      <DataTable<Pasajero>
        columns={[
          { header: 'Nombre', cell: (row) => row.nombre },
          { header: 'Tipo de discapacidad', cell: (row) => row.tipo_discapacidad },
          { header: 'Teléfono', cell: (row) => row.telefono },
          { header: 'Estado', cell: (row) => <EstadoBadge estado={row.estado} /> },
        ]}
        rows={items}
        rowKey={(row) => row.id_pasajero}
        loading={loading}
        emptyMessage="No hay pasajeros registrados"
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Pagination skip={skip} limit={LIMIT} total={total} onSkipChange={setSkip} />

      <Modal
        open={modalOpen}
        title={editing ? 'Editar pasajero' : 'Nuevo pasajero'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre</label>
            <input
              required
              value={form.nombre}
              onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Tipo de discapacidad</label>
            <input
              required
              maxLength={50}
              pattern=".*\S.*"
              title="Indica el tipo de discapacidad"
              value={form.tipo_discapacidad}
              onChange={(event) => setForm((prev) => ({ ...prev, tipo_discapacidad: event.target.value }))}
              placeholder="Ej.: Silla de ruedas"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              required
              value={form.telefono}
              onChange={(event) => setForm((prev) => ({ ...prev, telefono: event.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Estado</label>
            <select
              value={form.estado}
              onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
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
        title="Eliminar pasajero"
        message={`¿Eliminar a "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
