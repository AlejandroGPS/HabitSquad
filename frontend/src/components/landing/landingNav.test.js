import { afterEach, describe, expect, it } from 'vitest'
import { landingNav } from './landingNav.js'

const enlaces = (header) => [...header.querySelectorAll('a[data-zona]')]

describe('barra de arriba según la pantalla', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('dentro de la app enlaza a sus secciones en vez de a las de la portada', () => {
    const header = landingNav({ cuenta: null, zona: 'escuadrones' })

    expect(enlaces(header).map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Mis escuadrones', '/escuadrones'],
      ['Alertas', '/alertas'],
    ])
    expect(header.querySelector('a[href="/perfil"]')).toBeNull()
    expect(header.querySelector('a[href^="/#"], a[href^="#"]')).toBeNull()
    expect(enlaces(header).every((link) => link.dataset.link === '')).toBe(true)
  })

  it.each([
    ['escuadrones', '/escuadrones', 'Mis escuadrones'],
    ['alertas', '/alertas', 'Alertas'],
  ])('en %s marca solo esa sección como la página actual', (zona, ruta, nombre) => {
    window.history.replaceState(null, '', ruta)
    const header = landingNav({ cuenta: null, zona })
    const marcados = header.querySelectorAll('[aria-current]')

    expect([...marcados].map((link) => link.textContent)).toEqual([nombre])
    expect(marcados[0].getAttribute('aria-current')).toBe('page')
    expect(marcados[0].className).toContain('text-accent')
    expect(enlaces(header).filter((link) => link !== marcados[0]).every((link) => !link.className.includes('text-accent'))).toBe(true)
  })

  it('en el perfil enseña las secciones sin marcar ninguna: lo marca el menú de la cuenta', () => {
    window.history.replaceState(null, '', '/perfil')
    const header = landingNav({ cuenta: null, zona: 'perfil' })

    expect(enlaces(header)).toHaveLength(2)
    expect(header.querySelector('[aria-current]')).toBeNull()
  })

  it('en una subpantalla marca su sección sin decir que es esa misma página', () => {
    window.history.replaceState(null, '', '/escuadrones/nuevo')
    const actual = landingNav({ cuenta: null, zona: 'escuadrones' }).querySelector('[aria-current]')

    expect(actual.textContent).toBe('Mis escuadrones')
    expect(actual.getAttribute('aria-current')).toBe('true')
  })

  it('en el móvil se ven los iconos y el nombre sigue disponible para lectores de pantalla', () => {
    const header = landingNav({ cuenta: null, zona: 'perfil' })
    const grupo = enlaces(header)[0].parentElement

    expect(grupo.className.split(' ')).not.toContain('hidden')
    for (const link of enlaces(header)) {
      expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
      expect(link.querySelector('span').className).toBe('sr-only sm:not-sr-only')
    }
  })

  it('sin zona sigue siendo la barra de la portada', () => {
    const header = landingNav({ cuenta: null })

    expect(enlaces(header)).toHaveLength(0)
    expect([...header.querySelectorAll('a[href^="/#"]')].map((link) => link.textContent)).toEqual(['Cómo funciona', 'Tu escuadrón', 'Tengo un código'])
    expect(header.querySelector('a[href^="/#"]').parentElement.className).toContain('hidden')
  })
})
