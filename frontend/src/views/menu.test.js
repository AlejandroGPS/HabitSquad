import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api.js'
import { menuScreen } from './menu.js'

afterEach(() => { document.body.replaceChildren() })

const squads = [
  { id: 7, nombre: 'Lectores nocturnos', miembros: [{ usuario_id: 1 }, { usuario_id: 2 }, { usuario_id: 3 }] },
  { id: 9, nombre: 'Completo', miembros: [1, 2, 3, 4, 5].map((usuario_id) => ({ usuario_id })) },
]

function mount(options = {}) {
  const menu = menuScreen(options)
  document.body.replaceChildren(menu)
  return menu
}

function logoutButton(menu) {
  return [...menu.querySelectorAll('button')].find((item) => item.textContent === 'Cerrar sesión')
}

describe('menuScreen', () => {
  it('usa la barra de la portada con sus secciones y el menú de cuenta', () => {
    const menu = mount({ loadSquads: () => new Promise(() => {}) })
    const nav = menu.querySelector('header nav[aria-label="Principal"]')

    expect(nav.classList.contains('nav-portada')).toBe(true)
    expect(nav.querySelector('a[aria-label="HabitSquad"]').getAttribute('href')).toBe('/')
    const secciones = [...nav.querySelectorAll('a[href^="/presentacion#"]')]
    expect(secciones.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Cómo funciona', '/presentacion#como-funciona'],
      ['Tu escuadrón', '/presentacion#tu-escuadron'],
      ['Tengo un código', '/presentacion#tengo-codigo'],
    ])
    expect(nav.querySelector('[aria-label="Tu cuenta"]')).not.toBeNull()
    expect(nav.querySelector('a[href="/login"], a[href="/registro"]')).toBeNull()
  })

  it('muestra el saludo y el título una sola vez', () => {
    const menu = mount({ loadSquads: () => new Promise(() => {}) })

    expect(menu.querySelectorAll('header')).toHaveLength(1)
    expect(menu.querySelectorAll('h1')).toHaveLength(1)
    expect(menu.querySelector('h1').textContent).toBe('Mis escuadrones')
    expect(menu.textContent).toContain('¿Con quién sumamos racha hoy?')
  })

  it('mientras carga avisa del estado y no muestra escuadrones', () => {
    const menu = mount({ loadSquads: () => new Promise(() => {}) })

    expect(menu.querySelector('[role="status"]').textContent).toContain('Cargando')
    expect(menu.querySelector('section').getAttribute('aria-busy')).toBe('true')
    expect(menu.querySelectorAll('a[aria-label^="Abrir panel"]')).toHaveLength(0)
  })

  it('pinta una tarjeta por escuadrón con sus plazas y la tarjeta para crear o unirse', async () => {
    const menu = mount({ loadSquads: async () => squads })
    await vi.waitFor(() => expect(menu.querySelectorAll('a[aria-label^="Abrir panel"]')).toHaveLength(2))

    const [lectores, completo] = menu.querySelectorAll('a[aria-label^="Abrir panel"]')
    expect(lectores.getAttribute('href')).toBe('/escuadrones/panel?id=7')
    expect(lectores.hasAttribute('data-link')).toBe(true)
    expect(lectores.textContent).toContain('LN')
    expect(lectores.textContent).toContain('3 de 5 miembros')
    expect(lectores.textContent).toContain('Quedan 2 plazas')
    expect(completo.textContent).toContain('Escuadrón completo')
    expect(menu.querySelector('[role="status"]').textContent).toBe('Tienes 2 escuadrones. Elige uno para ver cómo va el día.')

    const otraRacha = [...menu.querySelectorAll('main li')].at(-1)
    expect(otraRacha.querySelector('h2').textContent).toBe('¿Una racha más?')
    expect(otraRacha.querySelector('a[href="/escuadrones/nuevo"]').textContent).toBe('Crear un escuadrón')
    expect(otraRacha.querySelector('a[href="/escuadrones/unirse"]').textContent).toBe('Tengo un código')
  })

  it('sin escuadrones invita a crear el primero o a unirse con un código', async () => {
    const menu = mount({ loadSquads: async () => [] })
    await vi.waitFor(() => expect(menu.querySelector('[role="status"]').textContent).toContain('Todavía no perteneces'))

    const main = menu.querySelector('main')
    expect(main.querySelectorAll('h2')).toHaveLength(2)
    expect(main.querySelector('a[href="/escuadrones/nuevo"]').textContent).toBe('Crear un escuadrón')
    expect(main.querySelector('a[href="/escuadrones/unirse"]').textContent).toBe('Tengo un código')
    expect(menu.textContent).toContain('¡Vamos a por tu primer escuadrón!')
  })

  it('si falla la carga muestra el error y permite reintentar', async () => {
    const loadSquads = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(squads)
    const menu = mount({ loadSquads })
    await vi.waitFor(() => expect(menu.querySelector('[role="alert"]').textContent).toContain('No se han podido cargar'))

    const retry = [...menu.querySelectorAll('button')].find((item) => item.textContent === 'Reintentar')
    expect(retry.hidden).toBe(false)
    retry.click()
    await vi.waitFor(() => expect(menu.querySelectorAll('a[aria-label^="Abrir panel"]')).toHaveLength(2))
    expect(menu.querySelector('[role="alert"]').textContent).toBe('')
    expect(retry.hidden).toBe(true)
  })

  it('avisa de la sesión caducada cuando la API responde 401', async () => {
    const menu = mount({ loadSquads: async () => { throw new ApiError(401, {}) } })

    await vi.waitFor(() => expect(menu.querySelector('[role="alert"]').textContent).toBe('Tu sesión ha caducado. Vuelve a iniciar sesión.'))
  })

  it('cierra la sesión desde el menú de cuenta y lo bloquea mientras termina', async () => {
    let finish
    const onLogout = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const menu = mount({ onLogout, loadSquads: async () => [] })
    menu.querySelector('[aria-label="Tu cuenta"]').click()
    const button = logoutButton(menu)

    button.click()
    button.click()
    expect(button.disabled).toBe(true)
    expect(onLogout).toHaveBeenCalledTimes(1)
    finish()
    await vi.waitFor(() => expect(button.disabled).toBe(false))
  })
})
