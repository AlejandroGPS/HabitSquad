import { element } from '../components/dom.js'
import {
  empezarSection,
  escuadronSection,
  heroSection,
  landingFooter,
  landingNav,
  pasosSection,
} from '../components/landing/index.js'

export function presentacionScreen({ navigate } = {}) {
  const pasos = pasosSection()
  const escuadron = escuadronSection()
  const empezar = empezarSection({ navigate })
  const tengoCodigo = empezar.querySelector('#tengo-codigo')

  const backdrop = element('div', 'access-backdrop pointer-events-none fixed inset-0 -z-10')
  backdrop.setAttribute('aria-hidden', 'true')

  // Al llegar desde otra pantalla con /#seccion, la portada baja sola a esa sección.
  const destino = window.location.hash.slice(1)
  if (destino && window.requestAnimationFrame) {
    requestAnimationFrame(() => document.getElementById(destino)?.scrollIntoView())
  }

  return element(
    'div',
    'relative isolate flex min-h-dvh flex-col overflow-x-clip font-rounded text-ink antialiased',
    backdrop,
    landingNav({ secciones: [pasos, escuadron, tengoCodigo] }),
    element('main', 'flex flex-col', heroSection(), pasos, escuadron, empezar),
    landingFooter(),
  )
}
