import { element } from '../dom.js'
import { icon } from '../icons.js'

const ACCION = [
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[0.9375rem] font-bold',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
].join(' ')

function accion(href, className, ...children) {
  const link = element('a', `${ACCION} ${className}`, ...children)
  link.href = href
  link.dataset.link = ''
  return link
}

export function otraRachaCard() {
  return element(
    'section',
    'flex h-full flex-col justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-accent-line bg-white/40 p-4 lg:p-5',
    element('h2', 'text-[1.125rem] font-black', '¿Una racha más?'),
    accion('/escuadrones/nuevo', 'bg-accent text-white hover:bg-accent-hover', icon('plus'), 'Crear un escuadrón'),
    accion('/escuadrones/unirse', 'bg-white text-accent', icon('join'), 'Tengo un código'),
  )
}
