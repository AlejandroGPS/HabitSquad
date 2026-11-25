import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api.js'
import { createRouter } from '../router.js'
import { guard, notFound, routes } from '../routes.js'
import { clearSession, saveSession } from '../session.js'
import { selectorEscuadronScreen } from './selectorEscuadron.js'

const squads = [
  { id: 7, nombre: 'Lectores', codigo_invitacion: 'ABC123', miembros: [{ usuario_id: 1, habito: null }] },
  { id: 9, nombre: 'Deportistas', codigo_invitacion: 'DEF456', miembros: [{ usuario_id: 1, habito: null }, { usuario_id: 2, habito: null }] },
]
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data })

describe('selectorEscuadronScreen', () => {
  const pendiente = () => new Promise(() => {})
  function mount(options = {}) {
    const view = selectorEscuadronScreen(options)
    document.body.replaceChildren(view)
    return view
  }
  const tarjetas = (view) => view.querySelectorAll('a[aria-label^="Abrir panel"]')
  afterEach(() => { document.body.replaceChildren() })

  it('la barra de arriba enlaza a las secciones de la app, marca Mis escuadrones y tiene el menú de cuenta', () => {
    window.history.replaceState(null, '', '/escuadrones')
    const nav = mount({ loadSquads: pendiente }).querySelector('header nav[aria-label="Principal"]')

    expect(nav.querySelector('a[aria-label="HabitSquad"]').getAttribute('href')).toBe('/')
    expect([...nav.querySelectorAll('a[data-zona]')].map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Mis escuadrones', '/escuadrones'],
      ['Alertas', '/alertas'],
    ])
    expect(nav.querySelector('[aria-current="page"]').textContent).toBe('Mis escuadrones')
    expect(nav.querySelector('a[href^="/#"]')).toBeNull()
    expect(nav.querySelector('[aria-label="Tu cuenta"]')).not.toBeNull()
    expect(nav.querySelector('a[href="/login"], a[href="/registro"]')).toBeNull()
  })

  it('mientras carga saluda, avisa del estado y no muestra escuadrones', () => {
    const view = mount({ loadSquads: pendiente })

    expect(view.querySelectorAll('h1')).toHaveLength(1)
    expect(view.querySelector('h1').textContent).toBe('Mis escuadrones')
    expect(view.textContent).toContain('¡Hola! ¿Con quién sumamos racha hoy?')
    expect(view.querySelector('[role="status"]').textContent).toBe('Cargando tus escuadrones…')
    expect(view.querySelector('main section').getAttribute('aria-busy')).toBe('true')
    expect(tarjetas(view)).toHaveLength(0)
  })

  it('pinta una tarjeta por escuadrón y al final la de crear o unirse', async () => {
    const view = mount({ loadSquads: async () => squads })
    await vi.waitFor(() => expect(tarjetas(view)).toHaveLength(2))

    expect([...tarjetas(view)].map((link) => link.getAttribute('href'))).toEqual([
      '/escuadrones/panel?id=7',
      '/escuadrones/panel?id=9',
    ])
    expect(view.querySelector('[role="status"]').textContent).toBe('Tienes 2 escuadrones. Elige uno para ver cómo va el día.')
    expect(view.querySelector('main section').getAttribute('aria-busy')).toBe('false')
    expect([...view.querySelectorAll('main li')].at(-1).querySelector('h2').textContent).toBe('¿Una racha más?')
  })

  it('con un solo escuadrón el resumen va en singular', async () => {
    const view = mount({ loadSquads: async () => squads.slice(0, 1) })

    await vi.waitFor(() => expect(view.querySelector('[role="status"]').textContent).toBe('Tienes 1 escuadrón. Ábrelo para ver cómo va el día.'))
  })

  it('muestra en las tarjetas la capacidad configurada en el backend', async () => {
    const view = mount({ loadSquads: async () => [{ ...squads[0], limite_miembros: 8 }] })
    await vi.waitFor(() => expect(tarjetas(view)).toHaveLength(1))
    expect(tarjetas(view)[0].textContent).toContain('1 de 8 miembros')
    expect(tarjetas(view)[0].textContent).toContain('Quedan 7 plazas')
  })

  it('sin escuadrones cambia el saludo e invita a crear o unirse', async () => {
    const view = mount({ loadSquads: async () => [] })
    await vi.waitFor(() => expect(view.querySelector('[role="status"]').textContent).toContain('Todavía no perteneces'))

    expect(view.textContent).toContain('¡Vamos a por tu primer escuadrón!')
    expect([...view.querySelectorAll('main h2')].map((titulo) => titulo.textContent)).toEqual([
      'Crea tu escuadrón',
      'Únete con un código',
    ])
  })

  it('si falla la carga muestra el error y permite reintentar', async () => {
    const loadSquads = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(squads)
    const view = mount({ loadSquads })
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent).toContain('No se han podido cargar'))
    const retry = [...view.querySelectorAll('button')].find((button) => button.textContent === 'Reintentar')

    expect(retry.hidden).toBe(false)
    retry.click()
    await vi.waitFor(() => expect(tarjetas(view)).toHaveLength(2))
    expect(view.querySelector('[role="alert"]').textContent).toBe('')
    expect(retry.hidden).toBe(true)
  })

  it('avisa de la sesión caducada cuando la API responde 401', async () => {
    const view = mount({ loadSquads: async () => { throw new ApiError(401) } })

    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent).toBe('Tu sesión ha caducado. Vuelve a iniciar sesión.'))
  })

  it('cierra la sesión desde el menú de cuenta y bloquea el botón mientras termina', async () => {
    let finish
    const onLogout = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const view = mount({ onLogout, loadSquads: async () => [] })
    view.querySelector('[aria-label="Tu cuenta"]').click()
    const button = [...view.querySelectorAll('button')].find((item) => item.textContent === 'Cerrar sesión')

    button.click()
    button.click()
    expect(onLogout).toHaveBeenCalledTimes(1)
    expect(button.disabled).toBe(true)
    finish()
    await vi.waitFor(() => expect(button.disabled).toBe(false))
  })
})

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
    window.history.replaceState({}, '', '/escuadrones')
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
    expect(window.location.pathname).toBe('/escuadrones')
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
    const listRequest = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(response(200, squads))
    fetchMock.mockImplementation((path) => path === '/api/escuadrones/'
      ? listRequest()
      : Promise.resolve(response(200, { nickname: 'Ana' })))
    start()
    await vi.waitFor(() => expect(root.querySelector('[role="alert"]').textContent).toContain('No se han podido cargar'))
    expect(root.querySelectorAll('a[aria-label^="Abrir panel"]')).toHaveLength(0)
    ;[...root.querySelectorAll('button')].find((button) => button.textContent === 'Reintentar').click()
    await vi.waitFor(() => expect(root.querySelectorAll('a[aria-label^="Abrir panel"]')).toHaveLength(2))
  })
  it('con sesión, la barra cambia de sección al navegar y el logo abre la presentación', async () => {
    start()
    await vi.waitFor(() => expect(root.textContent).toContain('Todavía no perteneces'))
    expect(root.querySelector('header [aria-current="page"]').textContent).toBe('Mis escuadrones')

    root.querySelector('header a[href="/perfil"]').click()
    expect(window.location.pathname).toBe('/perfil')
    expect(root.querySelector('header [aria-current="page"]').textContent).toBe('Ver perfil')
    expect(root.querySelector('header a[data-zona][aria-current]')).toBeNull()

    root.querySelector('header a[data-zona="escuadrones"]').click()
    expect(window.location.pathname).toBe('/escuadrones')
    expect(root.querySelector('header [aria-current="page"]').textContent).toBe('Mis escuadrones')

    root.querySelector('header a[aria-label="HabitSquad"]').click()
    expect(window.location.pathname).toBe('/')
    expect(root.querySelector('h1').textContent).toBe('Cumple tu hábito. Que no caiga la racha.')
  })
  it('protege el selector /escuadrones y el panel sin sesión', () => {
    clearSession()
    expect(guard(routes.find((route) => route.path === '/escuadrones'))).toBe('/login')
    expect(guard(routes.find((route) => route.path === '/escuadrones/panel'))).toBe('/login')
  })
})
