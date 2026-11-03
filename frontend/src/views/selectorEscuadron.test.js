import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter } from '../router.js'
import { guard, notFound, routes } from '../routes.js'
import { clearSession, saveSession } from '../session.js'
import { menuScreen } from './menu.js'

const squads = [
  { id: 7, nombre: 'Lectores', codigo_invitacion: 'ABC123', miembros: [{ usuario_id: 1, habito: null }] },
  { id: 9, nombre: 'Deportistas', codigo_invitacion: 'DEF456', miembros: [{ usuario_id: 1, habito: null }, { usuario_id: 2, habito: null }] },
]
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data })

describe('selector recuperado conectado al backend', () => {
  let router
  let root
  let fetchMock
  beforeEach(() => {
    saveSession({ access: 'access', refresh: 'refresh' })
    window.history.replaceState({}, '', '/')
    root = document.createElement('div')
    document.body.replaceChildren(root)
    fetchMock = vi.fn().mockResolvedValue(response(200, []))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    router?.stop()
    clearSession()
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
    vi.unstubAllGlobals()
  })
  function start() {
    router = createRouter({ root, routes, notFound, guard })
    router.start()
  }
  const habits = {
    7: { opcion: 'otro', texto_personalizado: 'Leer 20 minutos' },
    9: { opcion: 'otro', texto_personalizado: 'Caminar 30 minutos' },
  }
  function mockSquadApi() {
    fetchMock.mockImplementation(async (path) => {
      if (path === '/api/escuadrones/') return response(200, squads)
      for (const squad of squads) {
        if (path === `/api/escuadrones/${squad.id}/`) return response(200, squad)
        if (path === `/api/escuadrones/${squad.id}/habito/`) return response(200, habits[squad.id])
      }
      throw new Error(`Petición inesperada: ${path}`)
    })
  }
  async function selectSquad(squad) {
    const selector = `a[aria-label="Abrir panel de ${squad.nombre}"]`
    await vi.waitFor(() => expect(root.querySelector(selector)).not.toBeNull())
    root.querySelector(selector).click()
    expect(window.location.pathname).toBe('/escuadrones/panel')
    expect(window.location.search).toBe(`?id=${squad.id}`)
    await vi.waitFor(() => expect(root.querySelector('h1').textContent).toBe(squad.nombre))
  }
  function returnToSelector() {
    const back = [...root.querySelectorAll('a')].find((link) => link.textContent === '← Mis escuadrones')
    expect(back).toBeDefined()
    back.click()
    expect(window.location.pathname).toBe('/')
  }
  it.each([
    { first: squads[0], second: squads[1] },
    { first: squads[1], second: squads[0] },
  ])('cambia de $first.nombre a $second.nombre desde el selector y refresca todos los datos', async ({ first, second }) => {
    mockSquadApi()
    start()
    await selectSquad(first)
    expect(root.textContent).toContain(first.codigo_invitacion)
    expect(root.textContent).toContain(habits[first.id].texto_personalizado)

    returnToSelector()
    await selectSquad(second)

    expect(root.textContent).toContain(second.codigo_invitacion)
    expect(root.textContent).toContain(`${second.miembros.length} de 5 miembros`)
    expect(root.textContent).toContain(habits[second.id].texto_personalizado)
    expect(root.textContent).not.toContain(first.nombre)
    expect(root.textContent).not.toContain(first.codigo_invitacion)
    expect(root.textContent).not.toContain(habits[first.id].texto_personalizado)
    const habitLinks = root.querySelectorAll('a[href^="/habito"]')
    expect(habitLinks.length).toBeGreaterThan(0)
    expect([...habitLinks].every((link) => link.getAttribute('href') === `/habito?escuadron=${second.id}`)).toBe(true)
    expect(fetchMock.mock.calls.slice(-2).map(([path]) => path)).toEqual([
      `/api/escuadrones/${second.id}/`, `/api/escuadrones/${second.id}/habito/`,
    ])
  })
  it('una respuesta tardía del anterior no reemplaza el escuadrón elegido después', async () => {
    mockSquadApi()
    const normalRequest = fetchMock.getMockImplementation()
    let finishFirst
    fetchMock.mockImplementation((path, options) => path === '/api/escuadrones/7/habito/'
      ? new Promise((resolve) => { finishFirst = resolve })
      : normalRequest(path, options))
    start()
    await vi.waitFor(() => expect(root.querySelector('a[aria-label="Abrir panel de Lectores"]')).not.toBeNull())
    root.querySelector('a[aria-label="Abrir panel de Lectores"]').click()
    await vi.waitFor(() => expect(finishFirst).toBeTypeOf('function'))
    returnToSelector()
    await selectSquad(squads[1])

    finishFirst(response(200, habits[7]))
    // Deja completar la petición anterior y su renderizado asíncrono.
    await vi.waitFor(() => expect(root.querySelector('h1').textContent).toBe('Deportistas'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(window.location.search).toBe('?id=9')
    expect(root.querySelector('h1').textContent).toBe('Deportistas')
    expect(root.textContent).toContain('Caminar 30 minutos')
    expect(root.textContent).not.toContain('Leer 20 minutos')
    expect(root.textContent).not.toContain('ABC123')
  })
  it.each([403, 404])('si el segundo escuadrón devuelve %s, muestra el error sin conservar datos del primero', async (status) => {
    mockSquadApi()
    const normalRequest = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((path, options) => path === '/api/escuadrones/9/'
      ? Promise.resolve(response(status, { detail: 'No disponible' }))
      : normalRequest(path, options))
    start()
    await selectSquad(squads[0])
    returnToSelector()
    await vi.waitFor(() => expect(root.querySelector('a[aria-label="Abrir panel de Deportistas"]')).not.toBeNull())
    root.querySelector('a[aria-label="Abrir panel de Deportistas"]').click()
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]').textContent).toContain('no está disponible'))
    expect(root.textContent).not.toContain('Lectores')
    expect(root.textContent).not.toContain('ABC123')
    expect(root.textContent).not.toContain('Leer 20 minutos')
    expect(fetchMock.mock.calls.some(([path]) => path === '/api/escuadrones/9/habito/')).toBe(false)
    returnToSelector()
    await selectSquad(squads[0])
    expect(root.textContent).toContain('Leer 20 minutos')
  })
  it('el inicio muestra el selector vacío con acceso a crear, unirse y cerrar sesión', async () => {
    start()
    await vi.waitFor(() => expect(root.textContent).toContain('Todavía no perteneces'))
    expect(root.querySelector('#squad-list-title').textContent).toBe('Mis escuadrones')
    expect(root.textContent).not.toContain('Los Inquebrantables')
    expect(root.querySelector('a[href="/escuadrones/nuevo"]')).not.toBeNull()
    expect(root.querySelector('a[href="/escuadrones/unirse"]')).not.toBeNull()
    expect(root.textContent).toContain('Cerrar sesión')
    expect(fetchMock).toHaveBeenCalledWith('/api/escuadrones/', expect.any(Object))
    root.querySelector('a[href="/escuadrones/nuevo"]').click()
    expect(window.location.pathname).toBe('/escuadrones/nuevo')
    expect(root.querySelector('form')).not.toBeNull()
  })
  it('muestra los escuadrones de la API sin inventar grupos ni rachas', async () => {
    fetchMock.mockResolvedValueOnce(response(200, squads))
    start()
    await vi.waitFor(() => expect(root.querySelectorAll('a[aria-label^="Abrir panel"]')).toHaveLength(2))
    expect(root.textContent).toContain('Lectores')
    expect(root.textContent).toContain('2 de 5 miembros')
    expect(root.textContent).not.toContain('días de racha')
    expect(root.querySelector('a[aria-label="Abrir panel de Deportistas"]').getAttribute('href')).toBe('/escuadrones/panel?id=9')
  })
  it('abre el panel real seleccionado y conserva su contexto al elegir y guardar un hábito', async () => {
    fetchMock.mockImplementation(async (path, options) => {
      if (path === '/api/escuadrones/') return response(200, squads)
      if (path === '/api/escuadrones/9/') return response(200, squads[1])
      if (path === '/api/escuadrones/9/habito/') {
        return response(200, options.method === 'PUT' ? { opcion: 'otro', texto_personalizado: 'Caminar' } : null)
      }
      throw new Error(`Petición inesperada: ${path}`)
    })
    start()
    await vi.waitFor(() => expect(root.querySelector('a[aria-label="Abrir panel de Deportistas"]')).not.toBeNull())
    root.querySelector('a[aria-label="Abrir panel de Deportistas"]').click()
    await vi.waitFor(() => expect(root.querySelector('h1').textContent).toBe('Deportistas'))
    expect(root.textContent).toContain('DEF456')
    ;[...root.querySelectorAll('button')].find((button) => button.textContent === 'Elegir mi hábito').click()
    expect(window.location.pathname).toBe('/habito')
    expect(window.location.search).toBe('?escuadron=9')
    await vi.waitFor(() => expect(root.querySelector('button[type="submit"]').disabled).toBe(false))
    const input = root.querySelector('input[name="habito"]')
    input.value = 'Caminar'
    input.dispatchEvent(new Event('input'))
    root.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(window.location.pathname).toBe('/escuadrones/panel'))
    expect(window.location.search).toBe('?id=9')
    expect(fetchMock.mock.calls.some(([path, options]) => path === '/api/escuadrones/9/habito/' && options.method === 'PUT')).toBe(true)
  })
  it('muestra un error de conexión y permite volver a cargar la lista', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(response(200, squads))
    start()
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]').textContent).toContain('No se han podido cargar'))
    expect(root.querySelectorAll('a[aria-label^="Abrir panel"]')).toHaveLength(0)
    ;[...root.querySelectorAll('button')].find((button) => button.textContent === 'Reintentar').click()
    await vi.waitFor(() => expect(root.querySelectorAll('a[aria-label^="Abrir panel"]')).toHaveLength(2))
  })
  it('protege el selector /menu y el panel sin sesión', () => {
    clearSession()
    expect(guard(routes.find((route) => route.path === '/menu'))).toBe('/login')
    expect(guard(routes.find((route) => route.path === '/escuadrones/panel'))).toBe('/login')
  })
  it('mantiene el botón de cierre bloqueado durante el cierre de sesión', async () => {
    let finish
    const onLogout = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const view = menuScreen({ onLogout })
    root.append(view)
    const button = [...view.querySelectorAll('button')].find((item) => item.textContent === 'Cerrar sesión')
    button.click()
    button.click()
    expect(onLogout).toHaveBeenCalledTimes(1)
    expect(button.disabled).toBe(true)
    finish()
    await vi.waitFor(() => expect(button.disabled).toBe(false))
  })
})
