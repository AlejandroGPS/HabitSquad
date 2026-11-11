import { describe, expect, it } from 'vitest'
import { hoyCard } from './hoyCard.js'

describe('hoyCard', () => {
  it('cuenta los miembros que han cumplido y colorea sus barras', () => {
    const card = hoyCard({
      miembros: [{ estado: 'cumplido' }, { estado: 'pendiente' }, {}],
    })
    const barras = [...card.querySelectorAll('.flex-1')].map((barra) =>
      barra.classList.contains('bg-[#248a3d]'),
    )

    expect(card.textContent).toBe('Hoy1/3')
    expect(barras).toEqual([true, false, false])
  })

  it('muestra 0/0 sin miembros', () => {
    expect(hoyCard().textContent).toBe('Hoy0/0')
  })
})
