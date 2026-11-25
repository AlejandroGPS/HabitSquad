import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter } from '../router.js'
import { guard, notFound, routes } from '../routes.js'
import { clearSession, saveSession } from '../session.js'

vi.mock('../tiempoReal.js', () => ({ conectarEscuadron: vi.fn(() => ({ cerrar: vi.fn() })) }))

const habit = { opcion: 'leer', texto_personalizado: '' }
const response = (data) => ({ ok: true, status: 200, json: async () => data })

describe('navegación entre las pantallas del escuadrón', () => {
  let router

  beforeEach(() => {
    saveSession({ access: 'access', refresh: 'refresh' })
  })

  afterEach(() => {
    router?.stop()
    clearSession()
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
    vi.unstubAllGlobals()
  })

  function start(id, isAdmin = true) {
    const squad = { id, nombre: `Escuadrón ${id}`, codigo_invitacion: 'ABC123', limite_miembros: 5,
      miembros: [
        { usuario_id: 1, nickname: 'Ana', es_usuario: true, es_administrador: isAdmin, habito: habit },
        { usuario_id: 2, nickname: 'Luis', es_usuario: false, es_administrador: true },
      ] }
    vi.stubGlobal('fetch', vi.fn(async (path) => {
      if (path === `/api/escuadrones/${id}/`) return response(squad)
      if (path === `/api/escuadrones/${id}/habito/`) return response(habit)
      if (path === `/api/escuadrones/${id}/configuracion/`) {
        return response({ id, nombre: squad.nombre, es_publico: false, limite_miembros: 5, miembros_actuales: 1 })
      }
      if (path === '/api/perfil/') return response({ nickname: 'Ana', hora_aviso: '21:30' })
      throw new Error(`Petición inesperada: ${path}`)
    }))
    window.history.replaceState({}, '', `/escuadrones/panel?id=${id}`)
    router = createRouter({ root: document.body, routes, notFound, guard })
    router.start()
  }

  function menuLink(label) {
    const link = [...document.querySelectorAll('aside nav a')].find((node) => node.textContent === label)
    expect(link).toBeDefined()
    expect(link.hasAttribute('aria-disabled')).toBe(false)
    return link
  }

  function expectSquadMenu(id, active, isAdmin = true) {
    expect(menuLink('Escuadrón').getAttribute('href')).toBe(`/escuadrones/panel?id=${id}`)
    expect(menuLink('Mi hábito').getAttribute('href')).toBe(`/habito?escuadron=${id}`)
    expect(menuLink('Alertas').getAttribute('href')).toBe(`/alertas?escuadron=${id}`)
    if (isAdmin) expect(menuLink('Configuración').getAttribute('href')).toBe(`/escuadrones/configuracion?origen=${id}`)
    else expect(document.querySelector('a[href^="/escuadrones/configuracion"]')).toBeNull()
    for (const nav of document.querySelectorAll('nav[aria-label="Secciones"]')) {
      expect([...nav.children].map((item) => item.textContent)).not.toContain('Racha')
    }
    expect(document.querySelector('aside [aria-current="page"]').textContent).toBe(active)
  }

  it.each([7, 9])('conserva el escuadrón %i al pasar del panel al hábito, Alertas y Configuración', async (id) => {
    start(id)
    // Los accesos de administración esperan a que el servidor confirme el rol.
    expectSquadMenu(id, 'Escuadrón', false)
    await vi.waitFor(() => expect(document.querySelector('h1').textContent).toBe(`Escuadrón ${id}`))
    const bell = document.querySelector('header a[href^="/alertas"]')
    expect(bell.getAttribute('href')).toBe(`/alertas?escuadron=${id}`)

    menuLink('Mi hábito').click()
    await vi.waitFor(() => expect(document.querySelector('form').getAttribute('aria-busy')).toBe('false'))
    expectSquadMenu(id, 'Mi hábito')
    expect(document.querySelector('header a[aria-label="Configuración del escuadrón"]').getAttribute('href'))
      .toBe(`/escuadrones/configuracion?origen=${id}`)

    menuLink('Alertas').click()
    expect(document.querySelector('h1').textContent).toBe('Alertas')
    await vi.waitFor(() => expect(document.body.textContent).toContain('21:30'))
    expectSquadMenu(id, 'Alertas')

    menuLink('Configuración').click()
    await vi.waitFor(() => expect(document.querySelector('input[name="nombre"]').value).toBe(`Escuadrón ${id}`))
    expectSquadMenu(id, 'Configuración')

    menuLink('Escuadrón').click()
    expect(window.location.pathname + window.location.search).toBe(`/escuadrones/panel?id=${id}`)
    await vi.waitFor(() => expect(document.querySelector('h1').textContent).toBe(`Escuadrón ${id}`))
    expectSquadMenu(id, 'Escuadrón')
  })

  it('la campana del panel abre Alertas y permite volver al mismo escuadrón', async () => {
    start(7)
    await vi.waitFor(() => expect(document.querySelector('h1').textContent).toBe('Escuadrón 7'))
    document.querySelector('header a[href^="/alertas"]').click()
    expect(window.location.pathname + window.location.search).toBe('/alertas?escuadron=7')
    await vi.waitFor(() => expect(document.body.textContent).toContain('21:30'))
    expectSquadMenu(7, 'Alertas')
    menuLink('Escuadrón').click()
    await vi.waitFor(() => expect(document.querySelector('h1').textContent).toBe('Escuadrón 7'))
  })

  it('el miembro conserva el contexto sin accesos a Racha ni Configuración', async () => {
    start(7, false)
    await vi.waitFor(() => expect(document.querySelector('h1').textContent).toBe('Escuadrón 7'))
    expectSquadMenu(7, 'Escuadrón', false)
    menuLink('Mi hábito').click()
    await vi.waitFor(() => expect(document.querySelector('form').getAttribute('aria-busy')).toBe('false'))
    expectSquadMenu(7, 'Mi hábito', false)
    menuLink('Alertas').click()
    await vi.waitFor(() => expect(document.body.textContent).toContain('21:30'))
    expectSquadMenu(7, 'Alertas', false)
    expect([...document.querySelector('nav.lg\\:hidden').children].map((item) => item.textContent)).toEqual(['Escuadrón', 'Alertas'])
  })

  it('el administrador abre la configuración desde el lugar de Racha en el menú móvil', async () => {
    start(7)
    await vi.waitFor(() => expect(document.querySelector('h1').textContent).toBe('Escuadrón 7'))
    const mobile = document.querySelector('nav.lg\\:hidden')
    expect([...mobile.children].map((item) => item.textContent)).toEqual(['Escuadrón', 'Configuración', 'Alertas'])
    mobile.children[1].click()
    expect(window.location.pathname + window.location.search).toBe('/escuadrones/configuracion?origen=7')
    await vi.waitFor(() => expect(document.querySelector('input[name="nombre"]').value).toBe('Escuadrón 7'))
    expectSquadMenu(7, 'Configuración')
  })
})
