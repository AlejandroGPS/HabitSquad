import { afterEach, describe, expect, it, vi } from 'vitest'
import { accountMenu } from './accountMenu.js'

function mount(options = {}) {
  const menu = accountMenu(options)
  document.body.replaceChildren(menu)
  return menu
}

function panel(menu) {
  return menu.querySelector('[id^="menu-cuenta-"]')
}

function toggle(menu) {
  return menu.querySelector('[aria-label="Tu cuenta"]')
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('accountMenu', () => {
  it('muestra la inicial y deja el menú cerrado', () => {
    const menu = mount({ nombre: 'Alejandro' })

    expect(toggle(menu).textContent).toBe('A')
    expect(toggle(menu).getAttribute('aria-expanded')).toBe('false')
    expect(panel(menu).hidden).toBe(true)
    expect(panel(menu).textContent).toContain('Alejandro')
  })

  it('usa un marcador si no hay nombre', () => {
    const menu = mount()

    expect(toggle(menu).textContent).toBe('?')
    expect(panel(menu).textContent).toContain('Tu cuenta')
  })

  it('abre y cierra el menú al pulsar la inicial', () => {
    const menu = mount({ nombre: 'Alejandro' })

    toggle(menu).click()
    expect(panel(menu).hidden).toBe(false)
    expect(toggle(menu).getAttribute('aria-expanded')).toBe('true')

    toggle(menu).click()
    expect(panel(menu).hidden).toBe(true)
  })

  it('enlaza crear y unirse a un escuadrón', () => {
    const menu = mount({ nombre: 'Alejandro' })
    const hrefs = [...menu.querySelectorAll('a[data-link]')].map((link) => link.getAttribute('href'))

    expect(hrefs).toEqual(['/escuadrones/nuevo', '/escuadrones/unirse'])
  })

  it('cierra el menú al elegir un enlace', () => {
    const menu = mount({ nombre: 'Alejandro' })
    toggle(menu).click()

    menu.querySelector('a[href="/escuadrones/nuevo"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )

    expect(panel(menu).hidden).toBe(true)
  })

  it('cierra el menú con Escape y devuelve el foco', () => {
    const menu = mount({ nombre: 'Alejandro' })
    toggle(menu).click()

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(panel(menu).hidden).toBe(true)
    expect(document.activeElement).toBe(toggle(menu))
  })

  it('no hace nada con otra tecla o si ya está cerrado', () => {
    const menu = mount({ nombre: 'Alejandro' })

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(panel(menu).hidden).toBe(true)

    toggle(menu).click()
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(panel(menu).hidden).toBe(false)
  })

  it('cierra el menú al pulsar fuera', () => {
    const menu = mount({ nombre: 'Alejandro' })
    toggle(menu).click()

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(panel(menu).hidden).toBe(true)
  })

  it('deja de escuchar clics cuando el menú ya no está en la página', () => {
    const menu = mount({ nombre: 'Alejandro' })
    toggle(menu).click()
    menu.remove()

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(panel(menu).hidden).toBe(false)
  })

  it('desactiva cerrar sesión si no hay acción', () => {
    const menu = mount({ nombre: 'Alejandro' })
    const logoutButton = [...menu.querySelectorAll('button')].find(
      (button) => button.textContent === 'Cerrar sesión',
    )

    expect(logoutButton.disabled).toBe(true)
  })

  it('cierra la sesión y vuelve a habilitar el botón', async () => {
    const onLogout = vi.fn().mockResolvedValue()
    const menu = mount({ nombre: 'Alejandro', onLogout })
    const logoutButton = [...menu.querySelectorAll('button')].find(
      (button) => button.textContent === 'Cerrar sesión',
    )

    logoutButton.click()
    expect(logoutButton.disabled).toBe(true)
    await vi.waitFor(() => expect(onLogout).toHaveBeenCalledOnce())
    expect(logoutButton.disabled).toBe(false)
  })
})
