import { card, cardChip, cardLabel, cardNote, pillButtonClass } from '../card.js'
import { button, element } from '../dom.js'
import { icon } from '../icons.js'

export function plazasLibres(libres) {
  if (libres <= 0) return 'Escuadrón completo'
  return libres === 1 ? 'Queda 1 plaza' : `Quedan ${libres} plazas`
}

function enlaceInvitacion(codigo) {
  return new URL(`/escuadrones/unirse?codigo=${encodeURIComponent(codigo)}`, window.location.origin).href
}

export function invitaCard({ codigo = '', libres = 0, nombre, className = 'col-span-2 flex lg:col-span-1' } = {}) {
  const status = element('p', 'mt-2 hidden text-[0.8125rem] font-bold text-ink-muted')
  status.setAttribute('role', 'status')

  function avisar(texto) {
    status.textContent = texto
    status.classList.remove('hidden')
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo)
      avisar('Código copiado.')
    } catch {
      avisar('No se ha podido copiar. Cópialo a mano.')
    }
  }

  async function compartir() {
    try {
      await navigator.share({
        title: 'HabitSquad',
        text: `Únete a ${nombre ? `«${nombre}»` : 'mi escuadrón'} en HabitSquad con el código ${codigo}.`,
        url: enlaceInvitacion(codigo),
      })
    } catch (error) {
      if (error?.name !== 'AbortError') avisar('No se ha podido compartir. Copia el código.')
    }
  }

  const nota = cardNote(plazasLibres(libres))
  nota.classList.add('mb-3')
  // El menú de compartir del sistema es cosa del móvil; en web basta con copiar.
  const puedeCompartir = libres > 0 && typeof navigator.share === 'function'

  return card(
    `${className} flex-col`,
    cardChip('users', 'bg-[#e6f2ff] text-[#0066cc]'),
    cardLabel('Invita'),
    element('p', 'mt-1 text-[1.5rem] font-black tracking-[0.2em] select-all', codigo),
    nota,
    element(
      'div',
      'mt-auto flex flex-wrap gap-2',
      button(pillButtonClass, copiar, icon('copy', 'h-4 w-4 shrink-0'), 'Copiar'),
      puedeCompartir && button(`${pillButtonClass} lg:hidden`, compartir, icon('share', 'h-4 w-4 shrink-0'), 'Compartir'),
    ),
    status,
  )
}
