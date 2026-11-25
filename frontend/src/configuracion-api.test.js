import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from './session.js'
import { configuracionEscuadronScreen } from './views/configuracionEscuadron.js'

const initial = { id: 7, nombre: 'Lectores', es_publico: false, limite_miembros: 5, miembros_actuales: 3 }
const detail = { codigo_invitacion: 'ABC123', creador_id: 1, miembros: [
  { usuario_id: 1, nickname: 'ana', es_administrador: true, es_usuario: true, foto_url: null },
  { usuario_id: 2, nickname: 'laura', es_administrador: false, es_usuario: false, foto_url: null },
  { usuario_id: 3, nickname: 'sergio', es_administrador: false, es_usuario: false, foto_url: null },
] }
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => structuredClone(data) })
let settings, fetchMock, page, failure, expulsion
const control = (label) => [...page.querySelectorAll('button')].find((node) => node.textContent === label || node.getAttribute('aria-label') === label)
const submit = () => page.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
const configurationCalls = () => fetchMock.mock.calls.filter(([url]) => url.endsWith('/configuracion/'))
const expulsions = () => fetchMock.mock.calls.filter(([url]) => url.includes('/miembros/'))
const membersTab = () => page.querySelectorAll('[role="tab"]')[1].click()

async function mount(id = '7') {
  page = configuracionEscuadronScreen({ id, panelHref: '/escuadrones/panel?id=7' })
  document.body.replaceChildren(page)
  await vi.waitFor(() => expect(page.querySelector('[aria-busy]').getAttribute('aria-busy')).toBe('false'))
}

describe('configuración conectada a la API', () => {
  beforeEach(() => {
    localStorage.clear()
    saveSession({ access: 'access-test', refresh: 'refresh-test' })
    settings = { ...initial }
    failure = null
    expulsion = { status: 204 }
    fetchMock = vi.fn(async (url, options = {}) => {
      expect(new Headers(options.headers).get('Authorization')).toBe('Bearer access-test')
      if (url === '/api/perfil/') return response(200, { nickname: 'ana', foto_url: null })
      if (url === '/api/escuadrones/7/') return response(200, detail)
      if (url === '/api/escuadrones/7/miembros/2/' && options.method === 'DELETE') {
        if (expulsion.error) throw expulsion.error
        return expulsion.status === 204 ? { ok: true, status: 204, json: async () => { throw new SyntaxError() } } : response(expulsion.status, expulsion.data)
      }
      if (url === '/api/escuadrones/7/configuracion/') {
        if (failure) return response(failure.status, failure.data)
        if (options.method === 'PATCH') settings = { ...settings, ...JSON.parse(options.body) }
        return response(200, settings)
      }
      throw new Error(`Petición inesperada: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); document.body.replaceChildren() })

  it('consulta el escuadrón seleccionado y persiste los tres campos con PATCH autenticado', async () => {
    await mount()
    expect(page.querySelector('input').value).toBe('Lectores')
    expect(page.textContent).not.toContain('Datos de ejemplo')
    page.querySelector('input').value = 'Nuevo nombre'
    page.querySelector('input').dispatchEvent(new Event('input', { bubbles: true }))
    control('Público').click()
    control('Aumentar plazas').click()
    expect(page.querySelector('.settings-summary').textContent).toContain('Privado · 3 de 5')
    submit()
    await vi.waitFor(() => expect(page.textContent).toContain('Cambios guardados.'))
    const [, options] = configurationCalls().find(([, options]) => options.method === 'PATCH')
    expect(JSON.parse(options.body)).toEqual({ nombre: 'Nuevo nombre', es_publico: true, limite_miembros: 6 })
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json')
    await mount()
    expect(page.querySelector('input').value).toBe('Nuevo nombre')
    expect(page.querySelector('.settings-summary').textContent).toContain('Público · 3 de 6')
    page.querySelectorAll('[role="tab"]')[1].click()
    expect(page.textContent).toContain('ana')
    expect(control('Eliminar')).toBeUndefined()
    expect(control('Expulsar a laura')).toBeDefined()
    page.querySelectorAll('[role="tab"]')[2].click()
    expect(page.querySelector('code').textContent).toBe('ABC123')
    expect(control('Generar otro código')).toBeUndefined()
  })
  it('admite más de diez plazas y reducir el límite por debajo de la ocupación, como la API', async () => {
    settings.limite_miembros = 11
    await mount()
    expect(page.querySelector('output').value).toBe('11')
    for (let i = 0; i < 10; i++) control('Reducir plazas').click()
    expect(page.querySelector('output').value).toBe('2')
    expect(control('Reducir plazas').disabled).toBe(true)
    expect(page.textContent).toContain('Nadie será expulsado')
    submit()
    await vi.waitFor(() => expect(settings.limite_miembros).toBe(2))
    await vi.waitFor(() => expect(page.textContent).toContain('Cambios guardados.'))
    page.querySelectorAll('[role="tab"]')[2].click()
    expect(page.textContent).toContain('Escuadrón completo')
  })
  it('deniega el acceso ante 403 y no consulta el detalle ni muestra campos', async () => {
    failure = { status: 403, data: { detail: 'Solo el administrador.' } }
    await mount()
    expect(page.textContent).toContain('Solo para el administrador')
    expect(page.querySelector('input')).toBeNull()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/escuadrones/7/')).toBe(false)
  })
  it('retira la edición si se pierde el permiso antes de guardar', async () => {
    await mount()
    control('Público').click()
    failure = { status: 403, data: null }
    submit()
    await vi.waitFor(() => expect(page.textContent).toContain('Solo para el administrador'))
    expect(page.querySelector('form')).toBeNull()
  })
  it('muestra los errores de validación y conserva los cambios para reintentar', async () => {
    await mount()
    control('Público').click()
    failure = { status: 400, data: { limite_miembros: ['Límite inválido.'] } }
    submit()
    await vi.waitFor(() => expect(page.querySelector('[role="alert"]').textContent).toBe('Límite inválido.'))
    expect(control('Público').getAttribute('aria-pressed')).toBe('true')
    expect(control('Guardar cambios').disabled).toBe(false)
  })
  it('presenta un 404 de forma comprensible', async () => {
    failure = { status: 404, data: null }
    await mount()
    expect(page.textContent).toContain('Este escuadrón ya no está disponible')
    expect(page.querySelector('input')).toBeNull()
  })
  it.each([undefined, 'abc', '0', '-1'])('sin un ID válido (%s) no consulta la configuración', async (id) => {
    page = configuracionEscuadronScreen({ id })
    document.body.replaceChildren(page)
    expect(page.textContent).toContain('Selecciona un escuadrón')
    expect(configurationCalls()).toHaveLength(0)
  })

  describe('expulsar a un miembro', () => {
    it('solo ofrece expulsar a los miembros que no son administradores, ni creadores, ni el propio usuario', async () => {
      detail.miembros.push({ usuario_id: 4, nickname: 'creadora', es_administrador: false, es_usuario: false, foto_url: null })
      detail.creador_id = 4
      try {
        await mount()
        membersTab()
        expect(control('Expulsar a ana')).toBeUndefined()
        expect(control('Expulsar a creadora')).toBeUndefined()
        expect(control('Expulsar a laura')).toBeDefined()
        expect(control('Expulsar a sergio')).toBeDefined()
      } finally {
        detail.miembros.pop()
        detail.creador_id = 1
      }
    })

    it('pide confirmación, explica qué se borra y permite cancelar sin llamar a la API', async () => {
      await mount()
      membersTab()
      control('Expulsar a laura').click()
      expect(control('Confirmar expulsión de laura').textContent).toBe('¿Expulsar a laura?')
      expect(page.textContent).toContain('Al expulsarlo pierde el acceso al panel, y se borran su hábito, sus pruebas y sus votos en este escuadrón.')
      control('Cancelar').click()
      expect(control('Confirmar expulsión de laura')).toBeUndefined()
      expect(page.textContent).not.toContain('Al expulsarlo')
      expect(expulsions()).toHaveLength(0)
    })

    it('al confirmar expulsa con DELETE autenticado y quita al miembro de la lista', async () => {
      await mount()
      membersTab()
      expect(page.textContent).toContain('Miembros · 3 de 5')
      control('Expulsar a laura').click()
      control('Confirmar expulsión de laura').click()
      await vi.waitFor(() => expect(page.textContent).toContain('laura ya no forma parte del escuadrón.'))
      const [[url, options]] = expulsions()
      expect(url).toBe('/api/escuadrones/7/miembros/2/')
      expect(options.method).toBe('DELETE')
      expect(page.querySelector('[aria-label="Miembros del escuadrón"]').textContent).not.toContain('laura')
      expect(page.textContent).toContain('Miembros · 2 de 5')
      expect(page.textContent).not.toContain('Al expulsarlo')
      expect(control('Expulsar a sergio')).toBeDefined()
      expect(document.activeElement).toBe(page.querySelector('#settings-panel'))
    })

    it('conserva los cambios pendientes de General después de expulsar', async () => {
      await mount()
      control('Público').click()
      membersTab()
      control('Expulsar a laura').click()
      control('Confirmar expulsión de laura').click()
      await vi.waitFor(() => expect(page.textContent).toContain('laura ya no forma parte del escuadrón.'))
      page.querySelectorAll('[role="tab"]')[0].click()
      expect(control('Público').getAttribute('aria-pressed')).toBe('true')
      expect(page.textContent).toContain('Sois 2')
      expect(control('Guardar cambios').disabled).toBe(false)
    })

    it('si el miembro ya no estaba (404), lo quita igualmente de la lista', async () => {
      expulsion = { status: 404, data: { detail: 'El usuario no pertenece a este escuadrón.' } }
      await mount()
      membersTab()
      control('Expulsar a laura').click()
      control('Confirmar expulsión de laura').click()
      await vi.waitFor(() => expect(page.textContent).toContain('laura ya no forma parte del escuadrón.'))
      expect(page.querySelector('[role="alert"]').textContent).toBe('')
      expect(page.textContent).toContain('Miembros · 2 de 5')
    })

    it('si ya no es administrador (403), retira la configuración', async () => {
      expulsion = { status: 403, data: { detail: 'Solo un administrador puede expulsar miembros.' } }
      await mount()
      membersTab()
      control('Expulsar a laura').click()
      control('Confirmar expulsión de laura').click()
      await vi.waitFor(() => expect(page.textContent).toContain('Solo para el administrador'))
      expect(page.querySelector('[aria-label="Miembros del escuadrón"]')).toBeNull()
    })

    it.each([
      ['un error del servidor', { status: 500, data: null }],
      ['un fallo de red', { error: new TypeError('Failed to fetch') }],
    ])('con %s avisa, mantiene al miembro y deja reintentar', async (_, fallo) => {
      expulsion = fallo
      await mount()
      membersTab()
      control('Expulsar a laura').click()
      control('Confirmar expulsión de laura').click()
      await vi.waitFor(() => expect(page.querySelector('[role="alert"]').textContent).toBe('No se ha podido expulsar a laura. Vuelve a intentarlo.'))
      expect(page.querySelector('[aria-label="Miembros del escuadrón"]').textContent).toContain('laura')
      expect(control('Confirmar expulsión de laura').disabled).toBe(false)
      expulsion = { status: 204 }
      control('Confirmar expulsión de laura').click()
      await vi.waitFor(() => expect(page.textContent).toContain('laura ya no forma parte del escuadrón.'))
      expect(page.querySelector('[role="alert"]').textContent).toBe('')
    })

    it('si la sesión ha caducado lo dice en vez del error genérico', async () => {
      expulsion = { status: 401, data: null }
      await mount()
      membersTab()
      control('Expulsar a laura').click()
      fetchMock.mockImplementation(async (url, options = {}) => {
        if (url === '/api/auth/token/refresh/') return response(401, null)
        if (url.includes('/miembros/')) return response(401, null)
        throw new Error(`Petición inesperada: ${url} ${options.method}`)
      })
      control('Confirmar expulsión de laura').click()
      await vi.waitFor(() => expect(page.querySelector('[role="alert"]').textContent).toBe('Tu sesión ha caducado. Vuelve a iniciar sesión.'))
    })
  })
})
