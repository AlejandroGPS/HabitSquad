import { describe, expect, it, vi } from 'vitest'
import { miembrosCard } from './miembrosCard.js'

describe('miembrosCard', () => {
  it('lista a los miembros y cuenta las plazas ocupadas', () => {
    const card = miembrosCard({
      miembros: [{ nombre: 'Carlos', estado: 'cumplido' }, { nombre: 'Laura' }],
      plazas: 4,
    })

    expect(card.querySelector('h2').textContent).toBe('Miembros2 de 4')
    expect(card.querySelectorAll('li')).toHaveLength(2)
  })

  it('pasa las acciones a cada miembro', () => {
    const onVotar = vi.fn()
    const card = miembrosCard({ miembros: [{ nombre: 'Laura', estado: 'pendiente' }], onVotar })

    card.querySelector('button').click()
    expect(onVotar).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Laura' }))
  })

  it('usa 5 plazas y ninguna persona por defecto', () => {
    const card = miembrosCard()

    expect(card.querySelector('h2').textContent).toBe('Miembros0 de 5')
    expect(card.querySelector('li')).toBeNull()
  })
})
