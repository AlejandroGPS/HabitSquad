import { pillClass, pillLink } from '../buttons.js'
import { cardClass } from '../card.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'
import { CHIPS } from './textos.js'

const TARJETA = 'reveal flex flex-col rounded-[2rem] p-6 lg:p-8'
const TITULO = 'mt-4 text-[1.625rem] leading-tight font-black lg:text-[2rem]'
const LONGITUD_CODIGO = 6

export function normalizarCodigo(valor) {
  return String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function rutaUnirse(codigo) {
  return `/escuadrones/unirse?codigo=${encodeURIComponent(codigo)}`
}

export function conSiguiente(ruta, siguiente) {
  return `${ruta}?siguiente=${encodeURIComponent(siguiente)}`
}

function codigoEjemplo(codigo) {
  const cajas = element(
    'div',
    'mt-1.5 grid grid-cols-6 gap-2',
    ...[...codigo].map((letra) =>
      element('span', 'grid h-14 place-items-center rounded-xl bg-white/20 text-[1.5rem] font-black', letra),
    ),
  )
  cajas.setAttribute('role', 'img')
  cajas.setAttribute('aria-label', codigo)
  return element('div', 'mt-5', element('p', 'text-[0.9375rem] font-bold', 'Tu código será algo así'), cajas)
}

export function crearTarjeta({ codigo = 'K7P2QX' } = {}) {
  return element(
    'section',
    `${TARJETA} bg-gradient-to-br from-[#6a45f0] to-[#4c28cc] text-white shadow-[0_8px_24px_-14px_rgb(60_30_140/0.5)]`,
    element('span', 'grid h-12 w-12 place-items-center rounded-2xl bg-white/20', icon('users', 'h-6 w-6 shrink-0')),
    element('h2', TITULO, '¿Empiezas tú?'),
    element(
      'p',
      'mt-1 font-semibold text-pretty',
      'Crea tu cuenta, monta el escuadrón y comparte el código con quien quieras.',
    ),
    codigoEjemplo(codigo),
    pillLink(
      { href: conSiguiente('/registro', '/escuadrones/nuevo'), variant: 'onColor', className: 'mt-6 lg:mt-auto' },
      icon('userPlus'),
      'Crear mi escuadrón',
    ),
  )
}

// Quien llega sin sesión pasa por el login o el registro, que le devuelven a unirse con el código ya escrito.
export function unirseTarjeta({ navigate } = {}) {
  const input = element(
    'input',
    [
      'h-16 w-full min-w-0 rounded-2xl border-2 border-transparent bg-[#f2f2f7] px-4 text-center',
      'text-[1.75rem] font-black tracking-[0.4em] uppercase outline-none placeholder:text-[#c7c7cc]',
      'focus:border-accent-line focus:ring-4 focus:ring-accent/15 aria-invalid:border-red-400',
    ].join(' '),
  )
  Object.assign(input, {
    id: 'codigo-portada',
    name: 'codigo',
    maxLength: LONGITUD_CODIGO,
    placeholder: 'K7P2QX',
    autocomplete: 'off',
    spellcheck: false,
  })
  const label = element('label', 'text-[0.9375rem] font-bold', 'Código de invitación')
  label.htmlFor = input.id

  const error = element('p', 'hidden text-[0.875rem] font-bold text-red-600', 'Escribe los 6 caracteres del código.')
  error.id = 'codigo-portada-error'
  error.setAttribute('role', 'alert')

  input.setAttribute('autocapitalize', 'characters')
  input.setAttribute('aria-invalid', 'false')
  input.setAttribute('aria-describedby', error.id)
  input.addEventListener('input', () => {
    input.value = normalizarCodigo(input.value).slice(0, LONGITUD_CODIGO)
    input.setAttribute('aria-invalid', 'false')
    error.classList.add('hidden')
  })

  const unirme = element('button', `mt-5 w-full ${pillClass()}`, 'Unirme al escuadrón')
  unirme.type = 'submit'
  unirme.value = 'entrar'

  const registrarme = element(
    'button',
    'inline-flex min-h-11 items-center font-bold text-accent hover:underline',
    'Crear cuenta y unirme',
  )
  registrarme.type = 'submit'
  registrarme.value = 'registro'

  const form = element(
    'form',
    'mt-5 flex flex-1 flex-col',
    element('div', 'flex flex-col gap-1.5', label, input, error),
    element('div', 'lg:mt-auto', unirme),
    element(
      'p',
      'mt-2 flex flex-wrap items-center justify-center gap-x-1 text-[0.9375rem] font-semibold text-ink-muted',
      '¿Aún no tienes cuenta?',
      registrarme,
    ),
  )
  form.noValidate = true
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const codigo = normalizarCodigo(input.value)
    if (codigo.length !== LONGITUD_CODIGO) {
      input.setAttribute('aria-invalid', 'true')
      error.classList.remove('hidden')
      input.focus()
      return
    }
    const destino = rutaUnirse(codigo)
    navigate?.(event.submitter?.value === 'registro' ? conSiguiente('/registro', destino) : destino)
  })

  const tarjeta = element(
    'section',
    `${cardClass} ${TARJETA} scroll-mt-24`,
    element('span', `grid h-12 w-12 place-items-center rounded-2xl ${CHIPS.hora}`, icon('join', 'h-6 w-6 shrink-0')),
    element('h2', TITULO, '¿Te han pasado un código?'),
    element('p', 'mt-1 font-semibold text-pretty text-ink-muted', 'Escríbelo aquí y únete a su escuadrón.'),
    form,
  )
  tarjeta.id = 'tengo-codigo'
  return tarjeta
}

export function empezarSection({ navigate } = {}) {
  return element(
    'div',
    'mx-auto grid w-full max-w-md gap-3 px-4 py-10 lg:max-w-6xl lg:grid-cols-2 lg:gap-4 lg:px-8 lg:py-14',
    crearTarjeta(),
    unirseTarjeta({ navigate }),
  )
}
