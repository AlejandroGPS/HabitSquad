import { pillLink } from '../buttons.js'
import { cardClass } from '../card.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'

const TARJETA = 'flex flex-col rounded-[2rem] p-6 lg:p-8'
const SIMBOLO = 'grid h-12 w-12 place-items-center rounded-2xl'
const TITULO = 'mt-4 text-[1.625rem] leading-tight font-black'
const TEXTO = 'mt-1 mb-6 font-semibold text-pretty'

export function primerEscuadron() {
  const crear = element(
    'section',
    `${TARJETA} bg-gradient-to-br from-[#6a45f0] to-[#4c28cc] text-white shadow-[0_8px_24px_-14px_rgb(60_30_140/0.5)]`,
    element('span', `${SIMBOLO} bg-white/20`, icon('users', 'h-6 w-6 shrink-0')),
    element('h2', TITULO, 'Crea tu escuadrón'),
    element('p', TEXTO, 'Reúne hasta 5 personas y empezad la racha juntos.'),
    pillLink({ href: '/escuadrones/nuevo', variant: 'onColor', className: 'mt-auto self-start' }, icon('plus'), 'Crear un escuadrón'),
  )
  const unirse = element(
    'section',
    `${cardClass} ${TARJETA}`,
    element('span', `${SIMBOLO} bg-accent-soft text-accent`, icon('join', 'h-6 w-6 shrink-0')),
    element('h2', TITULO, 'Únete con un código'),
    element('p', `${TEXTO} text-ink-muted`, 'Si te han pasado un código de 6 caracteres, entra en su escuadrón.'),
    pillLink({ href: '/escuadrones/unirse', className: 'mt-auto self-start' }, icon('join'), 'Tengo un código'),
  )
  return element('div', 'grid gap-4 sm:grid-cols-2', crear, unirse)
}
