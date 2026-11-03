import { element } from './dom.js'
import { icon } from './icons.js'

const limitar = (valor) => Math.min(1, Math.max(0, valor))

// Mientras está montada, la mecha sustituye a la barra de desplazamiento nativa.
// Se llena de abajo arriba, así que llevar el puntero hacia arriba es bajar por la página.
// El progreso se acerca poco a poco al real para que la llama no vaya a saltos.
export function mechaScroll({ alDesplazar } = {}) {
  const pista = element(
    'span',
    'mecha',
    element('span', 'mecha-relleno'),
    element('span', 'mecha-llama', icon('flame', 'h-full w-full')),
  )
  pista.setAttribute('aria-hidden', 'true')
  if (!window.requestAnimationFrame) return pista

  const raiz = document.documentElement
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  let objetivo = 0
  let actual = 0
  let frame = 0
  let arrastrando = false

  raiz.setAttribute('data-mecha', '')

  function pintar() {
    actual = reducir || arrastrando ? objetivo : actual + (objetivo - actual) * 0.18
    if (Math.abs(objetivo - actual) < 0.0005) actual = objetivo
    pista.style.setProperty('--progreso', actual.toFixed(4))
    frame = actual === objetivo ? 0 : requestAnimationFrame(pintar)
  }

  const recorrido = () => raiz.scrollHeight - window.innerHeight

  function leer() {
    if (!pista.isConnected) {
      soltar()
      return
    }
    const total = recorrido()
    pista.toggleAttribute('data-vacia', total <= 0)
    objetivo = total > 0 ? limitar(window.scrollY / total) : 0
    alDesplazar?.(window.scrollY)
    if (!frame) frame = requestAnimationFrame(pintar)
  }

  function irA(event) {
    const { top, height } = pista.getBoundingClientRect()
    const parte = height > 0 ? limitar(1 - (event.clientY - top) / height) : 0
    window.scrollTo({ top: parte * recorrido(), behavior: 'instant' })
  }

  function empezar(event) {
    if (event.button !== 0) return
    event.preventDefault()
    arrastrando = true
    pista.setPointerCapture?.(event.pointerId)
    pista.setAttribute('data-arrastrando', '')
    irA(event)
  }

  function mover(event) {
    if (arrastrando) irA(event)
  }

  function terminar() {
    arrastrando = false
    pista.removeAttribute('data-arrastrando')
  }

  const observer = new MutationObserver(() => {
    if (!pista.isConnected) soltar()
  })

  function soltar() {
    observer.disconnect()
    window.removeEventListener('scroll', leer)
    window.removeEventListener('resize', leer)
    pista.removeEventListener('pointerdown', empezar)
    pista.removeEventListener('pointermove', mover)
    pista.removeEventListener('pointerup', terminar)
    pista.removeEventListener('pointercancel', terminar)
    pista.removeEventListener('lostpointercapture', terminar)
    cancelAnimationFrame(frame)
    frame = 0
    // Si la nueva pantalla también tiene mecha, la barra nativa sigue oculta.
    if (!document.querySelector('.mecha')) raiz.removeAttribute('data-mecha')
  }

  window.addEventListener('scroll', leer, { passive: true })
  window.addEventListener('resize', leer, { passive: true })
  pista.addEventListener('pointerdown', empezar)
  pista.addEventListener('pointermove', mover)
  pista.addEventListener('pointerup', terminar)
  pista.addEventListener('pointercancel', terminar)
  pista.addEventListener('lostpointercapture', terminar)
  observer.observe(document.body, { childList: true, subtree: true })
  requestAnimationFrame(leer)
  return pista
}
