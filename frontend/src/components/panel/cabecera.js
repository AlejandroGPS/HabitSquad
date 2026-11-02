import { squadAvatar } from '../avatar.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'

export function rachaChip({ racha = 0 } = {}) {
  return element(
    'span',
    'glass hidden h-11 items-center gap-1.5 rounded-full px-4 text-[1.125rem] font-black lg:flex',
    icon('flame', 'h-5 w-5 shrink-0 text-streak'),
    String(racha),
  )
}

// TODO: enlazar con la pantalla de alertas cuando exista (PBI de alertas).
export function alertasBoton() {
  return element(
    'span',
    'glass relative grid h-11 w-11 shrink-0 place-items-center rounded-full',
    element('span', 'sr-only', 'Alertas'),
    icon('bell'),
  )
}

export function escuadronResumen({ nombre, miembros = 0, plazas = 5 }) {
  return element(
    'div',
    'flex items-center gap-3 rounded-2xl bg-[#f2f2f7] p-3',
    squadAvatar({ nombre, className: 'h-10 w-10' }),
    element(
      'div',
      'min-w-0',
      element('p', 'truncate font-extrabold', nombre),
      element('p', 'text-[0.8125rem] font-bold text-ink-muted', `${miembros} de ${plazas} miembros`),
    ),
  )
}
