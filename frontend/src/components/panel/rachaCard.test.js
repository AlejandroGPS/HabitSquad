import { describe, expect, it } from 'vitest'
import { rachaCard } from './rachaCard.js'

describe('rachaCard', () => {
  it('muestra los días seguidos y la mascota decorativa', () => {
    const card = rachaCard({ racha: 12 })

    expect(card.textContent).toBe('Racha12días seguidos')
    expect(card.querySelector('img').alt).toBe('')
    expect(card.classList.contains('row-span-2')).toBe(true)
  })

  it('usa el singular con un día', () => {
    expect(rachaCard({ racha: 1 }).textContent).toContain('1día seguido')
  })

  it('empieza en 0 sin datos y acepta otra colocación', () => {
    const card = rachaCard({ className: 'col-span-2' })

    expect(rachaCard().textContent).toContain('0días seguidos')
    expect(card.classList.contains('col-span-2')).toBe(true)
  })
})
