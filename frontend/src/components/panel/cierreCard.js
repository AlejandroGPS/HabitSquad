import { minutosRestantes, tiempoRestante } from '../../tiempo.js'
import { card, cardChip, cardLabel, cardNote, cardValue } from '../card.js'

const URGENTE = 'text-[#c93400]'

// Si ahora es una función, la cuenta atrás se repinta sola mientras la tarjeta siga en pantalla.
export function cierreCard({ cierre = '23:59', ahora = new Date() } = {}) {
  const reloj = typeof ahora === 'function' ? ahora : () => ahora
  const nota = cardNote('')

  function pintar() {
    const momento = reloj()
    const minutos = minutosRestantes(momento, cierre)
    const urgente = minutos !== null && minutos < 60
    nota.textContent = minutos === null ? 'El día ya ha cerrado' : `Quedan ${tiempoRestante(momento, cierre)}`
    nota.classList.toggle(URGENTE, urgente)
    nota.classList.toggle('text-ink-muted', !urgente)
  }

  pintar()
  const tarjeta = card(
    '',
    cardChip('clock', 'bg-[#e6f2ff] text-[#0066cc]'),
    cardLabel('Cierra'),
    cardValue(cierre),
    nota,
  )
  if (typeof ahora === 'function') {
    const temporizador = setInterval(() => {
      if (tarjeta.isConnected) pintar()
      else clearInterval(temporizador)
    }, 30_000)
  }
  return tarjeta
}
