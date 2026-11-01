import { semanaActual } from '../../tiempo.js'
import { card, cardLabel, progressBars } from '../card.js'
import { element } from '../dom.js'
import { BARRA_VACIA, ESTADOS, conEstado } from './estados.js'

// TODO: el historial de días anteriores llegará con la PBI de racha; de momento solo se pinta hoy.
export function semanaCard({ miembros = [], ahora = new Date(), className = 'hidden lg:row-span-2 lg:flex' } = {}) {
  const estados = conEstado(miembros).map(({ estado }) => estado)
  const filas = semanaActual(ahora).map(({ letra, numero, hoy }) =>
    element(
      'div',
      'flex items-center gap-3',
      element(
        'span',
        `w-11 text-[0.8125rem] font-extrabold ${hoy ? 'text-accent' : 'text-ink-muted'}`,
        `${letra} ${numero}`,
      ),
      progressBars(
        estados.map((estado) => (hoy ? ESTADOS[estado].barra : BARRA_VACIA)),
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
