import { afterEach, describe, expect, it, vi } from 'vitest'
import { semanaCard } from './semanaCard.js'

const AHORA = new Date(2026, 9, 25, 20, 18)
const MIERCOLES = new Date(2026, 9, 21, 9, 0)

const MIEMBROS = [
  { nombre: 'ale', estado: 'cumplido' },
  { nombre: 'lau', estado: 'pendiente' },
  { nombre: 'carlos' },
]

function dias(card) {
  return [...card.querySelectorAll('thead th[scope="col"]')]
}

function filas(card) {
  return [...card.querySelectorAll('tbody tr')]
}

function casillas(fila) {
  return [...fila.querySelectorAll('td')].map((celda) => ({
    color: celda.querySelector('span').className,
    texto: celda.querySelector('.sr-only').textContent,
  }))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('semanaCard', () => {
  it('muestra la semana de lunes a domingo y resalta hoy', () => {
    const cabecera = dias(semanaCard({ miembros: MIEMBROS, ahora: AHORA }))

    expect(cabecera.map((dia) => dia.querySelector('[aria-hidden="true"]').textContent)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D'])
    expect(cabecera.map((dia) => dia.querySelector('.sr-only').textContent)).toEqual([
      'lunes 19', 'martes 20', 'miércoles 21', 'jueves 22', 'viernes 23', 'sábado 24', 'domingo 25',
    ])
    expect(cabecera.map((dia) => dia.querySelector('[aria-hidden="true"]').classList.contains('bg-accent'))).toEqual([
      false, false, false, false, false, false, true,
    ])
  })

  it('es una tabla con una fila por miembro y su nombre como cabecera de fila', () => {
    const card = semanaCard({ miembros: MIEMBROS, ahora: AHORA })

    expect(card.querySelector('caption').textContent).toBe('Estado de cada miembro esta semana')
    expect(filas(card).map((fila) => fila.querySelector('th[scope="row"]').textContent)).toEqual(['Aale', 'Llau', 'Ccarlos'])
    expect(filas(card).every((fila) => fila.querySelectorAll('td').length === 7)).toBe(true)
  })

  it('colorea el estado de hoy y deja sin prueba los días anteriores sin datos', () => {
    const [ale, lau, carlos] = filas(semanaCard({ miembros: MIEMBROS, ahora: AHORA })).map(casillas)

    expect(ale[6]).toEqual({ color: expect.stringContaining('bg-[#248a3d]'), texto: 'Cumplido' })
    expect(lau[6]).toEqual({ color: expect.stringContaining('bg-[#c93400]'), texto: 'Pendiente' })
    expect(carlos[6]).toEqual({ color: expect.stringContaining('bg-[#e5e5ea]'), texto: 'Sin prueba' })
    expect(ale.slice(0, 6).every(({ texto }) => texto === 'Sin prueba')).toBe(true)
  })

  it('usa el historial de la semana cuando el backend lo trae', () => {
    const [fila] = filas(semanaCard({
      miembros: [{ nombre: 'ale', estado: 'pendiente', semana: [{ estado: 'cumplido' }, { estado: 'no_cumplido' }] }],
      ahora: AHORA,
    }))

    expect(casillas(fila).slice(0, 2)).toEqual([
      { color: expect.stringContaining('bg-[#248a3d]'), texto: 'Cumplido' },
      { color: expect.stringContaining('bg-red'), texto: 'No cumplido' },
    ])
    expect(casillas(fila)[6].texto).toBe('Pendiente')
  })

  it('los días que aún no han llegado quedan en gris y se anuncian como por llegar', () => {
    const [fila] = filas(semanaCard({ miembros: [MIEMBROS[0]], ahora: MIERCOLES }))
    const semana = casillas(fila)

    expect(semana[2].texto).toBe('Cumplido')
    expect(semana.slice(3).every(({ color, texto }) => color.includes('bg-[#f2f2f7]') && texto === 'Por llegar')).toBe(true)
  })

  it('pone la cara de cada miembro al principio de su fila', () => {
    const card = semanaCard({
      miembros: [
        { nombre: 'ale', fotoUrl: 'https://res.cloudinary.com/demo/ale.jpg', estado: 'cumplido' },
        { nombre: 'lau', estado: 'pendiente' },
      ],
      ahora: AHORA,
    })
    const caras = filas(card).map((fila) => fila.querySelector('th > span[title]'))

    expect(caras.map((cara) => cara.title)).toEqual(['ale', 'lau'])
    expect(caras[0].querySelector('img').getAttribute('src')).toBe('https://res.cloudinary.com/demo/ale.jpg')
    expect(caras[1].textContent).toBe('L')
  })

  it('explica los colores con una leyenda', () => {
    const card = semanaCard({ miembros: MIEMBROS, ahora: AHORA })

    expect(card.lastElementChild.textContent).toBe('CumplidoPendienteNo cumplido')
  })

  it('solo se ve en web por defecto y usa hoy si no se pasa la fecha', () => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
    const card = semanaCard()

    expect(card.classList.contains('hidden')).toBe(true)
    expect(card.classList.contains('lg:flex')).toBe(true)
    expect(dias(card)[6].querySelector('.sr-only').textContent).toBe('domingo 25')
    expect(filas(card)).toHaveLength(0)
  })
})
