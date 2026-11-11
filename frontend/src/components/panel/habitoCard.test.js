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
})
