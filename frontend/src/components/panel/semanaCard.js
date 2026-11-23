import { semanaActual } from '../../tiempo.js'
import { fotoAvatar } from '../avatar.js'
import { card, cardLabel } from '../card.js'
import { element } from '../dom.js'
import { ESTADOS } from './estados.js'

const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const FUTURO = 'bg-[#f2f2f7]'
const LEYENDA = ['cumplido', 'pendiente', 'no_cumplido']

function estadoDelDia(miembro, indice, hoy) {
  return miembro.semana?.[indice]?.estado ?? (hoy ? miembro.estado : null) ?? 'sin-prueba'
}

function soloLectores(texto) {
  return element('span', 'sr-only', texto)
}

function cabecera(dias) {
  return element(
    'thead',
    '',
    element(
      'tr',
      '',
      element('th', 'w-8', soloLectores('Miembro')),
      ...dias.map(({ letra, numero, hoy }, indice) => {
        const visible = element(
          'span',
          `mx-auto grid h-6 w-6 place-items-center rounded-full ${hoy ? 'bg-accent text-white' : 'text-ink-muted'}`,
          letra,
        )
        visible.setAttribute('aria-hidden', 'true')
        const th = element('th', 'pb-1 text-center text-[0.75rem] font-extrabold', visible, soloLectores(`${NOMBRES_DIA[indice]} ${numero}`))
        th.scope = 'col'
        return th
      }),
    ),
  )
}

function fila(miembro, dias, hoyIndice) {
  const avatar = fotoAvatar({
    nombre: miembro.nombre,
    fotoUrl: miembro.fotoUrl,
    className: 'h-7 w-7 rounded-full bg-accent-soft text-[0.6875rem] font-black text-accent',
  })
  avatar.title = miembro.nombre ?? ''
  avatar.setAttribute('aria-hidden', 'true')
  const nombre = element('th', 'py-0.5 pe-1 text-left', avatar, soloLectores(miembro.nombre ?? ''))
  nombre.scope = 'row'

  return element(
    'tr',
    '',
    nombre,
    ...dias.map(({ hoy }, indice) => {
      const futuro = hoyIndice >= 0 && indice > hoyIndice
      const estado = ESTADOS[estadoDelDia(miembro, indice, hoy)] ?? ESTADOS['sin-prueba']
      return element(
        'td',
        'p-0.5',
        element('span', `block h-6 rounded-md ${futuro ? FUTURO : estado.barra}`),
        soloLectores(futuro ? 'Por llegar' : estado.texto),
      )
    }),
  )
}

export function semanaCard({ miembros = [], ahora = new Date(), className = 'hidden lg:row-span-2 lg:flex' } = {}) {
  const dias = semanaActual(ahora)
  const hoyIndice = dias.findIndex(({ hoy }) => hoy)
  const tabla = element(
    'table',
    'mt-3 w-full table-fixed',
    element('caption', 'sr-only', 'Estado de cada miembro esta semana'),
    cabecera(dias),
    element('tbody', '', ...miembros.map((miembro) => fila(miembro, dias, hoyIndice))),
  )

  return card(
    `${className} flex-col`,
    cardLabel('Esta semana', { icon: 'calendar' }),
    tabla,
    element(
      'div',
      'mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-[0.75rem] font-bold text-ink-muted',
      ...LEYENDA.map((clave) =>
        element('span', 'inline-flex items-center gap-1.5', element('span', `h-2.5 w-2.5 rounded-sm ${ESTADOS[clave].barra}`), ESTADOS[clave].texto),
      ),
    ),
  )
}
