import { card, cardChip, cardLabel } from '../card.js'
import { button, element } from '../dom.js'
import { icon } from '../icons.js'

const PRIMARY = [
  'mt-3 flex h-[3.25rem] items-center justify-center gap-2 rounded-full bg-white px-6',
  'text-[1.0625rem] font-bold text-accent disabled:opacity-60 lg:mt-auto',
].join(' ')

export function habitoCard({
  habito,
  cierre = '23:59',
  onSubirPrueba,
  onVerPrueba,
  onElegirHabito,
  className = 'col-span-2',
} = {}) {
  const contenido = habito
    ? [
        element('p', 'mt-0.5 text-[1.25rem] font-black', habito),
        element('p', 'text-[0.8125rem] font-bold', onVerPrueba ? 'Ya has subido la prueba de hoy.' : `Sube una foto antes de las ${cierre}`),
        button(PRIMARY, onVerPrueba ?? onSubirPrueba, icon('camera'), onVerPrueba ? 'Ver mi prueba' : 'Subir foto de prueba'),
        button('mt-2 min-h-11 font-bold text-white underline disabled:opacity-60', onElegirHabito, 'Cambiar hábito'),
      ]
    : [
        element('p', 'mt-0.5 text-[1.25rem] font-black', 'Aún no has elegido tu hábito'),
        element('p', 'text-[0.8125rem] font-bold', 'Elige qué vas a cumplir cada día.'),
        button(PRIMARY, onElegirHabito, 'Elegir mi hábito'),
      ]

  return card(
    `${className} flex flex-col bg-gradient-to-br from-[#6a45f0] to-[#4c28cc] text-white`,
    cardChip('book', 'bg-white/20 text-white'),
    cardLabel('Mi hábito', { className: 'text-white' }),
    ...contenido,
  )
}
