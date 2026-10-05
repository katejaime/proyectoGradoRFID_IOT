export default function EstadoBadge({ estado }: { estado: string }) {
  const activo = estado.toLowerCase() === 'activo'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {estado}
    </span>
  )
}
