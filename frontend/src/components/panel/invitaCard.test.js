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

  it('se ve también en móvil, a todo el ancho', () => {
    const card = invitaCard()

    expect(card.classList.contains('hidden')).toBe(false)
    expect(card.classList.contains('col-span-2')).toBe(true)
    expect(card.classList.contains('lg:col-span-1')).toBe(true)
  })
})

describe('invitaCard: compartir', () => {
  const compartir = (card) => [...card.querySelectorAll('button')].find((button) => button.textContent === 'Compartir')

  it('comparte el enlace para unirse con el código ya puesto', async () => {
    const share = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { share })
    const card = invitaCard({ codigo: 'K7P2QX', libres: 2, nombre: 'Lectores' })

    expect(compartir(card).classList.contains('lg:hidden')).toBe(true)
    compartir(card).click()

    await vi.waitFor(() => expect(share).toHaveBeenCalledWith({
      title: 'HabitSquad',
      text: 'Únete a «Lectores» en HabitSquad con el código K7P2QX.',
      url: `${window.location.origin}/escuadrones/unirse?codigo=K7P2QX`,
    }))
  })

  it('no avisa si se cierra el menú de compartir, pero sí si falla', async () => {
    const share = vi.fn().mockRejectedValueOnce(new DOMException('', 'AbortError')).mockRejectedValueOnce(new Error())
    vi.stubGlobal('navigator', { share })
    const card = invitaCard({ codigo: 'K7P2QX', libres: 2 })
    const status = card.querySelector('[role="status"]')

    compartir(card).click()
    await vi.waitFor(() => expect(share).toHaveBeenCalledOnce())
    expect(status.classList.contains('hidden')).toBe(true)

    compartir(card).click()
    await vi.waitFor(() => expect(status.textContent).toBe('No se ha podido compartir. Copia el código.'))
    expect(status.classList.contains('hidden')).toBe(false)
  })

  it('no ofrece compartir si el navegador no puede o si el escuadrón está lleno', () => {
    expect(compartir(invitaCard({ codigo: 'K7P2QX', libres: 2 }))).toBeUndefined()

    vi.stubGlobal('navigator', { share: vi.fn() })
    expect(compartir(invitaCard({ codigo: 'K7P2QX', libres: 0 }))).toBeUndefined()
  })
})
