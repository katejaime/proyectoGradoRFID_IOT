import { type FormEvent, useEffect, useState } from 'react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DataTable from '../../components/ui/DataTable'
import EstadoBadge from '../../components/ui/EstadoBadge'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import {
  ApiError,
  type LectorRfid,
  type Parada,
  paradasApi,
  readersApi,
} from '../../lib/api'

const LIMIT = 10

interface ReaderForm {
  nombre: string
  estado: string
  idParada: number | ''
}

const emptyForm: ReaderForm = { nombre: '', estado: 'activo', idParada: '' }

export default function ReadersPage() {
  const [items, setItems] = useState<LectorRfid[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [paradas, setParadas] = useState<Parada[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LectorRfid | null>(null)
  const [form, setForm] = useState<ReaderForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<LectorRfid | null>(null)
  const [deleting, setDeleting] = useState(false)

  function paradaNombre(idParada: number): string {
    return paradas.find((p) => p.idParada === idParada)?.nombre ?? `#${idParada}`
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [page, paradasPage] = await Promise.all([
        readersApi.list(skip, LIMIT),
        paradasApi.list(0, 100),
      ])
      setItems(page.items)
      setTotal(page.total)
      setParadas(paradasPage.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los lectores')
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

  function openEdit(row: LectorRfid) {
    setEditing(row)
    setForm({ nombre: row.nombre, estado: row.estado, idParada: row.idParada })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (form.idParada === '') {
      setFormError('Selecciona una parada')
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = { nombre: form.nombre, estado: form.estado, idParada: form.idParada }
    try {
      if (editing) {
        await readersApi.update(editing.idLector, payload)
      } else {
        await readersApi.create(payload)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo guardar el lector')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await readersApi.remove(deleteTarget.idLector)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el lector')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Lectores RFID</h1>
          <p className="text-sm text-slate-500">Lectores instalados en cada parada.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={paradas.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nuevo lector
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}
      {!loading && paradas.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
          Crea primero una parada para poder registrar lectores.
        </div>
      )}

      <DataTable<LectorRfid>
        columns={[
          { header: 'Nombre', cell: (row) => row.nombre },
          { header: 'Parada', cell: (row) => paradaNombre(row.idParada) },
          { header: 'Estado', cell: (row) => <EstadoBadge estado={row.estado} /> },
        ]}
        rows={items}
        rowKey={(row) => row.idLector}
        loading={loading}
        emptyMessage="No hay lectores registrados"
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Pagination skip={skip} limit={LIMIT} total={total} onSkipChange={setSkip} />

      <Modal open={modalOpen} title={editing ? 'Editar lector' : 'Nuevo lector'} onClose={() => setModalOpen(false)}>
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
            <label className="block text-sm font-medium text-slate-700">Parada</label>
            <select
              required
              value={form.idParada}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, idParada: event.target.value ? Number(event.target.value) : '' }))
              }
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Selecciona una parada</option>
              {paradas.map((parada) => (
                <option key={parada.idParada} value={parada.idParada}>
                  {parada.nombre}
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
        title="Eliminar lector"
        message={`¿Eliminar el lector "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
