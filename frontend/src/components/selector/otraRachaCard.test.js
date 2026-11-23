import { describe, expect, it } from 'vitest'
import { otraRachaCard } from './otraRachaCard.js'

describe('otraRachaCard', () => {
  it('ofrece crear un escuadrón o unirse con un código', () => {
    const card = otraRachaCard()
    const crear = card.querySelector('a[href="/escuadrones/nuevo"]')
    const unirse = card.querySelector('a[href="/escuadrones/unirse"]')

    expect(card.querySelector('h2').textContent).toBe('¿Una racha más?')
    expect(crear.textContent).toBe('Crear un escuadrón')
    expect(unirse.textContent).toBe('Tengo un código')
    expect([crear, unirse].every((link) => link.hasAttribute('data-link'))).toBe(true)
  })
})
