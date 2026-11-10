import { card } from '../card.js'
import { element } from '../dom.js'
import { miembroItem } from './miembroItem.js'

export function miembrosCard({
  miembros = [],
  plazas = 5,
  onVerFoto,
  onVotar,
  className = 'col-span-2 lg:col-span-3',
} = {}) {
  return card(
    className,
    element(
      'h2',
      'mb-1 flex items-center justify-between text-[0.8125rem] font-extrabold text-ink-muted',
      'Miembros',
      element('span', 'font-bold', `${miembros.length} de ${plazas} miembros`),
    ),
    element(
      'ul',
      'lg:mt-2 lg:grid lg:grid-cols-3 lg:gap-3',
      ...miembros.map((miembro) => miembroItem(miembro, { onVerFoto, onVotar })),
    ),
  )
}
