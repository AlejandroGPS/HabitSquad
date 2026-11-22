import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startApp } from './app.js'
import { clearSession, hasSession, saveSession } from './session.js'

describe('startApp', () => {
  let stopApp

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>'
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    stopApp?.()
    stopApp = undefined
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it.each([
    ['/escuadrones', 'Mis escuadrones'],
    ['/escuadrones/panel?id=7', 'Lectores'],
    ['/escuadrones/panel?id=8', 'Panel del escuadrón'],
    ['/perfil/editar', 'Editar perfil'],
  ])('«Ver perfil» abre el perfil de la sesión desde %s', async (path, title) => {
    saveSession({ access: 'access', refresh: 'refresh' })
    window.history.replaceState({}, '', path)
    const profile = { id: 1, nickname: 'Cuenta propia', email: 'perfil@example.com', hora_aviso: '20:00' }
    const responses = {
      '/api/escuadrones/': [],
      '/api/escuadrones/7/': { id: 7, nombre: 'Lectores', codigo_invitacion: 'ABC123', miembros: [] },
      '/api/escuadrones/7/habito/': null,
      '/api/perfil/': profile,
    }
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url === '/api/escuadrones/8/') return new Response('{}', { status: 404 })
      return new Response(JSON.stringify(responses[url]))
    }))
    stopApp = startApp()
    await vi.waitFor(() => expect(document.querySelector('h1').textContent).toBe(title))
    if (path.endsWith('id=8')) {
      await vi.waitFor(() => expect(document.querySelector('[role="alert"]').textContent).toContain('no está disponible'))
    }

    const menu = document.querySelector('button[aria-label="Tu cuenta"]')
    menu.click()
    const panel = document.getElementById(menu.getAttribute('aria-controls'))
    const link = [...panel.querySelectorAll('a')].find((item) => item.textContent === 'Ver perfil')
    link.click()

    expect(window.location.pathname).toBe('/perfil')
    expect(window.location.search).toBe('')
    await vi.waitFor(() => expect(document.querySelector('main').textContent).toContain(profile.email))
    expect(document.querySelector('h1').textContent).toBe('Mi perfil')
  })

  it('si la renovación falla, cierra la sesión y vuelve a /login?sesion=caducada', async () => {
    saveSession({ access: 'old-access', refresh: 'old-refresh' })
    stopApp = startApp()
    expect(window.location.pathname).toBe('/')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Token is invalid' }),
      }),
    )

    const { refreshSession } = await import('./api.js')
    await expect(refreshSession()).rejects.toMatchObject({ status: 401 })

    expect(hasSession()).toBe(false)
    await vi.waitFor(() => {
      expect(window.location.pathname).toBe('/login')
      expect(window.location.search).toBe('?sesion=caducada')
      expect(document.body.textContent).toContain(
        'Tu sesión ha caducado. Vuelve a iniciar sesión.',
      )
    })
    clearSession()
  })
})
