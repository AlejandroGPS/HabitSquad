import { cardClass } from '../card.js'
import { element } from '../dom.js'

function hueco(className, forma = 'rounded-full') {
  return element('span', `hueco block ${forma} ${className}`)
}

function tarjeta(className, ...children) {
  const node = element('div', `${cardClass} ${className}`, ...children)
  node.setAttribute('aria-hidden', 'true')
  return node
}

function miembro() {
  return element(
    'div',
    'flex items-center gap-3 py-2.5',
    hueco('h-11 w-11 shrink-0'),
    element('div', 'flex-1', hueco('h-3.5 w-20'), hueco('mt-2 h-3 w-32 max-w-full')),
  )
}

function semana() {
  return element('div', 'flex items-center gap-1', hueco('h-7 w-7 shrink-0'), ...Array.from({ length: 7 }, () => hueco('h-6 flex-1', 'rounded-md')))
}

// Mismas tarjetas y posiciones que el panel cargado, para que nada salte al llegar los datos.
export function panelCargando() {
  return [
    tarjeta(
      'flex flex-col gap-4 xl:col-span-2',
      element('div', 'flex justify-between', element('div', '', hueco('h-3.5 w-16'), hueco('mt-3 h-14 w-40 max-w-full', 'rounded-2xl')), hueco('h-24 w-20 lg:h-32 lg:w-28', 'rounded-3xl')),
      hueco('mt-auto h-24 w-full', 'rounded-2xl'),
    ),
    tarjeta(
      'flex flex-col',
      element('div', 'mb-4 flex items-center gap-3', hueco('h-12 w-12 shrink-0'), element('div', 'flex-1', hueco('h-4 w-24'), hueco('mt-2 h-5 w-28'))),
      hueco('h-3.5 w-20'),
      hueco('mt-2 h-6 w-36 max-w-full', 'rounded-lg'),
      hueco('mt-3 h-[3.25rem] w-full lg:mt-auto'),
    ),
    tarjeta(
      'xl:col-span-2',
      element('div', 'mb-1 flex justify-between', hueco('h-3.5 w-16'), hueco('h-3.5 w-24')),
      element('div', 'mt-1 divide-y divide-hairline', miembro(), miembro(), miembro()),
    ),
    tarjeta(
      'flex flex-col',
      hueco('h-3.5 w-24'),
      element('div', 'mt-4 flex flex-col gap-2', semana(), semana(), semana()),
    ),
    tarjeta(
      'flex flex-wrap items-center gap-x-4 gap-y-3 lg:col-span-2 xl:col-span-3',
      hueco('h-11 w-11 shrink-0', 'rounded-2xl'),
      element('div', 'min-w-[11rem] flex-1', hueco('h-4 w-40 max-w-full'), hueco('mt-2 h-3 w-24')),
      element('div', 'flex items-center gap-2', hueco('h-11 w-32', 'rounded-xl'), hueco('h-11 w-24')),
    ),
  ]
}
