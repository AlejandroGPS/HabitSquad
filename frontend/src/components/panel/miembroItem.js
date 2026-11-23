import { iniciales } from '../avatar.js'
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

function avatarSinFoto(miembro, estado) {
  return element(
    'span',
    `grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black ${estado.avatar}`,
    miembro.estado === 'cumplido' ? icon('check', 'h-5 w-5 shrink-0', 3.2) : iniciales(miembro.nombre),
  )
}

// Con foto, el color del estado pasa a una insignia para no taparla.
function avatar(miembro, estado) {
  const sinFoto = avatarSinFoto(miembro, estado)
  if (!miembro.fotoUrl) return sinFoto
  const foto = element('img', 'h-10 w-10 rounded-xl bg-[#e5e5ea] object-cover')
  foto.alt = ''
  foto.referrerPolicy = 'no-referrer'
  const nombreIcono = ICONO_ESTADO[miembro.estado]
  const insignia = nombreIcono && element(
    'span',
    `absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-white ${estado.avatar}`,
    icon(nombreIcono, 'h-3 w-3 shrink-0', 3.2),
  )
  const conFoto = element('span', 'relative shrink-0', foto, insignia)
  foto.addEventListener('error', () => conFoto.replaceWith(sinFoto), { once: true })
  foto.src = miembro.fotoUrl
  return conFoto
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
