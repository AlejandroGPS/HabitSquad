import { describe, expect, it } from 'vitest'
import { primerEscuadron } from './primerEscuadron.js'

describe('primerEscuadron', () => {
  it('muestra una tarjeta para crear y otra para unirse', () => {
    const vacio = primerEscuadron()

    expect([...vacio.querySelectorAll('h2')].map((titulo) => titulo.textContent)).toEqual([
      'Crea tu escuadrón',
      'Únete con un código',
    ])
    expect(vacio.querySelector('a[href="/escuadrones/nuevo"]').textContent).toBe('Crear un escuadrón')
    expect(vacio.querySelector('a[href="/escuadrones/unirse"]').textContent).toBe('Tengo un código')
  })
})
