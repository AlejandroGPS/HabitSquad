import { tiempoRestante } from '../../tiempo.js'
import { card, cardChip, cardLabel, cardNote, cardValue } from '../card.js'

export function cierreCard({ cierre = '23:59', ahora = new Date() } = {}) {
  const restante = tiempoRestante(ahora, cierre)
  return card(
    '',
    cardChip('clock', 'bg-[#e6f2ff] text-[#0066cc]'),
    cardLabel('Cierra'),
    cardValue(cierre),
    cardNote(restante ? `Quedan ${restante}` : 'El día ya ha cerrado'),
  )
}
