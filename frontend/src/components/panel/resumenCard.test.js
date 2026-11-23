import { afterEach, describe, expect, it, vi } from 'vitest'
import { resumenCard } from './resumenCard.js'

const AHORA = new Date(2026, 9, 25, 20, 18)

const MIEMBROS = [{ estado: 'cumplido' }, { estado: 'pendiente' }, {}]

function barras(card) {
  return [...card.querySelector('[data-barras]').children].map((barra) => barra.className.split(' ').at(-1))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('resumenCard', () => {
  it('junta la racha, los cumplidos de hoy y el cierre en una sola tarjeta', () => {
    expect(resumenCard({ racha: 12, miembros: MIEMBROS, ahora: AHORA }).textContent).toBe(
      'Racha' + '12días seguidos' + 'Hoy 1 de 3 ha cumplido' + 'Cierra a las 23:59' + 'Quedan 03:41 h para subir la prueba',
    )
  })

  it('concuerda los textos con el número', () => {
    const card = resumenCard({ racha: 1, miembros: [{ estado: 'cumplido' }, { estado: 'cumplido' }], ahora: AHORA })

    expect(card.textContent).toContain('1día seguido')
    expect(card.textContent).toContain('2 de 2 han cumplido')
  })

  it('pinta una barra por miembro y solo rellena las de quien ha cumplido', () => {
    expect(barras(resumenCard({ miembros: MIEMBROS, ahora: AHORA }))).toEqual(['bg-white', 'bg-white/25', 'bg-white/25'])
  })

  it('usa la hora de cierre del escuadrón y avisa cuando el día ya ha cerrado', () => {
    const card = resumenCard({ miembros: MIEMBROS, cierre: '20:00', ahora: AHORA })

    expect(card.textContent).toContain('Cierra a las 20:00')
    expect(card.textContent).toContain('El día ya ha cerrado')
  })

  it('lleva la mascota como decoración', () => {
    const mascota = resumenCard({ ahora: AHORA }).querySelector('img')

    expect(mascota.getAttribute('alt')).toBe('')
    expect(mascota.classList.contains('motion-safe:animate-bob')).toBe(true)
  })

  it('usa valores por defecto sin datos', () => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
    const card = resumenCard({ className: 'lg:col-span-2' })

    expect(card.textContent).toBe('Racha0días seguidosHoy 0 de 0 han cumplidoCierra a las 23:59Quedan 03:41 h para subir la prueba')
    expect(card.classList.contains('lg:col-span-2')).toBe(true)
    expect(barras(card)).toEqual([])
  })
})
