import { element } from '../dom.js'
import { INK_SUAVE } from './textos.js'

export function encabezadoSeccion({ id, kicker, titulo, entradilla, className = 'text-center' }) {
  const heading = element(
    'h2',
    'mt-1 text-[1.875rem] leading-tight font-black tracking-tight text-balance lg:text-[2.5rem]',
    titulo,
  )
  if (id) heading.id = id
  return element(
    'div',
    `mx-auto max-w-2xl ${className}`,
    element('p', 'text-[0.9375rem] font-bold text-accent', kicker),
    heading,
    entradilla && element('p', `mt-2 text-[1.0625rem] font-semibold text-pretty ${INK_SUAVE}`, entradilla),
  )
}

export function seccion({ id, className, tituloId }, ...children) {
  const node = element('section', `scroll-mt-24 ${className}`, ...children)
  node.id = id
  node.setAttribute('aria-labelledby', tituloId)
  return node
}
