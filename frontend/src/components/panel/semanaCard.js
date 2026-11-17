import { semanaActual } from '../../tiempo.js'
import { card, cardLabel } from '../card.js'
import { element } from '../dom.js'
import { ESTADOS, estadoDelDia } from './estados.js'

const NOMBRE = 'w-20 shrink-0 truncate text-[0.8125rem] font-extrabold'
const DIAS = 'grid flex-1 grid-cols-7 gap-1.5'
const FUTURO = 'border-2 border-dashed border-black/[0.08]'
const LEYENDA = ['cumplido', 'pendiente', 'no_cumplido', 'sin-prueba']

// Los días que aún no han llegado no tienen estado: van marcados como futuro.
export function semanaDe(miembro, ahora) {
  const dias = semanaActual(ahora)
  const indiceHoy = dias.findIndex(({ hoy }) => hoy)
  return dias.map((dia, indice) => ({
    ...dia,
    futuro: indiceHoy >= 0 && indice > indiceHoy,
    estado: estadoDelDia(miembro, indice, dia.hoy),
  }))
}

function fila(miembro, ahora) {
  const nombre = miembro.esUsuario ? 'Tú' : (miembro.nombre ?? '')
  const celdas = element(
    'div',
    DIAS,
    ...semanaDe(miembro, ahora).map(({ letra, numero, futuro, estado: clave }) => {
      if (futuro) return element('span', `h-7 rounded-lg ${FUTURO}`)
      const estado = ESTADOS[clave] ?? ESTADOS['sin-prueba']
      const celda = element('span', `h-7 rounded-lg ${estado.barra}`)
      celda.title = `${nombre}, ${letra} ${numero}: ${estado.texto}`
      return celda
    }),
  )
  celdas.dataset.barras = ''
  return element('div', 'flex items-center gap-3', element('span', NOMBRE, nombre), celdas)
}

// Una fila por miembro y una columna por día; los días que aún no han llegado van punteados.
export function semanaCard({ miembros = [], ahora = new Date(), className = 'hidden lg:col-span-2 lg:flex' } = {}) {
  const cabecera = element(
    'div',
    'flex items-end gap-3',
    element('span', NOMBRE),
    element(
      'div',
      DIAS,
      ...semanaActual(ahora).map(({ letra, numero, hoy }) =>
        element(
          'span',
          `flex flex-col items-center rounded-xl py-1 text-[0.75rem] leading-tight font-extrabold ${hoy ? 'bg-accent text-white' : 'text-ink-muted'}`,
          element('span', '', letra),
          element('span', '', String(numero)),
        ),
      ),
    ),
  )

  return card(
    `${className} flex-col`,
    cardLabel('Esta semana', { icon: 'calendar' }),
    element('div', 'mt-3 flex flex-col gap-2', cabecera, ...miembros.map((miembro) => fila(miembro, ahora))),
    element(
      'ul',
      'mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-[0.75rem] font-bold text-ink-muted',
      ...LEYENDA.map((clave) =>
        element('li', 'flex items-center gap-1.5', element('span', `h-2.5 w-2.5 rounded-full ${ESTADOS[clave].barra}`), ESTADOS[clave].texto),
      ),
    ),
  )
}
