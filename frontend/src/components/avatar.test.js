import { describe, expect, it } from 'vitest'
import { fotoAvatar, iniciales, squadAvatar } from './avatar.js'

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

describe('fotoAvatar', () => {
  it('pinta las iniciales si no hay foto', () => {
    const avatar = fotoAvatar({ nombre: 'lau' })

    expect(avatar.textContent).toBe('L')
    expect(avatar.querySelector('img')).toBeNull()
  })

  it('pinta la foto sin mandar el origen a Cloudinary', () => {
    const foto = fotoAvatar({ nombre: 'ale', fotoUrl: 'https://res.cloudinary.com/demo/ale.jpg' }).querySelector('img')

    expect(foto.getAttribute('src')).toBe('https://res.cloudinary.com/demo/ale.jpg')
    expect(foto.alt).toBe('')
    expect(foto.referrerPolicy).toBe('no-referrer')
  })

  it('vuelve a las iniciales si la foto no carga', () => {
    const avatar = fotoAvatar({ nombre: 'carlos', fotoUrl: 'https://res.cloudinary.com/demo/rota.jpg' })

    avatar.querySelector('img').dispatchEvent(new Event('error'))

    expect(avatar.querySelector('img')).toBeNull()
    expect(avatar.textContent).toBe('C')
  })
})
