import { afterEach, describe, expect, it, vi } from 'vitest'
import { hoyCard } from './hoyCard.js'

const AHORA = new Date(2026, 9, 25, 20, 18)

const MIEMBROS = [
  { nombre: 'Ana', esUsuario: true, estado: 'cumplido' },
  { nombre: 'Laura', estado: 'pendiente' },
  { nombre: 'Sergio' },
]

function textos(card) {
  return [...card.querySelectorAll('p')].map((parrafo) => parrafo.textContent)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('hoyCard', () => {
  it('cuenta quién ha cumplido y nombra a los que faltan', () => {
    const card = hoyCard({ miembros: [MIEMBROS[1], MIEMBROS[0], MIEMBROS[2]], ahora: AHORA })

    expect(textos(card)).toEqual(expect.arrayContaining(['1/3', 'Hoy', '1 de 3 han cumplido', 'Faltan 2: Laura y Sergio.']))
  })

  it('llena el anillo con la parte que ha cumplido', () => {
    const progreso = hoyCard({ miembros: MIEMBROS, ahora: AHORA }).querySelector('[data-anillo]')

    expect(progreso.getAttribute('stroke-dasharray')).toBe('33.3 100')
  })

  it('se dirige al usuario cuando le falta a él', () => {
    const card = hoyCard({ miembros: [{ nombre: 'Ana', esUsuario: true }, { nombre: 'Laura' }], ahora: AHORA })

    expect(textos(card)).toEqual(expect.arrayContaining(['Nadie ha cumplido aún', 'Faltan 2: tú y Laura.']))
    expect(card.querySelector('[data-anillo]')).toBeNull()
  })

  it('celebra cuando todos han cumplido y usa el singular si falta uno', () => {
    const todos = hoyCard({ miembros: [{ estado: 'cumplido' }, { estado: 'cumplido' }], ahora: AHORA })
    const uno = hoyCard({ miembros: [{ estado: 'cumplido' }, { nombre: 'Laura' }], ahora: AHORA })

    expect(textos(todos)).toEqual(expect.arrayContaining(['2/2', '¡Todos han cumplido hoy!']))
    expect(textos(uno)).toContain('Falta 1: Laura.')
  })

  it('sin miembros invita a traer a alguien', () => {
    expect(textos(hoyCard({ ahora: AHORA }))).toEqual(expect.arrayContaining(['0/0', 'Aún no hay nadie en el escuadrón']))
  })

  it('muestra lo que queda hasta el cierre y avisa cuando falta menos de una hora', () => {
    const valor = (ahora, cierre) => textos(hoyCard({ ahora, cierre })).at(-2)

    expect(valor(AHORA)).toBe('3 h 41 min')
    expect(textos(hoyCard({ ahora: AHORA }))).toEqual(expect.arrayContaining(['Cierra en', 'a las 23:59']))
    expect(valor(AHORA, '20:00')).toBe('Cerrado')

    const casi = hoyCard({ ahora: new Date(2026, 9, 25, 23, 10) })
    const urgente = [...casi.querySelectorAll('p')].at(-2)
    expect(urgente.textContent).toBe('49 min')
    expect(urgente.classList.contains('text-[#c93400]')).toBe(true)
    expect([...hoyCard({ ahora: AHORA }).querySelectorAll('p')].at(-2).classList.contains('text-[#c93400]')).toBe(false)
  })

  it('con un reloj, la cuenta atrás avanza sola mientras la tarjeta está en pantalla', () => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
    const card = hoyCard({ ahora: () => new Date() })
    document.body.replaceChildren(card)

    vi.advanceTimersByTime(2 * 60_000)
    expect(textos(card).at(-2)).toBe('3 h 39 min')

    card.remove()
    vi.advanceTimersByTime(30_000)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('con una fecha fija no deja nada en marcha', () => {
    vi.useFakeTimers()
    hoyCard({ ahora: AHORA })

    expect(vi.getTimerCount()).toBe(0)
  })

  it('ocupa todo el ancho en móvil y tres columnas en web', () => {
    const card = hoyCard({ ahora: AHORA })

    expect(card.classList.contains('col-span-2')).toBe(true)
    expect(card.classList.contains('lg:col-span-3')).toBe(true)
  })
})
