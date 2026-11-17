export const ESTADOS = {
  cumplido: {
    texto: 'Cumplido',
    avatar: 'bg-[#248a3d] text-white',
    barra: 'bg-[#248a3d]',
    etiqueta: 'bg-[#e8f5ec] text-[#248a3d]',
  },
  pendiente: {
    texto: 'Pendiente',
    avatar: 'bg-[#c93400] text-white',
    barra: 'bg-[#c93400]',
    etiqueta: 'bg-[#fff0e5] text-[#c93400]',
  },
  no_cumplido: {
    texto: 'No cumplido',
    avatar: 'bg-red-100 text-red-700',
    barra: 'bg-red-600',
    etiqueta: 'bg-red-100 text-red-700',
  },
  'sin-prueba': {
    texto: 'Sin prueba',
    avatar: 'bg-[#f2f2f7] text-ink-muted lg:bg-white',
    barra: 'bg-[#e5e5ea]',
    etiqueta: 'bg-black/[0.06] text-ink-muted',
  },
}

export const BARRA_VACIA = ESTADOS['sin-prueba'].barra

// Sin datos de la semana, el día de hoy usa el estado de la prueba de hoy.
export function estadoDelDia(miembro, indice, hoy) {
  return miembro.semana?.[indice]?.estado ?? (hoy ? miembro.estado : null) ?? 'sin-prueba'
}

export function conEstado(miembros) {
  return miembros.map((miembro) => ({ ...miembro, estado: miembro.estado ?? 'sin-prueba' }))
}
