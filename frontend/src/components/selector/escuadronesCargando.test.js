import { describe, expect, it } from 'vitest'
import { escuadronesCargando } from './escuadronesCargando.js'

describe('escuadronesCargando', () => {
  it('pinta tres tarjetas vacías ocultas a los lectores de pantalla', () => {
    const lista = escuadronesCargando()

    expect(lista.getAttribute('aria-hidden')).toBe('true')
    expect(lista.children).toHaveLength(3)
    expect(lista.textContent).toBe('')
  })

  it('acepta otra cantidad', () => {
    expect(escuadronesCargando({ cantidad: 2 }).children).toHaveLength(2)
  })
})
