import { type FormEvent, useEffect, useState } from 'react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DataTable from '../../components/ui/DataTable'
import EstadoBadge from '../../components/ui/EstadoBadge'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import {
  ApiError,
  type LlaveroRfid,
  keyringsApi,
  type Pasajero,
  passengersApi,
} from '../../lib/api'

const LIMIT = 10

interface KeyringForm {
  uidRfid: string
  estado: string
  fechaAsignacion: string
  id_pasajero: number | ''
}

const emptyForm: KeyringForm = {
  uidRfid: '',
  estado: 'activo',
  fechaAsignacion: '',
  id_pasajero: '',
}

export default function KeyringsPage() {
  const [items, setItems] = useState<LlaveroRfid[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [pasajeros, setPasajeros] = useState<Pasajero[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LlaveroRfid | null>(null)
  const [form, setForm] = useState<KeyringForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<LlaveroRfid | null>(null)
  const [deleting, setDeleting] = useState(false)

  function pasajeroNombre(id: number): string {
    return pasajeros.find((p) => p.id_pasajero === id)?.nombre ?? `#${id}`
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [page, pasajerosPage] = await Promise.all([
        keyringsApi.list(skip, LIMIT),
        passengersApi.list(0, 100),
      ])
      setItems(page.items)
      setTotal(page.total)
      setPasajeros(pasajerosPage.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los llaveros')
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

  function openEdit(row: LlaveroRfid) {
    setEditing(row)
    setForm({
      uidRfid: row.uidRfid,
      estado: row.estado,
      fechaAsignacion: row.fechaAsignacion ?? '',
      id_pasajero: row.id_pasajero,
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // El select es required, pero se comprueba también aquí para que TypeScript sepa que hay pasajero.
    if (form.id_pasajero === '') {
      setFormError('Selecciona el pasajero al que pertenece el llavero')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await keyringsApi.update(editing.uidRfid, {
          estado: form.estado,
          fechaAsignacion: form.fechaAsignacion || null,
          id_pasajero: form.id_pasajero,
        })
      } else {
        await keyringsApi.create({
          uidRfid: form.uidRfid,
          estado: form.estado,
          fechaAsignacion: form.fechaAsignacion || null,
          id_pasajero: form.id_pasajero,
        })
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo guardar el llavero')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await keyringsApi.remove(deleteTarget.uidRfid)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el llavero')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Llaveros RFID</h1>
          <p className="text-sm text-slate-500">Llaveros RFID asignados a pasajeros.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 hover:shadow-md"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nuevo llavero
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}

      <DataTable<LlaveroRfid>
        columns={[
          { header: 'UID', cell: (row) => row.uidRfid },
          { header: 'Pasajero', cell: (row) => pasajeroNombre(row.id_pasajero) },
          { header: 'Fecha asignación', cell: (row) => row.fechaAsignacion ?? '—' },
          { header: 'Estado', cell: (row) => <EstadoBadge estado={row.estado} /> },
        ]}
        rows={items}
        rowKey={(row) => row.uidRfid}
        loading={loading}
        emptyMessage="No hay llaveros registrados"
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Pagination skip={skip} limit={LIMIT} total={total} onSkipChange={setSkip} />

      <Modal
        open={modalOpen}
        title={editing ? 'Editar llavero' : 'Nuevo llavero'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">UID del llavero</label>
            <input
              required
              disabled={Boolean(editing)}
              value={form.uidRfid}
              onChange={(event) => setForm((prev) => ({ ...prev, uidRfid: event.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Fecha de asignación</label>
            <input
              type="date"
              value={form.fechaAsignacion}
              onChange={(event) => setForm((prev) => ({ ...prev, fechaAsignacion: event.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Pasajero</label>
            <select
              required
              value={form.id_pasajero}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  id_pasajero: event.target.value ? Number(event.target.value) : '',
                }))
              }
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="" disabled>
                Selecciona un pasajero
              </option>
              {pasajeros.map((pasajero) => (
                <option key={pasajero.id_pasajero} value={pasajero.id_pasajero}>
                  {pasajero.nombre}
                </option>
              ))}
            </select>
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
        title="Eliminar llavero"
        message={`¿Eliminar el llavero "${deleteTarget?.uidRfid}"? Esta acción no se puede deshacer.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
