import mascotUrl from '../../assets/mascota.webp'
import { card, cardLabel } from '../card.js'
import { element } from '../dom.js'

export function rachaCard({ racha = 0, className = 'row-span-2' } = {}) {
  const mascot = element(
    'img',
    '-mb-1 mt-auto h-24 w-auto self-end select-none motion-safe:animate-bob lg:h-36',
  )
  mascot.src = mascotUrl
  mascot.alt = ''
  mascot.draggable = false

  return card(
    `${className} flex flex-col overflow-hidden bg-gradient-to-br from-[#d4460c] to-[#a83400] text-white`,
    cardLabel('Racha', { icon: 'flame', className: 'text-white' }),
    element('p', 'mt-1 text-[3.75rem] leading-none font-black lg:text-[5rem]', String(racha)),
    element('p', 'font-extrabold', racha === 1 ? 'día seguido' : 'días seguidos'),
    mascot,
  )
}
