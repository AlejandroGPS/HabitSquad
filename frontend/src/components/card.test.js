import { describe, expect, it } from 'vitest'
import { card, cardChip, cardLabel, cardNote, cardValue, progressBars } from './card.js'

describe('card', () => {
  it('es una sección blanca con las clases extra', () => {
    const node = card('col-span-2', 'Contenido')

    expect(node.tagName).toBe('SECTION')
    expect(node.classList.contains('bg-white')).toBe(true)
    expect(node.classList.contains('col-span-2')).toBe(true)
    expect(node.textContent).toBe('Contenido')
  })

  it('funciona sin clases extra', () => {
    expect(card().className).not.toMatch(/\s$/)
  })
})

describe('cardLabel', () => {
  it('pone el texto en gris por defecto y sin icono', () => {
    const label = cardLabel('Hoy')

    expect(label.textContent).toBe('Hoy')
    expect(label.classList.contains('text-ink-muted')).toBe(true)
    expect(label.querySelector('svg')).toBeNull()
  })

  it('acepta icono y color', () => {
    const label = cardLabel('Racha', { icon: 'flame', className: 'text-white' })

    expect(label.querySelector('svg')).not.toBeNull()
    expect(label.classList.contains('text-white')).toBe(true)
  })
})

it('cardChip pinta el icono en la esquina', () => {
  const chip = cardChip('clock', 'bg-sky')

  expect(chip.querySelector('svg')).not.toBeNull()
  expect(chip.classList.contains('bg-sky')).toBe(true)
})

it('cardValue y cardNote muestran el texto', () => {
  expect(cardValue('23:59').textContent).toBe('23:59')
  expect(cardNote('Quedan 2 plazas').textContent).toBe('Quedan 2 plazas')
})

it('progressBars crea una barra por color', () => {
  const bars = progressBars(['bg-a', 'bg-b'], 'flex-1')

  expect([...bars.children].map((bar) => bar.classList.contains('flex-1'))).toEqual([true, true])
  expect(bars.lastChild.classList.contains('bg-b')).toBe(true)
  expect(bars.classList.contains('flex-1')).toBe(true)
})
