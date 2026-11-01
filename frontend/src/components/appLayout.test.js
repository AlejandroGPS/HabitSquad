import { describe, expect, it } from 'vitest'
import { APP_NAV, appLayout } from './appLayout.js'

function mount(options = {}) {
  const screen = appLayout({
    active: 'escuadron',
    kicker: 'Escuadrón',
    title: 'Los Inquebrantables',
    body: document.createElement('section'),
    ...options,
  })
  document.body.replaceChildren(screen)
  return screen
}

function navLabels(nav) {
  return [...nav.children].map((item) => item.textContent)
}

describe('appLayout', () => {
  it('muestra el antetítulo, el título y el contenido', () => {
    const body = document.createElement('section')
    body.textContent = 'Contenido'
    const screen = mount({ body })

    expect(screen.tagName).toBe('MAIN')
    expect(screen.querySelector('header p').textContent).toBe('Escuadrón')
    expect(screen.querySelector('h1').textContent).toBe('Los Inquebrantables')
    expect(screen.contains(body)).toBe(true)
  })

  it('pone la barra lateral con todas las secciones y la de pestañas sin las de solo web', () => {
    const screen = mount()
    const [sidebarNav, tabBar] = screen.querySelectorAll('nav[aria-label="Secciones"]')

    expect(navLabels(sidebarNav)).toEqual(APP_NAV.map(({ label }) => label))
    expect(navLabels(tabBar)).toEqual(['Escuadrón', 'Racha', 'Alertas'])
    expect(screen.querySelector('aside a[href="/"]').textContent).toBe('HabitSquad')
  })

  it('enlaza las secciones con ruta y desactiva las que aún no existen', () => {
    const screen = mount()
    const [sidebarNav] = screen.querySelectorAll('nav[aria-label="Secciones"]')
    const [escuadron, racha] = sidebarNav.children

    expect(escuadron.tagName).toBe('A')
    expect(escuadron.getAttribute('href')).toBe('/')
    expect(escuadron.hasAttribute('data-link')).toBe(true)
    expect(racha.tagName).toBe('SPAN')
    expect(racha.getAttribute('aria-disabled')).toBe('true')
  })

  it('marca la sección activa', () => {
    const screen = mount({ active: 'racha' })
    const current = [...screen.querySelectorAll('[aria-current="page"]')]

    expect(current.map((item) => item.textContent)).toEqual(['Racha', 'Racha'])
  })

  it('añade los elementos opcionales de la cabecera y de la barra lateral', () => {
    const leading = document.createElement('span')
    const trailing = document.createElement('button')
    const sidebarFooter = document.createElement('p')
    const screen = mount({ leading, trailing, sidebarFooter })

    expect(screen.querySelector('header').contains(leading)).toBe(true)
    expect(screen.querySelector('header').contains(trailing)).toBe(true)
    expect(screen.querySelector('aside').contains(sidebarFooter)).toBe(true)
  })

  it('no deja huecos vacíos si faltan los elementos opcionales', () => {
    const screen = mount()

    expect(screen.querySelector('header').children).toHaveLength(1)
    expect(screen.querySelector('aside').children).toHaveLength(2)
  })
})
