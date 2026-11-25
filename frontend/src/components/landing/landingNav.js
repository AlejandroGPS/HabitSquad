import { appMark } from '../brand.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'
import { mechaScroll } from '../mechaScroll.js'
import { selectorCuenta } from '../selectorCuenta.js'
import { SECCIONES } from './textos.js'

const ENLACE = 'inline-flex min-h-11 items-center rounded-full font-bold whitespace-nowrap'
const INACTIVO = ['text-[#3a3a3c]', 'hover:bg-black/5']
const ACTIVO = ['bg-black/[0.07]', 'text-accent']

// En la portada, los enlaces a secciones no cambian la URL: el enrutador repintaría la página
// al cambiar el hash. Desde otras pantallas llevan a la portada, que baja sola a la sección.
function enlaceSeccion({ id, label }, enPortada, portada) {
  if (!enPortada) return enlaceRuta(`${portada}#${id}`, `px-4 ${INACTIVO.join(' ')}`, label)
  const link = element('a', `${ENLACE} px-4 ${INACTIVO.join(' ')}`, label)
  link.href = `#${id}`
  link.dataset.seccion = id
  link.addEventListener('click', (event) => {
    event.preventDefault()
    const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth' })
  })
  return link
}

function enlaceRuta(href, className, ...children) {
  const link = element('a', `${ENLACE} ${className}`, ...children)
  link.href = href
  link.dataset.link = ''
  return link
}

export function marcarSeccion(enlaces, id) {
  for (const link of enlaces) {
    const actual = link.dataset.seccion === id
    link.classList.remove(...(actual ? INACTIVO : ACTIVO))
    link.classList.add(...(actual ? ACTIVO : INACTIVO))
    if (actual) link.setAttribute('aria-current', 'true')
    else link.removeAttribute('aria-current')
  }
}

function seguirSecciones(header, enlaces, secciones) {
  if (!('IntersectionObserver' in window)) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (!header.isConnected) {
        observer.disconnect()
        return
      }
      const visible = entries.find((entry) => entry.isIntersecting)
      if (visible) marcarSeccion(enlaces, visible.target.id)
    },
    { rootMargin: '-45% 0px -50% 0px' },
  )
  for (const seccion of secciones) observer.observe(seccion)
}

export const ZONAS = [
  { id: 'escuadrones', label: 'Mis escuadrones', href: '/escuadrones', icon: 'users' },
  { id: 'alertas', label: 'Alertas', href: '/alertas', icon: 'bell' },
]

// El perfil no está aquí: ya se abre desde el menú de la cuenta, que lo marca cuando estás en él.
// En el móvil no caben los textos junto a la marca y la cuenta: se queda el icono con su nombre accesible.
function enlaceZona({ id, label, href, icon: nombreIcono }, zona) {
  const actual = id === zona
  const link = enlaceRuta(
    href,
    `gap-2 px-3 sm:px-4 ${(actual ? ACTIVO : INACTIVO).join(' ')}`,
    icon(nombreIcono, 'h-5 w-5 shrink-0'),
    element('span', 'sr-only sm:not-sr-only', label),
  )
  link.dataset.zona = id
  if (actual) link.setAttribute('aria-current', window.location.pathname === href ? 'page' : 'true')
  return link
}

function marcaCompacta(className) {
  const link = enlaceRuta(
    '/',
    className,
    appMark('h-9 w-9 sm:hidden'),
    element('span', 'hidden sm:inline', 'HabitSquad'),
  )
  link.setAttribute('aria-label', 'HabitSquad')
  return link
}

// `secciones` solo se pasa en la portada. Fuera de ella, `cuenta` sustituye a los enlaces de la derecha.
// La portada vive en `/`. Fuera de ella, `portada` antepone esa ruta a los anclajes.
// `zona` se pasa en las pantallas de la app: en vez de las secciones de la portada enlaza a las de la app y marca la actual.
export function landingNav({ secciones = [], cuenta, conSecciones = true, portada = '/', zona } = {}) {
  const enPortada = secciones.length > 0
  const claseMarca =
    'me-auto shrink-0 justify-self-start text-[1.25rem] font-black tracking-tight text-accent lg:me-0 lg:text-[1.5rem]'
  const marca = marcaCompacta(claseMarca)
  const enlaces = zona
    ? ZONAS.map((item) => enlaceZona(item, zona))
    : conSecciones ? SECCIONES.map((seccion) => enlaceSeccion(seccion, enPortada, portada)) : []
  const derecha = cuenta === undefined ? selectorCuenta({ resaltada: 'register', conFondo: false }) : cuenta

  const nav = element(
    'nav',
    'nav-portada relative mx-auto flex w-full items-center gap-1 rounded-full p-1.5 ps-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:ps-6',
    marca,
    element('div', zona ? 'flex items-center gap-0.5' : 'hidden items-center gap-0.5 lg:flex', ...enlaces),
    derecha && element('div', 'flex shrink-0 justify-self-end', derecha),
  )
  nav.setAttribute('aria-label', 'Principal')

  const header = element(
    'header',
    'sticky top-0 z-30 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:px-8 lg:pt-5',
    nav,
  )
  header.append(mechaScroll({ alDesplazar: (y) => header.toggleAttribute('data-scrolled', y > 12) }))
  seguirSecciones(header, enlaces, secciones)
  return header
}
