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
    ['/', 'Cumple tu hábito. Que no caiga la racha.'],
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

  it('muestra la foto en escuadrones y portada al iniciar sesión y restaura los enlaces al salir', async () => {
    const foto = 'https://example.com/avatar.jpg'
    const fetchMock = vi.fn(async (path, options) => {
      if (path === '/api/auth/token/') return Response.json({ access: 'access', refresh: 'refresh' })
      if (path === '/api/auth/logout/') return new Response(null, { status: 204 })
      if (path === '/api/escuadrones/') return Response.json([])
      if (path === '/api/perfil/' && options.headers.get('Authorization') === 'Bearer access') {
        return Response.json({ nickname: 'Ana', foto_url: foto })
      }
      throw new Error(`Petición inesperada: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    stopApp = startApp()
    document.querySelector('header a[href="/login"]').click()
    document.querySelector('input[name="email"]').value = 'ana@example.com'
    document.querySelector('input[name="password"]').value = 'contraseña de prueba'
    document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))

    const avatar = () => document.querySelector('header button[aria-label="Tu cuenta"] img')
    await vi.waitFor(() => expect(window.location.pathname).toBe('/escuadrones'))
    await vi.waitFor(() => expect(avatar()?.getAttribute('src')).toBe(foto))

    document.querySelector('header a[aria-label="HabitSquad"]').click()
    expect(window.location.pathname).toBe('/')
    expect(document.querySelector('header a[href="/login"], header a[href="/registro"]')).toBeNull()
    await vi.waitFor(() => expect(avatar()?.getAttribute('src')).toBe(foto))
    const cuenta = document.querySelector('header button[aria-label="Tu cuenta"]')
    cuenta.click()
    const panel = document.getElementById(cuenta.getAttribute('aria-controls'))
    expect(panel.hidden).toBe(false)
    expect(panel.querySelector('a[href="/perfil"]').textContent).toBe('Ver perfil')
    panel.querySelector('button').click()

    await vi.waitFor(() => expect(document.querySelector('header a[href="/login"]')).not.toBeNull())
    expect(document.querySelector('header a[href="/registro"]')).not.toBeNull()
    expect(document.querySelector('header button[aria-label="Tu cuenta"]')).toBeNull()
    expect(hasSession()).toBe(false)
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
