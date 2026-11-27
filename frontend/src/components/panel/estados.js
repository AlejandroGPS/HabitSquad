export const ESTADOS = {
  cumplido: {
    texto: 'Cumplido',
    color: 'text-[#248a3d]',
    avatar: 'bg-[#248a3d] text-white',
    barra: 'bg-[#248a3d]',
  },
  pendiente: {
    texto: 'Pendiente',
    color: 'text-[#c93400]',
    avatar: 'bg-[#c93400] text-white',
    barra: 'bg-[#c93400]',
  },
  no_cumplido: {
    texto: 'No cumplido',
    color: 'text-red-700',
    avatar: 'bg-red-100 text-red-700',
    barra: 'bg-red-600',
  },
  'sin-prueba': {
    texto: 'Sin prueba',
    color: 'text-ink-muted',
    avatar: 'bg-[#f2f2f7] text-ink-muted',
    barra: 'bg-[#e5e5ea]',
  },
}

export const BARRA_VACIA = ESTADOS['sin-prueba'].barra

export function conEstado(miembros) {
  return miembros.map((miembro) => ({ ...miembro, estado: miembro.estado ?? 'sin-prueba' }))
}
