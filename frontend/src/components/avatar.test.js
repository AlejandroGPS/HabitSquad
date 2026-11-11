import { describe, expect, it } from 'vitest'
import { iniciales, squadAvatar } from './avatar.js'

describe('iniciales', () => {
  it('coge la primera letra de las dos primeras palabras', () => {
    expect(iniciales('los inquebrantables de siempre')).toBe('LI')
  })

  it('funciona con una palabra y con espacios de más', () => {
    expect(iniciales('  laura  ')).toBe('L')
  })

  it('devuelve "?" si no hay nombre', () => {
    expect(iniciales('')).toBe('?')
    expect(iniciales(undefined)).toBe('?')
  })
})

describe('squadAvatar', () => {
  it('muestra las iniciales del escuadrón con el tamaño por defecto', () => {
    const avatar = squadAvatar({ nombre: 'Los Inquebrantables' })

    expect(avatar.textContent).toBe('LI')
    expect(avatar.classList.contains('h-12')).toBe(true)
  })

  it('acepta otro tamaño', () => {
    expect(squadAvatar({ nombre: 'Leones', className: 'h-10 w-10' }).classList.contains('h-10')).toBe(true)
  })
})
