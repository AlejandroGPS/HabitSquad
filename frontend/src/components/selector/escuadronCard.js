import { squadAvatar } from '../avatar.js'
import { cardClass } from '../card.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'
import { plazasLibres } from '../panel/invitaCard.js'

function puntosPlazas(ocupadas, plazas) {
  const puntos = element(
    'span',
    'flex gap-1',
    ...Array.from({ length: Math.min(plazas, 10) }, (_, indice) =>
      element('span', `h-2.5 w-2.5 rounded-full ${indice < ocupadas ? 'bg-accent' : 'bg-accent/15'}`),
    ),
  )
  puntos.setAttribute('aria-hidden', 'true')
  return puntos
}

export function escuadronCard({ id, nombre, miembros = 0, plazas = 5 }) {
  const link = element(
    'a',
    `${cardClass} flex h-full flex-col justify-between gap-5 outline-accent hover:outline-2 focus-visible:outline-2 focus-visible:outline-offset-2`,
    element(
      'span',
      'flex items-center gap-3.5',
      squadAvatar({ nombre, className: 'h-14 w-14' }),
      element(
        'span',
        'min-w-0',
        element('span', 'block truncate text-[1.25rem] leading-tight font-black', nombre),
        element('span', 'mt-0.5 block text-[0.9375rem] font-bold text-ink-muted', `${miembros} de ${plazas} miembros`),
      ),
    ),
    element(
      'span',
      'flex items-end justify-between gap-3',
      element(
        'span',
        'flex flex-col gap-1.5',
        puntosPlazas(miembros, plazas),
        element('span', 'text-[0.8125rem] font-bold text-ink-muted', plazasLibres(plazas - miembros)),
      ),
      element('span', 'inline-flex items-center gap-0.5 font-extrabold text-accent', 'Abrir panel', icon('forward')),
    ),
  )
  link.href = `/escuadrones/panel?id=${id}`
  link.dataset.link = ''
  link.setAttribute('aria-label', `Abrir panel de ${nombre}`)
  return link
}
