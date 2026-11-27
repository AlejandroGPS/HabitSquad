import { afterEach, describe, expect, it, vi } from 'vitest'
import { menuScreen } from './menu.js'

afterEach(() => { document.body.replaceChildren() })

describe('menuScreen', () => {
  it('mantiene las acciones de crear y unirse disponibles mientras carga la lista', () => {
    const menu = menuScreen({ loadSquads: () => new Promise(() => {}) })
    expect(menu.querySelector('[role="status"]').textContent).toContain('Cargando')
    expect(menu.querySelectorAll('.buscar-shimmer').length).toBeGreaterThan(0)
    expect(menu.querySelector('a[href="/escuadrones/nuevo"]').textContent).toBe('Crear un escuadrón')
    expect(menu.textContent).toContain('¿Tienes un código?')
    expect(menu.textContent).not.toContain('Mis escuadrones')
    expect(menu.querySelectorAll('a[aria-label^="Unirme a"]')).toHaveLength(0)
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

  it('filtra por nombre y por hábito, y deja fuera los escuadrones completos', async () => {
    const menu = menuScreen({
      loadSquads: async () => [
        {
          id: 1,
          nombre: 'Lectores nocturnos',
          racha: 34,
          miembros: [{ usuario_id: 1, habito: { opcion: 'leer', texto_personalizado: '' } }],
        },
        {
          id: 2,
          nombre: 'Madrugadores',
          racha: 40,
          miembros: Array.from({ length: 5 }, (_, index) => ({
            usuario_id: index + 1,
            habito: { opcion: 'otro', texto_personalizado: 'Correr 30 minutos' },
          })),
        },
      ],
    })
    await vi.waitFor(() => expect(menu.querySelectorAll('.buscar-card')).toHaveLength(2))
    expect(menu.textContent).toContain('34 días')
    expect(menu.textContent).toContain('LN')
    expect(menu.textContent).not.toContain('días de racha')
    expect(menu.querySelector('a[aria-label="Unirme a Lectores nocturnos"]')).not.toBeNull()
    expect(menu.querySelector('a[aria-label="Abrir panel de Madrugadores"]').textContent).toBe('Completo')

    const search = menu.querySelector('#buscar-escuadron')
    search.value = 'nocturn'
    search.dispatchEvent(new Event('input'))
    expect(menu.textContent).toContain('Lectores nocturnos')
    expect(menu.textContent).not.toContain('Madrugadores')
    expect(menu.querySelector('#buscar-resultados').textContent).toBe('1 resultado')

    search.value = ''
    search.dispatchEvent(new Event('input'))
    ;[...menu.querySelectorAll('button')].find((button) => button.textContent === 'Lectura').click()
    expect(menu.textContent).toContain('Lectura')
    expect(menu.textContent).not.toContain('Madrugadores')
    ;[...menu.querySelectorAll('button')].find((button) => button.textContent === 'Con plazas libres').click()
    expect(menu.textContent).toContain('Lectores nocturnos')
    expect(menu.textContent).not.toContain('Madrugadores')
    ;[...menu.querySelectorAll('button')].find((button) => button.textContent === 'Todos').click()
    expect([...menu.querySelectorAll('h3')].map((title) => title.textContent)).toEqual([
      'Madrugadores',
      'Lectores nocturnos',
    ])
    menu.querySelector('select').value = 'nombre'
    menu.querySelector('select').dispatchEvent(new Event('change'))
    expect([...menu.querySelectorAll('h3')].map((title) => title.textContent)).toEqual([
      'Lectores nocturnos',
      'Madrugadores',
    ])
  })

  it('pide el código completo y abre el escuadrón al unirse', async () => {
    const onJoin = vi.fn().mockResolvedValue({ id: 4, nombre: 'Lectores nocturnos' })
    const navigate = vi.fn()
    const menu = menuScreen({ loadSquads: async () => [], onJoin, navigate })
    const form = menu.querySelector('form[aria-label="Unirme con un código"]')
    const inputs = [...form.querySelectorAll('input')]

    form.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(form.querySelector('[role="alert"]').textContent).toBe('Introduce el código completo de 6 caracteres.')
    expect(onJoin).not.toHaveBeenCalled()

    for (const [index, char] of [...'k7p2qx'].entries()) {
      inputs[index].value = char
      inputs[index].dispatchEvent(new Event('input'))
    }
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/escuadrones/panel?id=4'))
    expect(onJoin).toHaveBeenCalledWith('K7P2QX')
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
