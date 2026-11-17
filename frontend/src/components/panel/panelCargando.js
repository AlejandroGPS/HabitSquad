import { cardClass } from '../card.js'
import { element } from '../dom.js'

function hueco(className, forma = 'rounded-full') {
  return element('span', `hueco block ${forma} ${className}`)
}

function chip() {
  return hueco('absolute top-3.5 right-3.5 h-8 w-8', 'rounded-xl')
}

function tarjeta(className, ...children) {
  const node = element('div', `${cardClass} ${className}`, ...children)
  node.setAttribute('aria-hidden', 'true')
  return node
}

function varios(cuantos, crear) {
  return Array.from({ length: cuantos }, crear)
}

function miembro() {
  return element(
    'div',
    'flex items-center gap-3 py-1.5 lg:rounded-xl lg:bg-[#f2f2f7] lg:p-3',
    hueco('h-10 w-10 shrink-0', 'rounded-xl'),
    element('div', 'min-w-0 flex-1', hueco('h-3.5 w-28 max-w-full'), hueco('mt-2 h-3 w-32 max-w-full')),
    hueco('h-11 w-20 shrink-0'),
  )
}

function filaSemana(nombre) {
  return element(
    'div',
    'flex items-center gap-3',
    element('span', 'w-20 shrink-0', nombre),
    element('div', 'grid flex-1 grid-cols-7 gap-1.5', ...varios(7, () => hueco('h-7', 'rounded-lg'))),
  )
}

// Mismas tarjetas y posiciones que el panel cargado, para que nada salte al llegar los datos.
export function panelCargando() {
  return [
    tarjeta(
      'col-span-2 flex flex-wrap items-center gap-x-4 gap-y-3 lg:col-span-3 lg:flex-nowrap lg:gap-x-6',
      hueco('h-22 w-22 shrink-0 lg:h-24 lg:w-24 xl:h-28 xl:w-28'),
      element(
        'div',
        'min-w-0 flex-1',
        hueco('h-3.5 w-12'),
        hueco('mt-2 h-6 w-56 max-w-full lg:h-8', 'rounded-lg'),
        hueco('mt-2 h-3.5 w-64 max-w-full'),
      ),
      element(
        'div',
        'flex w-full items-center gap-3 border-t border-black/[0.06] pt-3 lg:w-auto lg:flex-col lg:items-start lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6',
        hueco('h-8 w-8 shrink-0 lg:mb-2', 'rounded-xl'),
        hueco('h-3.5 w-16'),
        hueco('h-6 w-24 lg:h-8 lg:w-28', 'rounded-lg'),
        hueco('h-3 w-16'),
      ),
    ),
    tarjeta(
      'col-span-2 min-h-32 lg:col-span-1',
      hueco('h-3.5 w-16'),
      hueco('mt-2 h-14 w-20 lg:h-16', 'rounded-2xl'),
      hueco('mt-2 h-3.5 w-24'),
    ),
    tarjeta(
      'col-span-2 flex flex-col',
      chip(),
      hueco('h-3.5 w-20'),
      hueco('mt-2 h-6 w-48 max-w-full', 'rounded-lg'),
      hueco('mt-2 h-3 w-40'),
      hueco('mt-4 h-3 w-16'),
      element(
        'div',
        'mt-1.5 mb-4 flex max-w-[20rem] justify-between',
        ...varios(7, () => element('span', 'flex flex-col items-center gap-1', hueco('h-3 w-2.5'), hueco('h-7 w-7'))),
      ),
      hueco('mt-3 h-[3.25rem] w-full lg:mt-auto'),
      element('div', 'mt-2 grid h-11 place-items-center', hueco('h-3.5 w-28')),
    ),
    tarjeta(
      'hidden flex-col lg:col-span-2 lg:flex',
      hueco('h-3.5 w-24'),
      element(
        'div',
        'mt-3 flex flex-col gap-2',
        element(
          'div',
          'flex items-end gap-3',
          element('span', 'w-20 shrink-0'),
          element('div', 'grid flex-1 grid-cols-7 gap-1.5', ...varios(7, () => hueco('h-9', 'rounded-xl'))),
        ),
        ...varios(3, () => filaSemana(hueco('h-3.5 w-14'))),
      ),
      element('div', 'mt-auto flex gap-4 pt-4', ...varios(4, () => hueco('h-3 w-16'))),
    ),
    tarjeta(
      'col-span-2 lg:col-span-3',
      element('div', 'mb-1 flex justify-between', hueco('h-3.5 w-16'), hueco('h-3.5 w-24')),
      element('div', 'lg:mt-2 lg:grid lg:gap-3 xl:grid-cols-2', miembro(), miembro(), miembro()),
    ),
    tarjeta(
      'col-span-2 flex flex-col lg:col-span-1',
      chip(),
      hueco('h-3.5 w-12'),
      hueco('mt-2 h-7 w-32', 'rounded-lg'),
      element('div', 'mt-2 flex gap-1.5', ...varios(5, () => hueco('h-2.5 w-2.5'))),
      hueco('mt-2 mb-4 h-3 w-24'),
      hueco('mt-auto h-11 w-24'),
    ),
  ]
}
