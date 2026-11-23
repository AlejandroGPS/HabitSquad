import { card, cardChip, cardLabel, cardNote, pillButtonClass } from '../card.js'
import { button, element } from '../dom.js'
import { icon } from '../icons.js'

export function plazasLibres(libres) {
  if (libres <= 0) return 'Escuadrón completo'
  return libres === 1 ? 'Queda 1 plaza' : `Quedan ${libres} plazas`
}

export function invitaCard({ codigo = '', libres = 0, className = 'hidden lg:flex' } = {}) {
  const status = element('p', 'mt-2 hidden text-[0.8125rem] font-bold text-ink-muted')
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

  const nota = cardNote(plazasLibres(libres))
  nota.classList.add('mb-3')

  return card(
    `${className} flex-col`,
    cardChip('users', 'bg-[#e6f2ff] text-[#0066cc]'),
    cardLabel('Invita'),
    element('p', 'mt-1 text-[1.5rem] font-black tracking-[0.2em] select-all', codigo),
    nota,
    button(`mt-auto self-start ${pillButtonClass}`, copiar, icon('copy', 'h-4 w-4 shrink-0'), 'Copiar'),
    status,
  )
}
