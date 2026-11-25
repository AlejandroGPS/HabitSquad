import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listPublicSquads } from './api.js'
import { rememberedSquad, saveSession } from './session.js'
import { buscarEscuadronesScreen } from './views/buscarEscuadrones.js'

const squad = { id: 7, nombre: 'Club de Lectura', es_publico: true, limite_miembros: 8, miembros_actuales: 3, racha: 12 }
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data })
const joined = { id: 7, nombre: squad.nombre, es_publico: true, limite_miembros: 8, miembros: [{}, {}, {}, {}] }
let fetchMock
let page
const rows = () => [...page.querySelectorAll('ul[aria-label="Escuadrones públicos"] > li')]
const modal = () => page.querySelector('dialog')
const button = (name, root = page) => [...root.querySelectorAll('button')].find((node) => node.textContent === name)
const flush = async () => { await vi.waitFor(() => expect(page.querySelector('[aria-label="Resultados de búsqueda"]').getAttribute('aria-busy')).toBe('false')) }
function type(text) {
  const input = page.querySelector('input[type="search"]')
  input.value = text
  input.dispatchEvent(new Event('input'))
}
async function mount() {
  page = buscarEscuadronesScreen()
  document.body.replaceChildren(page)
  await flush()
}
function open() { rows()[0].querySelector('button').click() }
function confirm() { button('Unirme a Club de Lectura', modal()).click() }

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  saveSession({ access: 'access-token', refresh: 'refresh-token' })
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false; this.dispatchEvent(new Event('close')) } })
})
afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear() })

describe('buscador conectado a la API', () => {
  it('muestra racha, capacidad y plazas reales sin usuarios ni temática', async () => {
    fetchMock.mockResolvedValue(response(200, [squad]))
    await mount()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/escuadrones/publicos/')
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer access-token')
    expect(rows()).toHaveLength(1)
    expect(rows()[0].textContent).toContain('3/8 miembros')
    expect(rows()[0].textContent).toContain('5 plazas libres')
    expect(rows()[0].textContent).toContain('12 días')
    expect(page.querySelector('.squad-member-avatar, .squad-category')).toBeNull()
    expect(page.querySelector('header a[data-zona="escuadrones"]').getAttribute('aria-current')).toBeTruthy()
    open()
    expect(modal().textContent).toContain('3/8')
    expect(modal().textContent).not.toContain('Quién está')
  })

  it('envía la búsqueda al backend tras la pausa entre teclas y codifica el texto', async () => {
    fetchMock.mockResolvedValue(response(200, [squad]))
    await mount()
    type('L'); type('LE'); type('  LECT  ')
    expect(rows()).toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/escuadrones/publicos/?q=LECT')
    expect(rows()[0].querySelector('mark').textContent).toBe('Lect')
    await listPublicSquads(' club & + ')
    expect(new URL(fetchMock.mock.calls.at(-1)[0], 'http://localhost').searchParams.get('q')).toBe('club & +')
  })

  it('ignora una respuesta antigua, incluso si llega durante la pausa de la nueva búsqueda', async () => {
    let finishOld
    fetchMock.mockResolvedValueOnce(response(200, [squad]))
      .mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve }))
      .mockResolvedValueOnce(response(200, [{ ...squad, id: 8, nombre: 'Deportistas' }]))
    await mount()
    type('lect')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    type('depor')
    finishOld(response(200, [squad]))
    await Promise.resolve()
    expect(rows()).toHaveLength(0)
    await flush()
    expect(rows()).toHaveLength(1)
    expect(rows()[0].textContent).toContain('Deportistas')
    expect(page.querySelector('[role="status"]').textContent).toBe('1 resultado')
  })

  it('une por ID sin código, guarda el hábito y permite abrir el panel', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [squad]))
      .mockResolvedValueOnce(response(201, joined))
      .mockResolvedValueOnce(response(201, { id: 22, opcion: 'otro', texto_personalizado: 'Caminar 30 minutos' }))
    await mount()
    open()
    const joinButton = button('Unirme a Club de Lectura', modal())
    joinButton.click(); joinButton.click()
    await vi.waitFor(() => expect(modal().querySelector('input[name="habito"]')).not.toBeNull())
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [path, options] = fetchMock.mock.calls[1]
    expect(path).toBe('/api/escuadrones/7/unirse/')
    expect(options.method).toBe('POST')
    expect(options.body).toBeUndefined()
    expect(options.headers.get('Authorization')).toBe('Bearer access-token')
    expect(rows()).toHaveLength(0)
    expect(rememberedSquad()).toBe('7')
    expect(modal().querySelector('label').textContent).toBe('¿Qué harás hoy?')
    modal().querySelector('input').value = '  Caminar 30 minutos  '
    modal().querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(modal().textContent).toContain('¡Todo listo!'))
    expect(fetchMock.mock.calls[2][0]).toBe('/api/escuadrones/7/habito/')
    expect(fetchMock.mock.calls[2][1].method).toBe('PUT')
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ opcion: 'otro', texto_personalizado: 'Caminar 30 minutos' })
    expect(modal().querySelector('a[data-link]').getAttribute('href')).toBe('/escuadrones/panel?id=7')
    expect(modal().textContent).not.toContain('ejemplo')
  })

  it('recupera la validación del hábito sin repetir la unión', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [squad]))
      .mockResolvedValueOnce(response(201, joined))
      .mockResolvedValueOnce(response(400, { texto_personalizado: ['Revisa el hábito.'] }))
      .mockResolvedValueOnce(response(200, { opcion: 'otro', texto_personalizado: 'Leer' }))
    await mount()
    open(); confirm()
    await vi.waitFor(() => expect(modal().querySelector('form')).not.toBeNull())
    modal().querySelector('input').value = 'Leer'
    const submit = () => modal().querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
    submit()
    await vi.waitFor(() => expect(modal().querySelector('[role="alert"]').textContent).toBe('Revisa el hábito.'))
    expect(modal().querySelector('input').value).toBe('Leer')
    submit()
    await vi.waitFor(() => expect(modal().textContent).toContain('¡Todo listo!'))
    expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/unirse/'))).toHaveLength(1)
  })

  it.each([
    [403, 'Solo puedes unirte sin código a escuadrones públicos.', []],
    [404, 'Este escuadrón ya no existe.', []],
    [409, 'El escuadrón ha alcanzado el límite de miembros.', [{ ...squad, miembros_actuales: 8 }]],
    [409, 'Ya perteneces a este escuadrón.', []],
  ])('refresca el listado si al confirmar la API responde %s: %s', async (status, detail, refreshed) => {
    fetchMock.mockResolvedValueOnce(response(200, [squad]))
      .mockResolvedValueOnce(response(status, { detail }))
      .mockResolvedValueOnce(response(200, refreshed))
    await mount()
    open(); confirm()
    await vi.waitFor(() => expect(modal().querySelector('[role="alert"]').textContent).toBe(detail))
    await flush()
    expect(button('Unirme a Club de Lectura', modal()).disabled).toBe(true)
    if (refreshed.length) {
      expect(rows()[0].textContent).toContain('0 plazas libres')
      expect(rows()[0].querySelector('button').disabled).toBe(true)
    } else expect(rows()).toHaveLength(0)
    button('Ahora no', modal()).click()
    expect(modal().open).toBe(false)
  })

  it('renueva una sesión caducada y repite la búsqueda con el access nuevo', async () => {
    fetchMock.mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200, { access: 'renewed', refresh: 'rotated' }))
      .mockResolvedValueOnce(response(200, [squad]))
    await mount()
    expect(rows()).toHaveLength(1)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/token/refresh/')
    expect(fetchMock.mock.calls[2][1].headers.get('Authorization')).toBe('Bearer renewed')
  })

  it('muestra el error de sesión si tampoco se puede renovar', async () => {
    fetchMock.mockResolvedValue(response(401))
    await mount()
    expect(page.querySelector('[role="alert"]').textContent).toContain('Tu sesión ha caducado')
    expect(rows()).toHaveLength(0)
  })

  it('permite reintentar una caída de red sin mostrar datos ficticios', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(response(200, [squad]))
    await mount()
    expect(rows()).toHaveLength(0)
    expect(page.querySelector('[role="alert"]').textContent).toContain('No se han podido cargar')
    button('Reintentar').click()
    await flush()
    expect(rows()).toHaveLength(1)
  })
})
