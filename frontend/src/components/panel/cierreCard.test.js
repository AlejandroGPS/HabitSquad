import { afterEach, describe, expect, it, vi } from 'vitest'
import { cierreCard } from './cierreCard.js'

const AHORA = new Date(2026, 9, 25, 20, 18)

afterEach(() => {
  vi.useRealTimers()
})

describe('cierreCard', () => {
  it('muestra la hora de cierre y lo que queda', () => {
    expect(cierreCard({ cierre: '23:59', ahora: AHORA }).textContent).toBe('Cierra23:59Quedan 03:41 h')
  })

  it('avisa cuando el día ya ha cerrado', () => {
    expect(cierreCard({ cierre: '20:00', ahora: AHORA }).textContent).toBe('Cierra20:00El día ya ha cerrado')
  })

  it('cierra a las 23:59 de hoy por defecto', () => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)

    expect(cierreCard().textContent).toBe('Cierra23:59Quedan 03:41 h')
  })
})
