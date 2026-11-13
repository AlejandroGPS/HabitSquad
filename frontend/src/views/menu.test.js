import { afterEach, describe, expect, it, vi } from 'vitest'
import { menuScreen } from './menu.js'

afterEach(() => { document.body.replaceChildren() })

describe('menuScreen', () => {
  it('muestra la barra de navegación de la portada sin enlaces de invitado', () => {
    const menu = menuScreen({ title: 'HabitSquad', loadSquads: () => new Promise(() => {}) })
    const nav = menu.querySelector('header nav[aria-label="Principal"]')
    expect(nav).not.toBeNull()
    expect(nav.classList.contains('nav-portada')).toBe(true)
    expect(nav.querySelector('a[href="/"]').getAttribute('aria-label')).toBe('HabitSquad')
    expect(nav.querySelector('a[href="/login"], a[href="/registro"], a[href^="/#"]')).toBeNull()
    expect(menu.querySelectorAll('header')).toHaveLength(1)
    expect(menu.querySelectorAll('h1')).toHaveLength(1)
    expect(menu.querySelector('h1').textContent).toBe('HabitSquad')
  })

  it('mantiene las acciones de crear y unirse disponibles mientras carga la lista', () => {
    const menu = menuScreen({ loadSquads: () => new Promise(() => {}) })
    expect(menu.querySelector('[role="status"]').textContent).toContain('Cargando')
    expect(menu.querySelector('a[href="/escuadrones/nuevo"]').textContent).toBe('Crear un escuadrón')
    expect(menu.querySelector('a[href="/escuadrones/unirse"]')).not.toBeNull()
    expect(menu.querySelectorAll('a[aria-label^="Abrir panel"]')).toHaveLength(0)
  })

  it('muestra el error al cerrar sesión y permite reintentar', async () => {
    const onLogout = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined)
    const menu = menuScreen({ onLogout, loadSquads: async () => [] })
    const button = [...menu.querySelectorAll('button')].find((item) => item.textContent === 'Cerrar sesión')
    button.click()
    await vi.waitFor(() => expect(menu.textContent).toContain('No se ha podido cerrar la sesión'))
    expect(button.disabled).toBe(false)
    button.click()
    await vi.waitFor(() => expect(onLogout).toHaveBeenCalledTimes(2))
  })

  it('bloquea el cierre de sesión mientras se completa', async () => {
    let finish
    const onLogout = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const menu = menuScreen({ onLogout, loadSquads: async () => [] })
    const button = [...menu.querySelectorAll('button')].find((item) => item.textContent === 'Cerrar sesión')
    button.click()
    button.click()
    expect(button.disabled).toBe(true)
    expect(onLogout).toHaveBeenCalledTimes(1)
    finish()
    await vi.waitFor(() => expect(button.disabled).toBe(false))
  })
})
