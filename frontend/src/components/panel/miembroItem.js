import { iniciales } from '../avatar.js'
import { pillButtonClass } from '../card.js'
import { button, element } from '../dom.js'
import { icon } from '../icons.js'
import { ESTADOS } from './estados.js'

// Nadie puede votar su propia prueba, pero sí ver la foto que ha subido.
function accion(miembro, { onVerFoto, onVotar }) {
  if (miembro.estado === 'cumplido') return { texto: 'Ver foto', handler: onVerFoto }
  if (miembro.estado === 'pendiente' && !miembro.esUsuario) return { texto: 'Votar', handler: onVotar }
  return null
}

export function miembroItem(miembro, acciones = {}) {
  miembro = { ...miembro, estado: miembro.estado ?? 'sin-prueba' }
  const estado = ESTADOS[miembro.estado]
  const avatar = element(
    'span',
    `grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black ${estado.avatar}`,
    miembro.estado === 'cumplido' ? icon('check', 'h-5 w-5 shrink-0', 3.2) : iniciales(miembro.nombre),
  )
  const boton = accion(miembro, acciones)

  return element(
    'li',
    'flex items-center gap-3 py-1.5 lg:rounded-xl lg:bg-[#f2f2f7] lg:p-3',
    avatar,
    element(
      'div',
      'min-w-0 flex-1',
      element('p', 'font-extrabold', miembro.esUsuario ? 'Tú' : miembro.nombre),
      element(
        'p',
        'truncate text-[0.8125rem] font-bold text-ink-muted lg:overflow-visible lg:whitespace-normal',
        `${miembro.habito ?? 'Sin hábito'} · ${estado.texto}`,
      ),
    ),
    boton && button(`${pillButtonClass} lg:px-3.5`, boton.handler && (() => boton.handler(miembro)), boton.texto),
  )
}
