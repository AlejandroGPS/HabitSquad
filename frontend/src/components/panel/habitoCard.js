import { card, cardChip, cardLabel } from '../card.js'
import { button, element } from '../dom.js'
import { icon } from '../icons.js'
import { ESTADOS } from './estados.js'

const PRIMARY = [
  'mt-3 flex h-[3.25rem] items-center justify-center gap-2 rounded-full bg-white px-6',
  'text-[1.0625rem] font-bold text-accent disabled:opacity-60 lg:mt-auto',
].join(' ')

const PUNTO = {
  cumplido: 'bg-white text-accent',
  pendiente: 'bg-white/45',
  no_cumplido: 'bg-white/15 text-white/80',
  'sin-prueba': 'bg-white/15',
}

function dia({ letra, numero, hoy, futuro, estado }) {
  const punto = futuro
    ? element('span', 'h-7 w-7 rounded-full border-2 border-dashed border-white/35')
    : element(
        'span',
        `grid h-7 w-7 place-items-center rounded-full ${PUNTO[estado] ?? PUNTO['sin-prueba']}`,
        estado === 'cumplido' && icon('check', 'h-4 w-4 shrink-0', 3.2),
        estado === 'no_cumplido' && icon('close', 'h-3.5 w-3.5 shrink-0', 3),
      )
  if (hoy) punto.classList.add('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-[#5a37de]')
  return element(
    'span',
    'flex flex-col items-center gap-1',
    element('span', `text-[0.6875rem] font-extrabold ${hoy ? 'text-white' : 'text-white/65'}`, letra),
    punto,
  )
}

function tuSemana(semana) {
  const fila = element('div', 'mt-1.5 flex max-w-[20rem] justify-between', ...semana.map(dia))
  fila.setAttribute('role', 'img')
  fila.setAttribute(
    'aria-label',
    `Tu semana: ${semana
      .filter(({ futuro }) => !futuro)
      .map(({ letra, numero, estado }) => `${letra} ${numero} ${(ESTADOS[estado] ?? ESTADOS['sin-prueba']).texto.toLowerCase()}`)
      .join(', ')}`,
  )
  return element('div', 'mt-4 mb-4', element('p', 'text-[0.8125rem] font-extrabold text-white/80', 'Tu semana'), fila)
}

export function habitoCard({
  habito,
  cierre = '23:59',
  semana,
  onSubirPrueba,
  onVerPrueba,
  onElegirHabito,
  className = 'col-span-2',
} = {}) {
  const contenido = habito
    ? [
        element('p', 'mt-0.5 text-[1.25rem] font-black', habito),
        element('p', 'text-[0.8125rem] font-bold', onVerPrueba ? 'Ya has subido la prueba de hoy.' : `Sube una foto antes de las ${cierre}`),
        semana?.length ? tuSemana(semana) : null,
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
