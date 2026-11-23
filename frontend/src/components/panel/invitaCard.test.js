import { afterEach, describe, expect, it, vi } from 'vitest'
import { invitaCard, plazasLibres } from './invitaCard.js'

function copiar(card) {
  ;[...card.querySelectorAll('button')].find((button) => button.textContent === 'Copiar').click()
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('plazasLibres', () => {
  it('cuenta las plazas que quedan', () => {
    expect(plazasLibres(2)).toBe('Quedan 2 plazas')
    expect(plazasLibres(1)).toBe('Queda 1 plaza')
    expect(plazasLibres(0)).toBe('Escuadrón completo')
  })
})

describe('invitaCard', () => {
  it('muestra el código y las plazas libres', () => {
    expect(invitaCard({ codigo: 'K7P2QX', libres: 2 }).textContent).toBe('InvitaK7P2QXQuedan 2 plazasCopiar')
  })

  it('copia el código al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const card = invitaCard({ codigo: 'K7P2QX', libres: 2 })
    const status = card.querySelector('[role="status"]')

    expect(status.classList.contains('hidden')).toBe(true)
    copiar(card)

    await vi.waitFor(() => expect(status.textContent).toBe('Código copiado.'))
    expect(writeText).toHaveBeenCalledWith('K7P2QX')
    expect(status.classList.contains('hidden')).toBe(false)
  })

  it('avisa si no se puede copiar', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error()) } })
    const card = invitaCard({ codigo: 'K7P2QX', libres: 2 })

    copiar(card)

    await vi.waitFor(() =>
      expect(card.querySelector('[role="status"]').textContent).toBe('No se ha podido copiar. Cópialo a mano.'),
    )
  })

  it('solo se ve en web por defecto', () => {
    expect(invitaCard().classList.contains('hidden')).toBe(true)
  })
})
