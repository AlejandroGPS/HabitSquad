import { describe, expect, it } from 'vitest'
import { panelBackLink } from './navigation.js'

describe('panelBackLink', () => {
  it('usa la flecha simple seguida del destino', () => {
    const link = panelBackLink({ href: '/', label: 'Mis escuadrones' })

    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/')
    expect(link.hasAttribute('data-link')).toBe(true)
    expect(link.textContent).toBe('← Mis escuadrones')
    expect(link.querySelector('svg')).toBeNull()
    expect(link.className).toContain('text-accent')
    expect(link.className).toContain('whitespace-nowrap')
    expect(link.className).not.toContain('glass')
    expect(link.hasAttribute('aria-label')).toBe(false)
  })

  it('conserva el nombre accesible cuando el destino visible es más corto', () => {
    const link = panelBackLink({ href: '/escuadrones/panel?id=7', label: 'Panel', ariaLabel: 'Volver al panel' })

    expect(link.textContent).toBe('← Panel')
    expect(link.getAttribute('aria-label')).toBe('Volver al panel')
    expect(link.className).not.toContain('justify-center')
  })

  it('sin destino visible deja solo la flecha y el nombre accesible', () => {
    const link = panelBackLink({ href: '/escuadrones/panel?id=7', ariaLabel: 'Volver al panel' })

    expect(link.textContent).toBe('←')
    expect(link.getAttribute('aria-label')).toBe('Volver al panel')
    expect(link.className).toContain('justify-center')
    expect(link.className).toContain('min-h-11')
  })
})
