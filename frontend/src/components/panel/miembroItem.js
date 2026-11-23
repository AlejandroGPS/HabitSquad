import { fotoAvatar } from '../avatar.js'
import { pillButtonClass } from '../card.js'
import { button, element } from '../dom.js'
import { icon } from '../icons.js'
import { ESTADOS } from './estados.js'

const ICONO_ESTADO = { cumplido: 'check', pendiente: 'clock', no_cumplido: 'close' }

// Nadie puede votar su propia prueba, pero sí ver la foto que ha subido.
function accion(miembro, { onVerFoto, onVotar }) {
  if (miembro.estado === 'pendiente' && !miembro.esUsuario) return { texto: 'Votar', handler: onVotar }
  if (miembro.estado !== 'sin-prueba') return { texto: 'Ver foto', handler: onVerFoto }
  return null
}

function avatar(miembro, estado) {
  const nombreIcono = ICONO_ESTADO[miembro.estado]
  return element(
    'span',
    'relative shrink-0',
    fotoAvatar({
      nombre: miembro.nombre,
      fotoUrl: miembro.fotoUrl,
      className: 'h-11 w-11 rounded-full bg-accent-soft font-black text-accent',
    }),
    nombreIcono && element(
      'span',
      `absolute -right-0.5 -bottom-0.5 grid h-5 w-5 place-items-center rounded-full ring-2 ring-white ${estado.avatar}`,
      icon(nombreIcono, 'h-3 w-3 shrink-0', 3.2),
    ),
  )
}

export function miembroItem(miembro, acciones = {}) {
  miembro = { ...miembro, estado: miembro.estado ?? 'sin-prueba' }
  const estado = ESTADOS[miembro.estado]
  const nombre = element('span', 'truncate', miembro.nombre)
  nombre.title = miembro.nombre
  const boton = accion(miembro, acciones)

  return element(
    'li',
    'flex items-center gap-3 py-2.5',
    avatar(miembro, estado),
    element(
      'div',
      'min-w-0 flex-1',
      element(
        'p',
        'flex min-w-0 items-center gap-1.5 font-extrabold',
        nombre,
        miembro.esUsuario && element('span', 'shrink-0 rounded-full bg-accent-soft px-2 text-xs leading-5 text-accent', 'Tú'),
      ),
      // El estado no se recorta aunque el hábito sea largo.
      element(
        'p',
        'flex min-w-0 gap-1 text-[0.8125rem] font-bold text-ink-muted',
        element('span', 'truncate', miembro.habito ?? 'Sin hábito'),
        element('span', 'shrink-0', ' · '),
        element('span', `shrink-0 font-extrabold ${estado.color}`, estado.texto),
      ),
    ),
    boton && button(pillButtonClass, boton.handler && (() => boton.handler(miembro)), boton.texto),
  )
}
