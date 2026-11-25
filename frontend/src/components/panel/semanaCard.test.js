import { afterEach, describe, expect, it, vi } from 'vitest'
import { semanaCard } from './semanaCard.js'

const AHORA = new Date(2026, 9, 25, 20, 18)

const MIEMBROS = [{ estado: 'cumplido' }, { estado: 'pendiente' }, {}]

function filas(card) {
  return [...card.querySelectorAll('.w-11')]
}

afterEach(() => {
  vi.useRealTimers()
})

describe('semanaCard', () => {
  it('muestra la semana de lunes a domingo y resalta hoy', () => {
    const dias = filas(semanaCard({ miembros: MIEMBROS, ahora: AHORA }))

    expect(dias.map((dia) => dia.textContent)).toEqual([
      'L 19', 'M 20', 'X 21', 'J 22', 'V 23', 'S 24', 'D 25',
    ])
    expect(dias.map((dia) => dia.classList.contains('text-accent'))).toEqual([
      false, false, false, false, false, false, true,
    ])
  })

  it('colorea el estado de cada miembro solo en el día de hoy', () => {
    const dias = filas(semanaCard({ miembros: MIEMBROS, ahora: AHORA }))
    const colores = (dia) => [...dia.nextSibling.children].map((barra) => barra.className)

    expect(colores(dias[6])).toEqual([
      expect.stringContaining('bg-[#248a3d]'),
      expect.stringContaining('bg-[#c93400]'),
      expect.stringContaining('bg-[#e5e5ea]'),
    ])
    expect(colores(dias[0]).every((color) => color.includes('bg-[#e5e5ea]'))).toBe(true)
  })

  it('trata como sin prueba un estado que no conoce', () => {
    const dias = filas(semanaCard({ miembros: [{ estado: 'desconocido', semana: [{ estado: 'otro' }] }], ahora: AHORA }))
    const color = (dia) => dia.nextSibling.firstElementChild.className

    expect(color(dias[0])).toContain('bg-[#e5e5ea]')
    expect(color(dias[6])).toContain('bg-[#e5e5ea]')
  })

  it('pone encima de cada columna de barras la cara del miembro al que corresponde', () => {
    const card = semanaCard({
      miembros: [
        { nombre: 'ale', fotoUrl: 'https://res.cloudinary.com/demo/ale.jpg', estado: 'cumplido' },
        { nombre: 'lau', estado: 'pendiente' },
      ],
      ahora: AHORA,
    })
    const caras = [...card.querySelectorAll('.pl-14 > span > span')]

    expect(caras.map((cara) => cara.title)).toEqual(['ale', 'lau'])
    expect(caras[0].querySelector('img').getAttribute('src')).toBe('https://res.cloudinary.com/demo/ale.jpg')
    expect(caras[1].textContent).toBe('L')
    expect(filas(card)[6].nextSibling.children).toHaveLength(caras.length)
  })

  it('solo se ve en web por defecto y usa hoy si no se pasa la fecha', () => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
    const card = semanaCard()

    expect(card.classList.contains('hidden')).toBe(true)
    expect(card.classList.contains('lg:flex')).toBe(true)
    expect(filas(card)[6].textContent).toBe('D 25')
    expect(filas(card)[6].nextSibling.children).toHaveLength(0)
    expect(card.querySelector('.pl-14')).toBeNull()
  })
})
