const OPCIONES = [
  { key: 'login', href: '/login', label: 'Iniciar sesión' },
  { key: 'register', href: '/registro', label: 'Registrarme' },
]

const ACTIVA = 'text-white'
const INACTIVA = 'text-[#3a3a3c]'

// Al pasar de login a registro se repinta la pantalla entera; recordamos la opción anterior
// para que la pastilla salga de ahí y no aparezca ya colocada.
let opcionAnterior = null

// `activa` es la página en la que estás; `resaltada` solo pinta la pastilla. En la portada va sin
// fondo para que se lea como un enlace y un botón.
export function selectorCuenta({ activa = null, resaltada = null, conFondo = true } = {}) {
  const elegida = activa ?? resaltada
  const destino = OPCIONES.findIndex((opcion) => opcion.key === elegida)
  const anterior = OPCIONES.findIndex((opcion) => opcion.key === opcionAnterior)
  opcionAnterior = elegida
  const inicio = anterior >= 0 && destino >= 0 ? anterior : destino

  const nav = document.createElement('nav')
  nav.className = `cambio-cuenta relative grid shrink-0 grid-cols-2 rounded-full p-1 ${conFondo ? 'bg-black/[0.06]' : ''}`
  nav.setAttribute('aria-label', 'Cuenta')

  const pastilla = document.createElement('span')
  pastilla.className =
    'cambio-pastilla absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-accent shadow-[0_6px_16px_-8px_rgb(91_44_240/0.8)]'
  pastilla.setAttribute('aria-hidden', 'true')
  if (inicio < 0) pastilla.hidden = true
  nav.append(pastilla)

  const enlaces = OPCIONES.map(({ key, href, label }, indice) => {
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.dataset.link = ''
    anchor.className = `relative inline-flex min-h-10 items-center justify-center rounded-full px-3 text-[0.875rem] font-bold whitespace-nowrap sm:px-4 sm:text-[0.9375rem] ${indice === inicio ? ACTIVA : INACTIVA}`
    anchor.textContent = label
    if (key === activa) anchor.setAttribute('aria-current', 'page')
    nav.append(anchor)
    return anchor
  })

  function colocar(indice) {
    nav.style.setProperty('--opcion', String(Math.max(indice, 0)))
    enlaces.forEach((anchor, posicion) => {
      anchor.classList.toggle(ACTIVA, posicion === indice)
      anchor.classList.toggle(INACTIVA, posicion !== indice)
    })
  }

  colocar(inicio)
  if (inicio !== destino && window.requestAnimationFrame) {
    requestAnimationFrame(() => requestAnimationFrame(() => colocar(destino)))
  }
  return nav
}
