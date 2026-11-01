import { afterEach, describe, expect, it, vi } from 'vitest'
import { panelEscuadronScreen } from './panelEscuadron.js'

const AHORA = new Date(2026, 9, 25, 20, 18)

const ESCUADRON = { nombre: 'Los Inquebrantables', codigo: 'K7P2QX', racha: 12 }

const MIEMBROS = [
  { nombre: 'Carlos', habito: 'Gimnasio', estado: 'cumplido' },
  { nombre: 'Laura', habito: 'Leer', estado: 'pendiente' },
  { nombre: 'Alejandro', habito: 'Leer un libro', estado: 'sin-prueba', esUsuario: true },
]

function mount({ escuadron = ESCUADRON, miembros = MIEMBROS, ahora = AHORA, acciones } = {}) {
  const screen = panelEscuadronScreen({ escuadron, miembros, ahora, acciones })
  document.body.replaceChildren(screen)
  return screen
}

function card(screen, title) {
  return [...screen.querySelectorAll('section')].find(
    (section) => section.querySelector('p, h2')?.textContent.startsWith(title),
  )
}

function buttonByText(root, text) {
  return [...root.querySelectorAll('button')].find((button) => button.textContent === text)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('panelEscuadronScreen', () => {
  it('pone el nombre del escuadrón en la cabecera y en la barra lateral', () => {
    const screen = mount()

    expect(screen.querySelector('header p').textContent).toBe('Escuadrón')
    expect(screen.querySelector('h1').textContent).toBe('Los Inquebrantables')
    expect(screen.querySelector('header span').textContent).toBe('LI')
    expect(screen.querySelector('aside').textContent).toContain('Los Inquebrantables3 de 5 miembros')
  })

  it('muestra la racha, las alertas y el menú de la cuenta', () => {
    const header = mount().querySelector('header')
    const hrefs = [...header.querySelectorAll('a[data-link]')].map((link) => link.getAttribute('href'))

    expect(header.textContent).toContain('12')
    expect(header.querySelector('.sr-only').textContent).toBe('Alertas')
    expect(header.querySelector('[aria-label="Tu cuenta"]').textContent).toBe('A')
    expect(hrefs).toEqual(['/escuadrones/nuevo', '/escuadrones/unirse'])
  })

  it('marca la sección Escuadrón como activa', () => {
    expect(mount().querySelector('aside [aria-current="page"]').textContent).toBe('Escuadrón')
  })

  it('monta todas las tarjetas con los datos del escuadrón', () => {
    const screen = mount({ escuadron: { ...ESCUADRON, plazas: 4, cierre: '22:00' } })

    expect(card(screen, 'Racha').textContent).toContain('12días seguidos')
    expect(card(screen, 'Hoy').textContent).toBe('Hoy1/3')
    expect(card(screen, 'Cierra').textContent).toBe('Cierra22:00Quedan 01:42 h')
    expect(card(screen, 'Esta semana')).toBeDefined()
    expect(card(screen, 'Mi hábito').textContent).toContain('Leer un libroSube una foto antes de las 22:00')
    expect(card(screen, 'Miembros').querySelector('h2').textContent).toBe('Miembros3 de 4')
    expect(card(screen, 'Invita').textContent).toContain('K7P2QXQueda 1 plaza')
  })

  it('conecta las acciones con las tarjetas', () => {
    const acciones = {
      subirPrueba: vi.fn(),
      verFoto: vi.fn(),
      votar: vi.fn(),
      cerrarSesion: vi.fn(),
    }
    const screen = mount({ acciones })
    const miembros = card(screen, 'Miembros')

    buttonByText(card(screen, 'Mi hábito'), 'Subir foto de prueba').click()
    buttonByText(miembros, 'Ver foto').click()
    buttonByText(miembros, 'Votar').click()

    expect(acciones.subirPrueba).toHaveBeenCalledOnce()
    expect(acciones.verFoto).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Carlos' }))
    expect(acciones.votar).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Laura' }))
    expect(screen.querySelector('header button:not([aria-label])').disabled).toBe(false)
  })

  it('pide elegir hábito si el usuario aún no tiene', () => {
    const elegirHabito = vi.fn()
    const screen = mount({ miembros: [{ nombre: 'Alejandro', esUsuario: true }], acciones: { elegirHabito } })

    buttonByText(card(screen, 'Mi hábito'), 'Elegir mi hábito').click()
    expect(elegirHabito).toHaveBeenCalledOnce()
  })

  it('usa valores por defecto sin miembros ni datos opcionales', () => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
    const screen = panelEscuadronScreen({ escuadron: { nombre: 'Nuevo', codigo: 'ABC123' } })
    document.body.replaceChildren(screen)

    expect(card(screen, 'Racha').textContent).toContain('0días seguidos')
    expect(card(screen, 'Hoy').textContent).toBe('Hoy0/0')
    expect(card(screen, 'Cierra').textContent).toBe('Cierra23:59Quedan 03:41 h')
    expect(card(screen, 'Invita').textContent).toContain('Quedan 5 plazas')
    expect(card(screen, 'Mi hábito').textContent).toContain('Aún no has elegido tu hábito')
    expect(screen.querySelector('[aria-label="Tu cuenta"]').textContent).toBe('?')
  })
})
