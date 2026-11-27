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
    expect(menu.textContent).not.toContain('Cerrar sesión')
    expect(menu.querySelector('[aria-label="Filtrar escuadrones"]')).toBeNull()
    expect(menu.querySelectorAll('a[aria-label^="Unirme a"]')).toHaveLength(0)
  })

  it('filtra por nombre y deja el escuadrón completo sin plaza', async () => {
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
    expect(menu.textContent).not.toContain('Lectura')
    expect(menu.textContent).not.toContain('Con plazas libres')
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

  it('lista el hábito de cada miembro y no le pone una categoría al escuadrón', async () => {
    const menu = menuScreen({
      loadSquads: async () => [
        {
          id: 3,
          nombre: 'Mixto',
          miembros: [
            { usuario_id: 1, habito: { opcion: 'leer', texto_personalizado: '' } },
            { usuario_id: 2, habito: { opcion: 'gimnasio', texto_personalizado: '' } },
            { usuario_id: 3, habito: { opcion: 'leer', texto_personalizado: '' } },
          ],
        },
      ],
    })
    await vi.waitFor(() => expect(menu.textContent).toContain('Leer · Ir al gimnasio'))
    expect(menu.textContent).not.toContain('Lectura')
    expect(menu.textContent).not.toContain('Deporte')
    expect(menu.querySelector('[aria-label="Filtrar escuadrones"]')).toBeNull()
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
})
