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

export function fotoAvatar({ nombre, fotoUrl, className = 'h-10 w-10 rounded-full' }) {
  const avatar = element('span', `grid ${className} shrink-0 place-items-center overflow-hidden`, iniciales(nombre))
  if (fotoUrl) {
    const foto = element('img', 'h-full w-full object-cover')
    foto.alt = ''
    foto.referrerPolicy = 'no-referrer'
    foto.addEventListener('error', () => avatar.replaceChildren(iniciales(nombre)), { once: true })
    foto.src = fotoUrl
    avatar.replaceChildren(foto)
  }
  return avatar
}
