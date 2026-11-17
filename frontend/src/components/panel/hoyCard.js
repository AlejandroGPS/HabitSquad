import { duracion, minutosRestantes } from '../../tiempo.js'
import { card, cardLabel } from '../card.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'
import { conEstado } from './estados.js'

const SVG = 'http://www.w3.org/2000/svg'
const URGENTE = 'text-[#c93400]'

function circulo(className) {
  const node = document.createElementNS(SVG, 'circle')
  for (const [nombre, valor] of Object.entries({ cx: 50, cy: 50, r: 42, fill: 'none', 'stroke-width': 11 })) {
    node.setAttribute(nombre, valor)
  }
  node.setAttribute('class', className)
  return node
}

function anillo(hechos, total) {
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('class', 'absolute inset-0 -rotate-90')
  const progreso = circulo('stroke-[#248a3d]')
  progreso.setAttribute('pathLength', '100')
  progreso.setAttribute('stroke-linecap', 'round')
  progreso.setAttribute('stroke-dasharray', `${total ? Math.round((hechos / total) * 1000) / 10 : 0} 100`)
  progreso.dataset.anillo = ''
  svg.append(circulo('stroke-[#e8f5ec]'), hechos ? progreso : '')

  return element(
    'div',
    'relative grid h-22 w-22 shrink-0 place-items-center lg:h-24 lg:w-24 xl:h-28 xl:w-28',
    svg,
    element('p', 'relative text-[1.5rem] font-black xl:text-[1.875rem]', `${hechos}/${total}`),
  )
}

function lista(nombres) {
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres[0]
}

function resumen(miembros) {
  const faltan = miembros.filter(({ estado }) => estado !== 'cumplido')
  const hechos = miembros.length - faltan.length
  if (!miembros.length) return ['Aún no hay nadie en el escuadrón', 'Invita a alguien para empezar la racha.']
  if (!faltan.length) return ['¡Todos han cumplido hoy!', 'La racha sigue viva un día más.']
  const nombres = faltan.map(({ nombre, esUsuario }) => (esUsuario ? 'tú' : nombre))
  return [
    hechos ? `${hechos} de ${miembros.length} han cumplido` : 'Nadie ha cumplido aún',
    `${faltan.length === 1 ? 'Falta' : 'Faltan'} ${faltan.length}: ${lista(nombres)}.`,
  ]
}

// Si ahora es una función, la cuenta atrás se repinta sola mientras la tarjeta siga en pantalla.
function cuentaAtras({ cierre, ahora }) {
  const reloj = typeof ahora === 'function' ? ahora : () => ahora
  const valor = element('p', 'text-[1.25rem] leading-tight font-black lg:text-[1.5rem] xl:text-[1.75rem]')
  const nota = element('p', 'text-[0.8125rem] font-bold text-ink-muted', `a las ${cierre}`)

  function pintar() {
    const minutos = minutosRestantes(reloj(), cierre)
    valor.textContent = minutos === null ? 'Cerrado' : duracion(minutos)
    valor.classList.toggle(URGENTE, minutos !== null && minutos < 60)
  }

  pintar()
  const bloque = element(
    'div',
    [
      'flex w-full items-center gap-3 border-t border-black/[0.06] pt-3',
      'lg:w-auto lg:flex-col lg:items-start lg:gap-0.5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6',
    ].join(' '),
    element('span', 'grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e6f2ff] text-[#0066cc] lg:mb-2', icon('clock', 'h-4.5 w-4.5 shrink-0')),
    element('p', 'text-[0.8125rem] font-extrabold text-ink-muted', 'Cierra en'),
    valor,
    nota,
  )
  if (typeof ahora === 'function') {
    const temporizador = setInterval(() => {
      if (bloque.isConnected) pintar()
      else clearInterval(temporizador)
    }, 30_000)
  }
  return bloque
}

export function hoyCard({ miembros = [], cierre = '23:59', ahora = new Date(), className = 'col-span-2 lg:col-span-3' } = {}) {
  const conTodos = conEstado(miembros)
  const hechos = conTodos.filter(({ estado }) => estado === 'cumplido').length
  const [titular, detalle] = resumen(conTodos)

  return card(
    `${className} flex flex-wrap items-center gap-x-4 gap-y-3 lg:flex-nowrap lg:gap-x-6`,
    anillo(hechos, conTodos.length),
    element(
      'div',
      'min-w-0 flex-1',
      cardLabel('Hoy'),
      element('p', 'mt-0.5 text-[1.25rem] leading-tight font-black lg:text-[1.5rem] xl:text-[1.75rem]', titular),
      element('p', 'mt-1 text-[0.875rem] font-bold text-ink-muted', detalle),
    ),
    cuentaAtras({ cierre, ahora }),
  )
}
