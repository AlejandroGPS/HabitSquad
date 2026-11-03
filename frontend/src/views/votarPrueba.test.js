import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { votarPruebaScreen } from './votarPrueba.js'

function mount() {
  const screen = votarPruebaScreen()
  document.body.replaceChildren(screen)
  const votes = screen.querySelector('[aria-label="Votos de la prueba"]')
  const buttons = [...screen.querySelectorAll('button')]
  return {
    votes,
    buttons,
    yes: buttons.find((button) => button.textContent === 'Sí, cuenta'),
    no: buttons.find((button) => button.textContent === 'No cuenta'),
    self: votes.querySelector('li:last-child'),
    result: votes.querySelector('[role="status"]'),
  }
}

describe('votarPruebaScreen con datos mock', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    document.body.replaceChildren()
    vi.unstubAllGlobals()
  })

  it('empieza con un voto pendiente y permite elegir cualquiera de las opciones', () => {
    const { votes, buttons, self, result } = mount()

    expect(votes.textContent).toContain('1 de 2')
    expect(self.textContent).toContain('Te falta tu voto')
    expect(buttons).toHaveLength(2)
    expect(buttons.every((button) => !button.disabled)).toBe(true)
    expect(result.classList.contains('hidden')).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['yes', 'sí', 'la prueba cuenta para la racha.'],
    ['no', 'no', 'la prueba no alcanza la mayoría para la racha.'],
  ])('al votar %s desactiva ambas opciones y refresca el estado visible', (option, vote, outcome) => {
    const view = mount()

    view[option].click()

    expect(view.buttons.every((button) => button.disabled)).toBe(true)
    expect(view.votes.textContent).toContain('2 de 2')
    expect(view.votes.textContent).not.toContain('1 de 2')
    expect(view.self.textContent).toBe(`Túha dicho que ${vote}`)
    expect(view.self.textContent).not.toContain('Te falta tu voto')
    expect(view.votes.querySelector('li').textContent).toContain('Carlosha dicho que sí')
    expect(view.result.classList.contains('hidden')).toBe(false)
    expect(view.result.getAttribute('aria-live')).toBe('polite')
    expect(view.result.textContent).toBe(`Voto guardado en esta vista de ejemplo: ${outcome}`)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['yes', 'no'])('impide repetir o cambiar el voto después de votar %s', (option) => {
    const view = mount()
    view[option].click()
    const stateAfterVote = view.votes.innerHTML

    for (const button of view.buttons) {
      button.click()
      // Incluso un evento sintético debe respetar el bloqueo del voto.
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }

    expect(view.votes.innerHTML).toBe(stateAfterVote)
    expect(view.buttons.every((button) => button.disabled)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
