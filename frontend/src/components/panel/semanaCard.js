import { semanaActual } from '../../tiempo.js'
import { card, cardLabel, progressBars } from '../card.js'
import { element } from '../dom.js'
import { ESTADOS } from './estados.js'

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
    element('div', 'mt-4 flex flex-1 flex-col justify-between gap-2', ...filas),
  )
}
