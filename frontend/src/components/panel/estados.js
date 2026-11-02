export const ESTADOS = {
  cumplido: {
    texto: 'Cumplido',
    avatar: 'bg-[#248a3d] text-white',
    barra: 'bg-[#248a3d]',
  },
  pendiente: {
    texto: 'Pendiente',
    avatar: 'bg-[#c93400] text-white',
    barra: 'bg-[#c93400]',
  },
  'sin-prueba': {
    texto: 'Sin prueba',
    avatar: 'bg-[#f2f2f7] text-ink-muted',
    barra: 'bg-[#e5e5ea]',
  },
}

export const BARRA_VACIA = ESTADOS['sin-prueba'].barra

export function conEstado(miembros) {
  return miembros.map((miembro) => ({ ...miembro, estado: miembro.estado ?? 'sin-prueba' }))
}
