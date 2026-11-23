import { describe, expect, it, vi } from 'vitest'
import { habitoCard } from './habitoCard.js'

function buttonByText(root, text) {
  return [...root.querySelectorAll('button')].find((button) => button.textContent === text)
}

describe('habitoCard', () => {
  it('pide subir la foto antes del cierre', () => {
    const onSubirPrueba = vi.fn()
    const card = habitoCard({ habito: 'Leer un libro', cierre: '22:00', onSubirPrueba })

    expect(card.textContent).toContain('Leer un libroSube una foto antes de las 22:00')
    buttonByText(card, 'Subir foto de prueba').click()
    expect(onSubirPrueba).toHaveBeenCalledOnce()
  })

  it('desactiva el botón si no hay acción para subir la foto', () => {
    const card = habitoCard({ habito: 'Leer' })

    expect(card.textContent).toContain('antes de las 23:59')
    expect(buttonByText(card, 'Subir foto de prueba').disabled).toBe(true)
  })

  it('invita a elegir hábito si el usuario aún no tiene', () => {
    const onElegirHabito = vi.fn()
    const card = habitoCard({ onElegirHabito })

    expect(card.textContent).toContain('Aún no has elegido tu hábito')
    expect(buttonByText(card, 'Subir foto de prueba')).toBeUndefined()
    buttonByText(card, 'Elegir mi hábito').click()
    expect(onElegirHabito).toHaveBeenCalledOnce()
  })

  it('ocupa dos columnas por defecto', () => {
    expect(habitoCard().classList.contains('col-span-2')).toBe(true)
  })

  it('sin usuario no pinta la cabecera con su cara', () => {
    expect(habitoCard({ habito: 'Leer' }).querySelector('.rounded-full.ring-2')).toBeNull()
  })

  it('encabeza la tarjeta con la foto, el nickname y el estado de hoy del usuario', () => {
    const card = habitoCard({
      habito: 'Leer',
      usuario: { nombre: 'ale', fotoUrl: 'https://res.cloudinary.com/demo/perfiles/ale.jpg', estado: 'pendiente' },
    })
    const foto = card.querySelector('img')

    expect(foto.getAttribute('src')).toBe('https://res.cloudinary.com/demo/perfiles/ale.jpg')
    expect(foto.getAttribute('alt')).toBe('')
    expect(card.textContent).toContain('aleHoy: PendienteMi hábitoLeer')
    expect(card.querySelector('.truncate').title).toBe('ale')
  })

  it.each([
    [undefined, 'Hoy: Sin prueba'],
    ['cumplido', 'Hoy: Cumplido'],
    ['no_cumplido', 'Hoy: No cumplido'],
  ])('escribe el estado %s del usuario', (estado, texto) => {
    expect(habitoCard({ usuario: { nombre: 'ale', estado } }).textContent).toContain(texto)
  })

  it('sin foto muestra las iniciales del nickname y vuelve a ellas si la foto falla', () => {
    expect(habitoCard({ usuario: { nombre: 'lau' } }).querySelector('.ring-2').textContent).toBe('L')

    const card = habitoCard({ usuario: { nombre: 'ale', fotoUrl: 'https://res.cloudinary.com/demo/roto.jpg' } })
    card.querySelector('img').dispatchEvent(new Event('error'))

    expect(card.querySelector('img')).toBeNull()
    expect(card.querySelector('.ring-2').textContent).toBe('A')
  })
})
