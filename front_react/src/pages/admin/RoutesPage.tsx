import { type FormEvent, useEffect, useState } from 'react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DataTable from '../../components/ui/DataTable'
import EstadoBadge from '../../components/ui/EstadoBadge'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { ApiError, type Parada, paradasApi, type Ruta, routesApi } from '../../lib/api'

const LIMIT = 10

interface StopItem {
  idParada: number
  nombre: string
}

interface RutaForm {
  nombre: string
  estado: string
  paradas: StopItem[]
}

const emptyForm: RutaForm = { nombre: '', estado: 'activo', paradas: [] }

export default function RoutesPage() {
  const [items, setItems] = useState<Ruta[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [paradas, setParadas] = useState<Parada[]>([])
  const [paradaAAgregar, setParadaAAgregar] = useState<number | ''>('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Ruta | null>(null)
  const [form, setForm] = useState<RutaForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Ruta | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [page, paradasPage] = await Promise.all([routesApi.list(skip, LIMIT), paradasApi.list(0, 100)])
      setItems(page.items)
      setTotal(page.total)
      setParadas(paradasPage.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las rutas')
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
    setParadaAAgregar('')
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(row: Ruta) {
    setEditing(row)
    setForm({
      nombre: row.nombre,
      estado: row.estado,
      paradas: row.paradas.map((p) => ({ idParada: p.idParada, nombre: p.nombre })),
    })
    setParadaAAgregar('')
    setFormError(null)
    setModalOpen(true)
  }

  function agregarParada() {
    if (paradaAAgregar === '') return
    const parada = paradas.find((p) => p.idParada === paradaAAgregar)
    if (!parada) return
    setForm((prev) => ({
      ...prev,
      paradas: [...prev.paradas, { idParada: parada.idParada, nombre: parada.nombre }],
    }))
    setParadaAAgregar('')
  }

  function quitarParada(index: number) {
    setForm((prev) => ({ ...prev, paradas: prev.paradas.filter((_, i) => i !== index) }))
  }

  function moverParada(index: number, direccion: -1 | 1) {
    setForm((prev) => {
      const nuevas = [...prev.paradas]
      const destino = index + direccion
      if (destino < 0 || destino >= nuevas.length) return prev
      ;[nuevas[index], nuevas[destino]] = [nuevas[destino], nuevas[index]]
      return { ...prev, paradas: nuevas }
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (form.paradas.length === 0) {
      setFormError('Agrega al menos una parada')
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = {
      nombre: form.nombre,
      estado: form.estado,
      paradaIds: form.paradas.map((p) => p.idParada),
    }
    try {
      if (editing) {
        await routesApi.update(editing.idRuta, payload)
      } else {
        await routesApi.create(payload)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo guardar la ruta')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await routesApi.remove(deleteTarget.idRuta)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la ruta')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Rutas</h1>
          <p className="text-sm text-slate-500">Secuencia de paradas que sigue cada ruta.</p>
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
          Nueva ruta
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}
      {!loading && paradas.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
          Crea primero al menos una parada para poder armar rutas.
        </div>
      )}

      <DataTable<Ruta>
        columns={[
          { header: 'Nombre', cell: (row) => row.nombre },
          {
            header: 'Recorrido',
            cell: (row) => (
              <span className="text-xs text-slate-500">{row.paradas.map((p) => p.nombre).join(' → ')}</span>
            ),
          },
          { header: 'Estado', cell: (row) => <EstadoBadge estado={row.estado} /> },
        ]}
        rows={items}
        rowKey={(row) => row.idRuta}
        loading={loading}
        emptyMessage="No hay rutas registradas"
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Pagination skip={skip} limit={LIMIT} total={total} onSkipChange={setSkip} />

      <Modal open={modalOpen} title={editing ? 'Editar ruta' : 'Nueva ruta'} onClose={() => setModalOpen(false)}>
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

          <div>
            <label className="block text-sm font-medium text-slate-700">Paradas del recorrido, en orden</label>
            <p className="mt-1 text-xs text-slate-400">
              Una misma parada se puede repetir (ej. para el recorrido de vuelta).
            </p>
            <div className="mt-2 space-y-2">
              {form.paradas.map((parada, index) => (
                <div
                  key={`${parada.idParada}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">
                    <span className="mr-2 text-xs text-slate-400">{index + 1}.</span>
                    {parada.nombre}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moverParada(index, -1)}
                      disabled={index === 0}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Subir"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moverParada(index, 1)}
                      disabled={index === form.paradas.length - 1}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Bajar"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => quitarParada(index)}
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                      aria-label="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {form.paradas.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
                  Sin paradas agregadas todavía
                </p>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <select
                value={paradaAAgregar}
                onChange={(event) => setParadaAAgregar(event.target.value ? Number(event.target.value) : '')}
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Selecciona una parada para agregar</option>
                {paradas.map((parada) => (
                  <option key={parada.idParada} value={parada.idParada}>
                    {parada.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={agregarParada}
                disabled={paradaAAgregar === ''}
                className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
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
        title="Eliminar ruta"
        message={`¿Eliminar la ruta "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
