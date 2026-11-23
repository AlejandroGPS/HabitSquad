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

function miembro() {
  return element(
    'div',
    'flex items-center gap-3 py-2.5',
    hueco('h-10 w-10 shrink-0', 'rounded-xl'),
    element('div', 'flex-1', hueco('h-3.5 w-20'), hueco('mt-2 h-3 w-32 max-w-full')),
  )
}

// Mismas tarjetas y posiciones que el panel cargado, para que nada salte al llegar los datos.
export function panelCargando() {
  return [
    tarjeta(
      'row-span-2 flex flex-col',
      hueco('h-3.5 w-16'),
      hueco('mt-3 h-14 w-16 lg:h-20 lg:w-20', 'rounded-2xl'),
      hueco('mt-2 h-3.5 w-24'),
      hueco('mt-auto h-20 w-20 self-end lg:h-32 lg:w-28', 'rounded-3xl'),
    ),
    tarjeta('', chip(), hueco('h-3.5 w-10'), hueco('mt-2 h-8 w-14', 'rounded-lg'), hueco('mt-3 h-2.5 w-full')),
    tarjeta('', chip(), hueco('h-3.5 w-14'), hueco('mt-2 h-8 w-20', 'rounded-lg'), hueco('mt-2 h-3 w-24')),
    tarjeta(
      'hidden flex-col lg:row-span-2 lg:flex',
      hueco('h-3.5 w-24'),
      element(
        'div',
        'mt-3 flex gap-1 pl-14',
        ...Array.from({ length: 3 }, () => element('span', 'flex flex-1 justify-center', hueco('h-6 w-6'))),
      ),
      element(
        'div',
        'mt-2 flex flex-1 flex-col justify-between gap-2',
        ...Array.from({ length: 7 }, () =>
          element('div', 'flex items-center gap-3', hueco('h-3 w-8'), hueco('h-2.5 flex-1')),
        ),
      ),
    ),
    tarjeta(
      'col-span-2 flex flex-col',
      chip(),
      hueco('h-3.5 w-20'),
      hueco('mt-2 h-6 w-48 max-w-full', 'rounded-lg'),
      hueco('mt-2 h-3 w-40'),
      hueco('mt-3 h-[3.25rem] w-full lg:mt-auto'),
    ),
    tarjeta(
      'col-span-2 lg:col-span-3',
      element('div', 'mb-1 flex justify-between', hueco('h-3.5 w-16'), hueco('h-3.5 w-24')),
      element('div', 'mt-1 divide-y divide-hairline', miembro(), miembro(), miembro()),
    ),
    tarjeta(
      'hidden flex-col lg:flex',
      chip(),
      hueco('h-3.5 w-12'),
      hueco('mt-2 h-7 w-32', 'rounded-lg'),
      hueco('mt-2 mb-3 h-3 w-24'),
      hueco('mt-auto h-11 w-24'),
    ),
  ]
}
