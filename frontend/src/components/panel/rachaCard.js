import mascotUrl from '../../assets/mascota.webp'
import { card, cardLabel } from '../card.js'
import { element } from '../dom.js'

export function rachaCard({ racha = 0, className = 'col-span-2 lg:col-span-1' } = {}) {
  // Entre 1024 y 1279 px la tarjeta es tan estrecha que la mascota taparía el texto.
  const mascot = element(
    'img',
    'pointer-events-none absolute right-3 -bottom-1 h-24 w-auto select-none motion-safe:animate-bob lg:hidden xl:block xl:h-28',
  )
  mascot.src = mascotUrl
  mascot.alt = ''
  mascot.draggable = false

  return card(
    `${className} min-h-32 overflow-hidden bg-gradient-to-br from-[#ff7a1a] via-[#e5560f] to-[#b83a00] text-white`,
    cardLabel('Racha', { icon: 'flame', className: 'text-white/90' }),
    element('p', 'mt-1 text-[3.75rem] leading-none font-black lg:text-[4.5rem]', String(racha)),
    element('p', 'font-extrabold', racha === 1 ? 'día seguido' : 'días seguidos'),
    mascot,
  )
}
