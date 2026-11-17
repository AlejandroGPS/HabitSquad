import { describe, expect, it } from 'vitest'
import { minutosRestantes, semanaActual, tiempoRestante } from './tiempo.js'

const AHORA = new Date(2026, 9, 25, 20, 18)

describe('minutosRestantes', () => {
  it('cuenta los minutos hasta el cierre, redondeando hacia arriba', () => {
    expect(minutosRestantes(AHORA, '23:59')).toBe(221)
    expect(minutosRestantes(new Date(2026, 9, 25, 23, 58, 30), '23:59')).toBe(1)
  })

  it('devuelve null si ya ha pasado la hora de cierre', () => {
    expect(minutosRestantes(new Date(2026, 9, 25, 23, 59), '23:59')).toBeNull()
  })
})

describe('tiempoRestante', () => {
  it('da las horas y minutos que faltan hasta el cierre', () => {
    expect(tiempoRestante(AHORA, '23:59')).toBe('03:41 h')
    expect(tiempoRestante(new Date(2026, 9, 25, 23, 58, 30), '23:59')).toBe('00:01 h')
  })

  it('devuelve null si ya ha pasado la hora de cierre', () => {
    expect(tiempoRestante(new Date(2026, 9, 25, 23, 59), '23:59')).toBeNull()
    expect(tiempoRestante(AHORA, '20:00')).toBeNull()
  })
})

describe('semanaActual', () => {
  it('va de lunes a domingo y marca hoy', () => {
    const semana = semanaActual(AHORA)

    expect(semana.map(({ letra, numero }) => `${letra} ${numero}`)).toEqual([
      'L 19', 'M 20', 'X 21', 'J 22', 'V 23', 'S 24', 'D 25',
    ])
    expect(semana.map(({ hoy }) => hoy)).toEqual([false, false, false, false, false, false, true])
  })

  it('empieza el mismo día si hoy es lunes', () => {
    const [lunes] = semanaActual(new Date(2026, 9, 26, 9, 0))

    expect(lunes).toEqual({ letra: 'L', numero: 26, hoy: true })
  })
})
