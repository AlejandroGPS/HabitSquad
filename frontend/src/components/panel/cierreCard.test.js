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

  it('resalta lo que queda cuando falta menos de una hora', () => {
    const nota = (ahora) => cierreCard({ ahora }).querySelector('p:last-child')

    expect(nota(new Date(2026, 9, 25, 23, 10)).textContent).toBe('Quedan 00:49 h')
    expect(nota(new Date(2026, 9, 25, 23, 10)).classList.contains('text-[#c93400]')).toBe(true)
    expect(nota(new Date(2026, 9, 25, 23, 10)).classList.contains('text-ink-muted')).toBe(false)
    expect(nota(new Date(2026, 9, 25, 22, 59)).classList.contains('text-[#c93400]')).toBe(false)
    expect(nota(new Date(2026, 9, 25, 22, 59)).classList.contains('text-ink-muted')).toBe(true)
  })

  it('con un reloj, la cuenta atrás avanza sola mientras la tarjeta está en pantalla', () => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
    const card = cierreCard({ ahora: () => new Date() })
    document.body.replaceChildren(card)

    vi.advanceTimersByTime(2 * 60_000)
    expect(card.textContent).toBe('Cierra23:59Quedan 03:39 h')

    card.remove()
    vi.advanceTimersByTime(30_000)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('con una fecha fija no deja nada en marcha', () => {
    vi.useFakeTimers()
    cierreCard({ ahora: AHORA })

    expect(vi.getTimerCount()).toBe(0)
  })
})
