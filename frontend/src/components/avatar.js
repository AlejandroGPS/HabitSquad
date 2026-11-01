import { element } from './dom.js'

export function iniciales(nombre) {
  const letras = String(nombre ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0] ?? '')
    .join('')
  return letras.toUpperCase() || '?'
}

export function squadAvatar({ nombre, className = 'h-12 w-12' }) {
  return element(
    'span',
    `grid ${className} shrink-0 place-items-center rounded-2xl bg-accent text-[1.125rem] font-black text-white`,
    iniciales(nombre),
  )
}
