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

  it('enseña la semana del usuario: hecho, fallado, sin prueba y lo que aún no ha llegado', () => {
    const semana = [
      { letra: 'L', numero: 19, estado: 'cumplido' },
      { letra: 'M', numero: 20, estado: 'no_cumplido' },
      { letra: 'X', numero: 21, estado: 'sin-prueba', hoy: true },
      { letra: 'J', numero: 22, futuro: true },
    ]
    const card = habitoCard({ habito: 'Leer', semana })
    const fila = card.querySelector('[role="img"]')
    const puntos = [...fila.children].map((dia) => dia.lastChild)

    expect(fila.getAttribute('aria-label')).toBe('Tu semana: L 19 cumplido, M 20 no cumplido, X 21 sin prueba')
    expect(fila.textContent).toBe('LMXJ')
    expect(puntos[0].classList.contains('bg-white')).toBe(true)
    expect(puntos[0].querySelector('svg')).not.toBeNull()
    expect(puntos[2].classList.contains('ring-2')).toBe(true)
    expect(puntos[3].classList.contains('border-dashed')).toBe(true)
  })

  it('no enseña la semana si el usuario aún no tiene hábito', () => {
    expect(habitoCard({ semana: [{ letra: 'L', numero: 19, estado: 'cumplido' }] }).querySelector('[role="img"]')).toBeNull()
    expect(habitoCard({ habito: 'Leer', semana: [] }).textContent).not.toContain('Tu semana')
  })

  it('ocupa dos columnas por defecto', () => {
    expect(habitoCard().classList.contains('col-span-2')).toBe(true)
  })
})
