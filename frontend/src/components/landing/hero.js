import { pillLink } from '../buttons.js'
import { element } from '../dom.js'
import { squadBadges } from '../layout.js'
import { mascota } from '../mascota.js'
import { seccion } from './encabezado.js'
import { INK_SUAVE } from './textos.js'

export function heroSection() {
  const titulo = element(
    'h1',
    'relative mt-7 max-w-3xl text-[2.375rem] leading-[1.05] font-black tracking-tight text-balance lg:text-[4.25rem]',
    element('span', 'block', 'Cumple tu hábito.'),
    ' ',
    element('span', 'block text-[#d9480f]', 'Que no caiga la racha.'),
  )
  titulo.id = 'inicio-titulo'

  return seccion(
    {
      id: 'inicio',
      tituloId: titulo.id,
      className:
        'relative flex flex-col items-center px-4 pt-8 pb-12 text-center lg:min-h-[40rem] lg:justify-center lg:pt-4 lg:pb-16',
    },
    squadBadges(),
    element(
      'div',
      'relative flex items-center gap-4',
      mascota('h-28 w-auto drop-shadow-[0_14px_16px_rgb(60_30_140/0.22)] motion-safe:animate-bob lg:h-40'),
      element(
        'p',
        'glass speech-bubble rounded-2xl px-4 py-2.5 text-start text-[1rem] font-extrabold text-balance text-ink lg:text-[1.125rem]',
        '¡Hola! ¿Empezamos una racha?',
      ),
    ),
    titulo,
    element(
      'p',
      `relative mt-4 max-w-xl text-[1.0625rem] font-semibold text-pretty lg:text-[1.25rem] ${INK_SUAVE}`,
      'Elige un hábito, únete a un escuadrón con tus amigos y demostrad cada día con una foto que lo habéis cumplido.',
    ),
    element(
      'div',
      'relative mt-7 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center',
      pillLink({ href: '/registro', className: 'sm:px-8' }, 'Crear cuenta'),
      pillLink({ href: '/login', variant: 'secondary', className: 'sm:px-8' }, 'Ya tengo cuenta'),
    ),
  )
}
