import { afterEach, describe, expect, it, vi } from 'vitest'
import { menuScreen, mockSquads } from './menu.js'
import { panelEscuadronScreen } from './panelEscuadron.js'

afterEach(() => {
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
  vi.unstubAllGlobals()
})

describe('selector de escuadrones mock', () => {
  it('enlaza cada escuadrón con su propio panel sin consultar el backend', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const menu = menuScreen()
    for (const squad of mockSquads) {
      const entry = menu.querySelector(`[aria-label="Abrir panel de ${squad.name}"]`)
      window.history.replaceState({}, '', entry.getAttribute('href'))
      expect(panelEscuadronScreen().querySelector('h2').textContent).toBe(squad.name)
    }
    expect(fetchMock).not.toHaveBeenCalled()
    expect(menu.querySelector('a[href="/escuadrones/nuevo"]').textContent).toBe('Crear un escuadrón')
  })

  it('no muestra otro escuadrón si el identificador no existe', () => {
    window.history.replaceState({}, '', '/escuadrones/panel?id=desconocido')
    expect(panelEscuadronScreen().textContent).toContain('Selecciona un escuadrón')
  })

  it('bloquea el cierre de sesión mientras se completa', async () => {
    let finish
    const onLogout = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const menu = menuScreen({ onLogout })
    const button = menu.querySelector('button')
    button.click()
    button.click()
    expect(button.disabled).toBe(true)
    expect(onLogout).toHaveBeenCalledTimes(1)
    finish()
    await vi.waitFor(() => expect(button.disabled).toBe(false))
  })
})
