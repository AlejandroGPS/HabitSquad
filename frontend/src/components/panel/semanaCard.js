import { semanaActual } from '../../tiempo.js'
import { iniciales } from '../avatar.js'
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
  // Una columna por miembro con su inicial encima. ps-14 es el ancho del día (w-11) más gap-3.
  // Con cinco miembros la columna es muy estrecha, así que el nombre completo queda en el title.
  const quienes = element(
    'div',
    'mt-3 flex gap-1 ps-14',
    ...miembros.map(({ nombre, esUsuario }) => {
      const quien = element(
        'span',
        'flex-1 text-center text-[0.6875rem] font-extrabold whitespace-nowrap text-ink-muted',
        esUsuario ? 'Tú' : iniciales(nombre).charAt(0),
      )
      quien.title = esUsuario ? 'Tú' : (nombre ?? '')
      return quien
    }),
  )
  return card(
    `${className} flex-col`,
    cardLabel('Esta semana', { icon: 'calendar' }),
    quienes,
    element('div', 'mt-2 flex flex-1 flex-col justify-between gap-2', ...filas),
  )
}
