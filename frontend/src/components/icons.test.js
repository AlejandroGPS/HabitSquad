import { describe, expect, it } from 'vitest'
import { flameIcon, icon } from './icons.js'

describe('icon', () => {
  it('dibuja los iconos de línea con trazo y sin relleno', () => {
    const node = icon('check')

    expect(node.getAttribute('fill')).toBe('none')
    expect(node.getAttribute('stroke')).toBe('currentColor')
    expect(node.getAttribute('stroke-width')).toBe('2')
    expect(node.getAttribute('aria-hidden')).toBe('true')
    expect(node.getAttribute('class')).toBe('h-5 w-5 shrink-0')
    expect(node.querySelectorAll('path')).toHaveLength(1)
  })

  it('acepta otra clase y otro grosor de trazo', () => {
    const node = icon('users', 'h-4 w-4', 3)

    expect(node.getAttribute('class')).toBe('h-4 w-4')
    expect(node.getAttribute('stroke-width')).toBe('3')
    expect(node.querySelectorAll('path')).toHaveLength(4)
  })

  it('usa la llama rellena para "flame"', () => {
    const node = icon('flame', 'h-4 w-4')

    expect(node.getAttribute('fill')).toBe('currentColor')
    expect(node.hasAttribute('stroke')).toBe(false)
    expect(node.getAttribute('class')).toBe('h-4 w-4')
  })
})

describe('flameIcon', () => {
  it('tiene una clase por defecto', () => {
    expect(flameIcon().getAttribute('class')).toBe('h-7 w-7 shrink-0')
  })
})
