import { cardClass } from '../card.js'
import { element } from '../dom.js'

function hueco(className) {
  return element('span', `rounded-full bg-fill ${className}`)
}

export function escuadronesCargando({ cantidad = 3 } = {}) {
  const lista = element(
    'div',
    'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
    ...Array.from({ length: cantidad }, () =>
      element(
        'div',
        `${cardClass} flex min-h-40 animate-pulse flex-col justify-between`,
        element(
          'span',
          'flex items-center gap-3.5',
          element('span', 'h-14 w-14 rounded-2xl bg-fill'),
          element('span', 'flex flex-col gap-2', hueco('h-4 w-32'), hueco('h-3 w-20')),
        ),
        hueco('h-3 w-24'),
      ),
    ),
  )
  lista.setAttribute('aria-hidden', 'true')
  return lista
}
