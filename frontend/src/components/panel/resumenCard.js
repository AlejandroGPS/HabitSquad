import mascotUrl from '../../assets/mascota.webp'
import { tiempoRestante } from '../../tiempo.js'
import { card, cardLabel, progressBars } from '../card.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'
import { conEstado } from './estados.js'

export function resumenCard({ racha = 0, miembros = [], cierre = '23:59', ahora = new Date(), className = '' } = {}) {
  const estados = conEstado(miembros).map(({ estado }) => estado)
  const cumplidos = estados.filter((estado) => estado === 'cumplido').length
  const restante = tiempoRestante(ahora, cierre)

  const mascota = element(
    'img',
    'pointer-events-none absolute top-3 right-3 h-24 w-auto select-none motion-safe:animate-bob lg:top-4 lg:right-5 lg:h-32',
  )
  mascota.src = mascotUrl
  mascota.alt = ''
  mascota.draggable = false

  return card(
    `${className} flex flex-col gap-4 overflow-hidden bg-gradient-to-br from-[#d4460c] to-[#a83400] text-white`,
    mascota,
    element(
      'div',
      'relative pe-24 lg:pe-36',
      cardLabel('Racha', { icon: 'flame', className: 'text-white' }),
      element(
        'p',
        'mt-1 flex flex-wrap items-baseline gap-x-2',
        element('span', 'text-[3.75rem] leading-none font-black lg:text-[4.5rem]', String(racha)),
        element('span', 'text-[1.0625rem] font-extrabold', racha === 1 ? 'día seguido' : 'días seguidos'),
      ),
    ),
    element(
      'div',
      'relative mt-auto rounded-2xl bg-white/15 p-3.5',
      element(
        'div',
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-1',
        element(
          'p',
          'font-extrabold',
          element('span', 'text-white/80', 'Hoy '),
          `${cumplidos} de ${estados.length} ${cumplidos === 1 ? 'ha' : 'han'} cumplido`,
        ),
        element('p', 'flex items-center gap-1.5 text-[0.875rem] font-extrabold', icon('clock', 'h-4 w-4 shrink-0'), `Cierra a las ${cierre}`),
      ),
      progressBars(estados.map((estado) => (estado === 'cumplido' ? 'bg-white' : 'bg-white/25')), 'mt-2.5'),
      element(
        'p',
        'mt-2 text-[0.8125rem] font-bold text-white/85',
        restante ? `Quedan ${restante} para subir la prueba` : 'El día ya ha cerrado',
      ),
    ),
  )
}
