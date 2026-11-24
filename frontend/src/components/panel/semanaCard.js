import { semanaActual } from '../../tiempo.js'
import { fotoAvatar } from '../avatar.js'
import { card, cardLabel, progressBars } from '../card.js'
import { element } from '../dom.js'
import { ESTADOS } from './estados.js'

// Una cara por columna de barras; pl-14 es el ancho del día (w-11) más su separación (gap-3).
function cabecera(miembros) {
  return element(
    'div',
    'mt-3 flex gap-1 pl-14',
    ...miembros.map((miembro) => {
      const avatar = fotoAvatar({
        nombre: miembro.nombre,
        fotoUrl: miembro.fotoUrl,
        className: 'h-6 w-6 rounded-full bg-accent-soft text-[0.625rem] font-black text-accent',
      })
      avatar.title = miembro.nombre ?? ''
      return element('span', 'flex flex-1 justify-center', avatar)
    }),
  )
}

function estadoDelDia(miembro, indice, hoy) {
  return miembro.semana?.[indice]?.estado ?? (hoy ? miembro.estado : null) ?? 'sin-prueba'
}

export function semanaCard({ miembros = [], ahora = new Date(), className = 'hidden lg:row-span-2 lg:flex' } = {}) {
  const filas = semanaActual(ahora).map(({ letra, numero, hoy }, indice) =>
    element(
      'div',
      'flex items-center gap-3',
      element(
        'span',
        `w-11 text-[0.8125rem] font-extrabold ${hoy ? 'text-accent' : 'text-ink-muted'}`,
        `${letra} ${numero}`,
      ),
      progressBars(
        miembros.map((miembro) => (ESTADOS[estadoDelDia(miembro, indice, hoy)] ?? ESTADOS['sin-prueba']).barra),
        'flex-1',
      ),
    ),
  )
  return card(
    `${className} flex-col`,
    cardLabel('Esta semana', { icon: 'calendar' }),
    miembros.length > 0 && cabecera(miembros),
    element('div', `${miembros.length > 0 ? 'mt-2' : 'mt-4'} flex flex-1 flex-col justify-between gap-2`, ...filas),
  )
}
