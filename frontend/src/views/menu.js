import { listSquads, ApiError } from '../api.js'
import { accountMenu } from '../components/accountMenu.js'
import { squadAvatar } from '../components/avatar.js'
import { pillLink } from '../components/buttons.js'
import { cardClass } from '../components/card.js'
import { element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import { landingNav } from '../components/landing/landingNav.js'
import { mascota } from '../components/mascota.js'
import { plazasLibres } from '../components/panel/invitaCard.js'

const PLAZAS = 5
const SALUDO = '¡Hola! ¿Con quién sumamos racha hoy?'
const SALUDO_VACIO = '¡Vamos a por tu primer escuadrón!'

function plazasOcupadas(ocupadas) {
  const puntos = element(
    'span',
    'flex gap-1',
    ...Array.from({ length: PLAZAS }, (_, indice) =>
      element('span', `h-2.5 w-2.5 rounded-full ${indice < ocupadas ? 'bg-accent' : 'bg-accent/15'}`),
    ),
  )
  puntos.setAttribute('aria-hidden', 'true')
  return puntos
}

function tarjetaEscuadron(squad) {
  const ocupadas = squad.miembros.length
  const link = element(
    'a',
    `${cardClass} flex flex-col justify-between gap-5 outline-accent sm:min-h-44 transition-[outline-color] hover:outline-2 focus-visible:outline-2 focus-visible:outline-offset-2 lg:p-6`,
    element(
      'span',
      'flex items-center gap-3.5',
      squadAvatar({ nombre: squad.nombre, className: 'h-14 w-14' }),
      element(
        'span',
        'min-w-0',
        element('span', 'block truncate text-[1.25rem] leading-tight font-black', squad.nombre),
        element('span', 'mt-0.5 block text-[0.9375rem] font-bold text-ink-muted', `${ocupadas} de ${PLAZAS} miembros`),
      ),
    ),
    element(
      'span',
      'flex items-end justify-between gap-3',
      element(
        'span',
        'flex flex-col gap-1.5',
        plazasOcupadas(ocupadas),
        element('span', 'text-[0.8125rem] font-bold text-ink-muted', plazasLibres(PLAZAS - ocupadas)),
      ),
      element(
        'span',
        'inline-flex items-center gap-0.5 font-extrabold text-accent',
        'Abrir panel',
        icon('back', 'h-5 w-5 shrink-0 rotate-180'),
      ),
    ),
  )
  link.href = `/escuadrones/panel?id=${squad.id}`
  link.dataset.link = ''
  link.setAttribute('aria-label', `Abrir panel de ${squad.nombre}`)
  return element('li', 'flex flex-col', link)
}

const ACCION_COMPACTA = [
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[0.9375rem] font-bold',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
].join(' ')

function accionCompacta(href, clase, ...children) {
  const link = element('a', `${ACCION_COMPACTA} ${clase}`, ...children)
  link.href = href
  link.dataset.link = ''
  return link
}

function tarjetaOtraRacha() {
  return element(
    'li',
    'flex min-h-44 flex-col justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-accent-line bg-white/40 p-4 lg:p-5',
    element('h2', 'text-[1.125rem] font-black', '¿Una racha más?'),
    accionCompacta('/escuadrones/nuevo', 'bg-accent text-white hover:bg-accent-hover', icon('plus'), 'Crear un escuadrón'),
    accionCompacta('/escuadrones/unirse', 'bg-white text-accent', icon('join'), 'Tengo un código'),
  )
}

function primerEscuadron() {
  const crear = element(
    'section',
    'flex flex-col rounded-[2rem] bg-gradient-to-br from-[#6a45f0] to-[#4c28cc] p-6 text-white shadow-[0_8px_24px_-14px_rgb(60_30_140/0.5)] lg:p-8',
    element('span', 'grid h-12 w-12 place-items-center rounded-2xl bg-white/20', icon('users', 'h-6 w-6 shrink-0')),
    element('h2', 'mt-4 text-[1.625rem] leading-tight font-black', 'Crea tu escuadrón'),
    element('p', 'mt-1 mb-6 font-semibold text-pretty', 'Reúne hasta 5 personas, compartid el código y empezad la racha juntos.'),
    pillLink({ href: '/escuadrones/nuevo', variant: 'onColor', className: 'mt-auto self-start px-8' }, icon('plus'), 'Crear un escuadrón'),
  )
  const unirse = element(
    'section',
    `${cardClass} flex flex-col rounded-[2rem] p-6 lg:p-8`,
    element('span', 'grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent', icon('join', 'h-6 w-6 shrink-0')),
    element('h2', 'mt-4 text-[1.625rem] leading-tight font-black', 'Únete con un código'),
    element('p', 'mt-1 mb-6 font-semibold text-pretty text-ink-muted', '¿Te han pasado un código de 6 caracteres? Entra en su escuadrón en un momento.'),
    pillLink({ href: '/escuadrones/unirse', className: 'mt-auto self-start px-8' }, icon('join'), 'Tengo un código'),
  )
  return element('div', 'grid gap-4 sm:grid-cols-2', crear, unirse)
}

function tarjetasCargando() {
  const lista = element(
    'div',
    'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
    ...Array.from({ length: 3 }, () =>
      element(
        'div',
        `${cardClass} flex min-h-44 animate-pulse flex-col justify-between lg:p-6`,
        element(
          'span',
          'flex items-center gap-3.5',
          element('span', 'h-14 w-14 rounded-2xl bg-fill'),
          element('span', 'flex flex-col gap-2', element('span', 'h-4 w-32 rounded-full bg-fill'), element('span', 'h-3 w-20 rounded-full bg-fill')),
        ),
        element('span', 'h-3 w-24 rounded-full bg-fill'),
      ),
    ),
  )
  lista.setAttribute('aria-hidden', 'true')
  return lista
}

export function menuScreen({ onLogout, loadSquads = listSquads } = {}) {
  const bocadillo = element(
    'p',
    'glass speech-bubble rounded-2xl px-4 py-2.5 text-[1rem] font-extrabold text-balance text-ink',
    SALUDO,
  )
  const titulo = element('h1', 'mt-6 text-[2rem] leading-tight font-black tracking-tight lg:text-[2.5rem]', 'Mis escuadrones')
  titulo.id = 'squad-list-title'
  const estado = element('p', 'mt-1 text-[1.0625rem] font-semibold text-ink-muted', 'Cargando tus escuadrones…')
  estado.setAttribute('role', 'status')
  const error = element('p', 'font-bold text-red-700')
  error.setAttribute('role', 'alert')
  const reintentar = element('button', 'min-h-11 self-start font-bold text-accent underline', 'Reintentar')
  reintentar.type = 'button'
  reintentar.hidden = true
  const contenido = element('div', 'mt-6')

  const seccion = element(
    'section',
    'mx-auto flex w-full max-w-6xl flex-col px-4 pt-6 pb-12 sm:px-8 lg:pt-10',
    element(
      'div',
      'flex items-center gap-4',
      mascota('h-20 w-auto drop-shadow-[0_14px_16px_rgb(60_30_140/0.22)] motion-safe:animate-bob'),
      bocadillo,
    ),
    titulo,
    estado,
    element('div', 'mt-4 flex flex-col gap-1', error, reintentar),
    contenido,
  )
  seccion.setAttribute('aria-labelledby', titulo.id)

  let cargando = false
  async function cargar() {
    if (cargando) return
    cargando = true
    reintentar.hidden = true
    error.textContent = ''
    estado.textContent = 'Cargando tus escuadrones…'
    contenido.replaceChildren(tarjetasCargando())
    seccion.setAttribute('aria-busy', 'true')
    try {
      const squads = await loadSquads()
      if (squads.length) {
        bocadillo.textContent = SALUDO
        estado.textContent = squads.length === 1
          ? 'Tienes 1 escuadrón. Ábrelo para ver cómo va el día.'
          : `Tienes ${squads.length} escuadrones. Elige uno para ver cómo va el día.`
        contenido.replaceChildren(
          element('ul', 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3', ...squads.map(tarjetaEscuadron), tarjetaOtraRacha()),
        )
      } else {
        bocadillo.textContent = SALUDO_VACIO
        estado.textContent = 'Todavía no perteneces a ningún escuadrón. Crea uno o únete con un código.'
        contenido.replaceChildren(primerEscuadron())
      }
    } catch (causa) {
      estado.textContent = ''
      contenido.replaceChildren()
      error.textContent = causa instanceof ApiError && causa.status === 401
        ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
        : 'No se han podido cargar tus escuadrones. Comprueba la conexión y vuelve a intentarlo.'
      reintentar.hidden = false
    } finally {
      cargando = false
      seccion.setAttribute('aria-busy', 'false')
    }
  }
  reintentar.addEventListener('click', cargar)
  void cargar()

  const fondo = element('div', 'access-backdrop pointer-events-none fixed inset-0 -z-10')
  fondo.setAttribute('aria-hidden', 'true')
  return element(
    'div',
    'relative isolate flex min-h-dvh flex-col overflow-x-clip font-rounded text-ink antialiased',
    fondo,
    landingNav({ portada: '/presentacion', cuenta: accountMenu({ onLogout }) }),
    element('main', 'flex flex-col', seccion),
  )
}
