import { ApiError, listSquads } from '../api.js'
import { accountMenu } from '../components/accountMenu.js'
import { button, element } from '../components/dom.js'
import { landingNav } from '../components/landing/landingNav.js'
import { mascota } from '../components/mascota.js'
import { escuadronCard, escuadronesCargando, otraRachaCard, primerEscuadron } from '../components/selector/index.js'

const SALUDO = '¡Hola! ¿Con quién sumamos racha hoy?'
const SALUDO_SIN_ESCUADRON = '¡Vamos a por tu primer escuadrón!'
const CARGANDO = 'Cargando tus escuadrones…'

function resumen(total) {
  if (total === 0) return 'Todavía no perteneces a ningún escuadrón. Crea uno o únete con un código.'
  if (total === 1) return 'Tienes 1 escuadrón. Ábrelo para ver cómo va el día.'
  return `Tienes ${total} escuadrones. Elige uno para ver cómo va el día.`
}

function mensajeError(error) {
  return error instanceof ApiError && error.status === 401
    ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
    : 'No se han podido cargar tus escuadrones. Comprueba la conexión y vuelve a intentarlo.'
}

function listaEscuadrones(squads) {
  const tarjetas = squads.map(({ id, nombre, miembros }) => escuadronCard({ id, nombre, miembros: miembros.length }))
  return element(
    'ul',
    'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
    ...[...tarjetas, otraRachaCard()].map((tarjeta) => element('li', '', tarjeta)),
  )
}

export function selectorEscuadronScreen({ onLogout, loadSquads = listSquads } = {}) {
  const bocadillo = element(
    'p',
    'glass speech-bubble rounded-2xl px-4 py-2.5 text-[1rem] font-extrabold text-balance text-ink',
    SALUDO,
  )
  const titulo = element('h1', 'mt-6 text-[2rem] leading-tight font-black tracking-tight lg:text-[2.5rem]', 'Mis escuadrones')
  titulo.id = 'squad-list-title'
  const estado = element('p', 'mt-1 text-[1.0625rem] font-semibold text-ink-muted', CARGANDO)
  estado.setAttribute('role', 'status')
  const error = element('p', 'font-bold text-red-700')
  error.setAttribute('role', 'alert')
  const reintentar = button('min-h-11 self-start font-bold text-accent underline', cargar, 'Reintentar')
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
    estado.textContent = CARGANDO
    contenido.replaceChildren(escuadronesCargando())
    seccion.setAttribute('aria-busy', 'true')
    try {
      const squads = await loadSquads()
      bocadillo.textContent = squads.length ? SALUDO : SALUDO_SIN_ESCUADRON
      estado.textContent = resumen(squads.length)
      contenido.replaceChildren(squads.length ? listaEscuadrones(squads) : primerEscuadron())
    } catch (causa) {
      estado.textContent = ''
      contenido.replaceChildren()
      error.textContent = mensajeError(causa)
      reintentar.hidden = false
    } finally {
      cargando = false
      seccion.setAttribute('aria-busy', 'false')
    }
  }
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
