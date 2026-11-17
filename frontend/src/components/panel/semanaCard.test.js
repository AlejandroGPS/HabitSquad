import { afterEach, describe, expect, it, vi } from 'vitest'
import { semanaCard, semanaDe } from './semanaCard.js'

const MIERCOLES = new Date(2026, 9, 21, 20, 18)
const DOMINGO = new Date(2026, 9, 25, 20, 18)

const MIEMBROS = [
  { nombre: 'Ana', esUsuario: true, estado: 'cumplido' },
  { nombre: 'Laura', estado: 'pendiente' },
  { nombre: 'Sergio' },
]

function dias(card) {
  return [...card.querySelectorAll('.items-end .grid-cols-7 > span')]
}

function filas(card) {
  return [...card.querySelectorAll('[data-barras]')].map((celdas) => ({
    nombre: celdas.previousSibling.textContent,
    celdas: [...celdas.children],
  }))
}

const color = (celda) => celda.className.split(' ').at(-1)

afterEach(() => {
  vi.useRealTimers()
})

describe('semanaDe', () => {
  it('da el estado de cada día y marca como futuros los que aún no han llegado', () => {
    const semana = semanaDe({ estado: 'pendiente', semana: [{ estado: 'cumplido' }] }, MIERCOLES)

    expect(semana.map(({ estado }) => estado)).toEqual([
      'cumplido', 'sin-prueba', 'pendiente', 'sin-prueba', 'sin-prueba', 'sin-prueba', 'sin-prueba',
    ])
    expect(semana.map(({ futuro }) => futuro)).toEqual([false, false, false, true, true, true, true])
  })
})

describe('semanaCard', () => {
  it('muestra la semana de lunes a domingo y resalta hoy', () => {
    const cabecera = dias(semanaCard({ miembros: MIEMBROS, ahora: DOMINGO }))

    expect(cabecera.map((dia) => dia.textContent)).toEqual(['L19', 'M20', 'X21', 'J22', 'V23', 'S24', 'D25'])
    expect(cabecera.map((dia) => dia.classList.contains('bg-accent'))).toEqual([
      false, false, false, false, false, false, true,
    ])
  })

  it('pone una fila por miembro con "Tú" para el usuario y colorea hoy con su estado', () => {
    const [ana, laura, sergio] = filas(semanaCard({ miembros: MIEMBROS, ahora: DOMINGO }))

    expect([ana.nombre, laura.nombre, sergio.nombre]).toEqual(['Tú', 'Laura', 'Sergio'])
    expect([ana, laura, sergio].map(({ celdas }) => color(celdas[6]))).toEqual([
      'bg-[#248a3d]', 'bg-[#c93400]', 'bg-[#e5e5ea]',
    ])
    expect(color(ana.celdas[0])).toBe('bg-[#e5e5ea]')
    expect(laura.celdas[6].title).toBe('Laura, D 25: Pendiente')
  })

  it('deja punteados los días que aún no han llegado', () => {
    const [ana] = filas(semanaCard({ miembros: MIEMBROS, ahora: MIERCOLES }))

    expect(ana.celdas.map((celda) => celda.classList.contains('border-dashed'))).toEqual([
      false, false, false, true, true, true, true,
    ])
    expect(ana.celdas[3].title).toBe('')
  })

  it('explica los colores con una leyenda', () => {
    const leyenda = [...semanaCard({ ahora: DOMINGO }).querySelectorAll('li')].map((item) => item.textContent)

    expect(leyenda).toEqual(['Cumplido', 'Pendiente', 'No cumplido', 'Sin prueba'])
  })

  it('solo se ve en web, a dos columnas, y usa hoy si no se pasa la fecha', () => {
    vi.useFakeTimers()
    vi.setSystemTime(DOMINGO)
    const card = semanaCard()

    expect(card.classList.contains('hidden')).toBe(true)
    expect(card.classList.contains('lg:flex')).toBe(true)
    expect(card.classList.contains('lg:col-span-2')).toBe(true)
    expect(dias(card)[6].textContent).toBe('D25')
    expect(filas(card)).toHaveLength(0)
  })
})
