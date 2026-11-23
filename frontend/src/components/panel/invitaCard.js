import { card, cardNote, pillButtonClass } from '../card.js'
import { button, element } from '../dom.js'
import { icon } from '../icons.js'

export function plazasLibres(libres) {
  if (libres <= 0) return 'Escuadrón completo'
  return libres === 1 ? 'Queda 1 plaza' : `Quedan ${libres} plazas`
}

export function invitaCard({ codigo = '', libres = 0, className = 'hidden lg:flex' } = {}) {
  const status = element('p', 'hidden w-full text-[0.8125rem] font-bold text-ink-muted')
  status.setAttribute('role', 'status')

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo)
      status.textContent = 'Código copiado.'
    } catch {
      status.textContent = 'No se ha podido copiar. Cópialo a mano.'
    }
    status.classList.remove('hidden')
  }

  return card(
    `${className} flex-wrap items-center gap-x-4 gap-y-3`,
    element('span', 'grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e6f2ff] text-[#0066cc]', icon('users')),
    element(
      'div',
      'min-w-[11rem] flex-1',
      element('p', 'font-black', 'Invita a tu escuadrón'),
      cardNote(plazasLibres(libres)),
    ),
    element(
      'div',
      'flex items-center gap-2',
      element('p', 'rounded-xl bg-[#f2f2f7] px-3 py-2 text-[1.25rem] leading-tight font-black tracking-[0.2em] select-all', codigo),
      button(pillButtonClass, copiar, icon('copy', 'h-4 w-4 shrink-0'), 'Copiar'),
    ),
    status,
  )
}
