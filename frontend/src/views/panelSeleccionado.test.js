import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api.js'
import { panelSeleccionadoScreen } from './panelSeleccionado.js'

const squad = {
  id: 7,
  nombre: 'Lectores',
  codigo_invitacion: 'ABC123',
  miembros: [
    { usuario_id: 1, nombre: 'Ana', es_usuario: true, habito: { opcion: 'leer', texto_personalizado: '' }, prueba_hoy: null },
    { usuario_id: 2, nombre: 'Laura', es_usuario: false, habito: { opcion: 'otro', texto_personalizado: 'Correr 5 km' }, prueba_hoy: { id: 21, estado: 'pendiente' } },
    { usuario_id: 3, nombre: '', es_usuario: false, habito: null, prueba_hoy: { id: 22, estado: 'cumplido' } },
  ],
}
const ownHabit = squad.miembros[0].habito

function deferred() {
  let resolve
  let reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

describe('panel del escuadrón: carga de datos y estados', () => {
  let api
  let navigate
  beforeEach(() => {
    window.history.replaceState({}, '', '/escuadrones/panel?id=7')
    api = { getSquad: vi.fn().mockResolvedValue(squad), getDailyHabit: vi.fn().mockResolvedValue(ownHabit) }
    navigate = vi.fn()
  })
  afterEach(() => {
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
  })

  function mount() {
    const view = panelSeleccionadoScreen({ navigate, api })
    document.body.replaceChildren(view)
    return view
  }
  const button = (view, text) => [...view.querySelectorAll('button')].find((item) => item.textContent.includes(text))
  const retry = (view) => button(view, 'Reintentar')
  const loaded = (view) => vi.waitFor(() => expect(view.querySelector('h1').textContent).toBe('Lectores'))

  it.each([['/escuadrones/panel'], ['/escuadrones/panel?id=abc'], ['/escuadrones/panel?id=0'], ['/escuadrones/panel?id=-3']])(
    'con la URL %s pide elegir un escuadrón sin llamar a la API',
    (url) => {
      window.history.replaceState({}, '', url)
      const view = mount()
      expect(view.querySelector('[role="status"]').textContent).toBe('Selecciona un escuadrón desde Mis escuadrones.')
      expect(api.getSquad).not.toHaveBeenCalled()
      expect(api.getDailyHabit).not.toHaveBeenCalled()
      expect(retry(view).hidden).toBe(true)
    },
  )

  it('muestra «Cargando escuadrón…» mientras espera la respuesta', async () => {
    const pending = deferred()
    api.getSquad.mockReturnValue(pending.promise)
    const view = mount()
    expect(view.querySelector('[role="status"]').textContent).toBe('Cargando escuadrón…')
    expect(view.querySelector('[role="alert"]').textContent).toBe('')
    expect(retry(view).hidden).toBe(true)
    expect(api.getSquad).toHaveBeenCalledWith('7')
    pending.resolve(squad)
    await loaded(view)
    expect(view.textContent).not.toContain('Cargando escuadrón…')
  })

  it('pinta el escuadrón, el hábito propio, los miembros y el código de invitación', async () => {
    const view = mount()
    await loaded(view)
    expect(api.getDailyHabit).toHaveBeenCalledWith('7')
    expect(view.textContent).toContain('Leer')
    expect(view.textContent).toContain('3 de 5 miembros')
    const items = [...view.querySelectorAll('li')].map((item) => item.textContent)
    expect(items[0]).toContain('Tú')
    expect(items[0]).toContain('Leer · Sin prueba')
    expect(items[1]).toContain('Laura')
    expect(items[1]).toContain('Correr 5 km · Pendiente')
    expect(items[2]).toContain('Miembro 3')
    expect(items[2]).toContain('Sin hábito · Cumplido')
    expect(view.textContent).toContain('ABC123')
    expect(view.textContent).toContain('Quedan 2 plazas')
    for (const link of view.querySelectorAll('a[href^="/habito"]')) {
      expect(link.getAttribute('href')).toBe('/habito?escuadron=7')
    }
  })

  it('sin hábito propio invita a elegirlo y lleva a la pantalla del hábito', async () => {
    api.getDailyHabit.mockResolvedValue(null)
    const view = mount()
    await loaded(view)
    expect(view.textContent).toContain('Aún no has elegido tu hábito')
    button(view, 'Elegir mi hábito').click()
    expect(navigate).toHaveBeenCalledWith('/habito?escuadron=7')
  })

  it('lleva a subir la prueba o, si ya la ha subido, a verla', async () => {
    let view = mount()
    await loaded(view)
    button(view, 'Subir foto de prueba').click()
    expect(navigate).toHaveBeenCalledWith('/prueba?escuadron=7')

    api.getSquad.mockResolvedValue({
      ...squad,
      miembros: [{ ...squad.miembros[0], prueba_hoy: { id: 30, estado: 'pendiente' } }, ...squad.miembros.slice(1)],
    })
    view = mount()
    await loaded(view)
    expect(button(view, 'Subir foto de prueba')).toBeUndefined()
    button(view, 'Ver mi prueba').click()
    expect(navigate).toHaveBeenLastCalledWith('/escuadrones/prueba?escuadron=7&registro=30')
  })

  it.each([[403], [404]])('con %i avisa de que el escuadrón no está disponible', async (status) => {
    api.getSquad.mockRejectedValue(new ApiError(status))
    const view = mount()
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent)
      .toBe('Este escuadrón no está disponible para tu cuenta. Vuelve a Mis escuadrones.'))
    expect(view.querySelector('[role="status"]').textContent).toBe('')
    expect(retry(view).hidden).toBe(false)
  })

  it.each([
    ['un fallo de red', new TypeError('Failed to fetch')],
    ['un error 500', new ApiError(500)],
  ])('con %s pide comprobar la conexión', async (_, cause) => {
    api.getSquad.mockRejectedValue(cause)
    const view = mount()
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent)
      .toBe('No se ha podido cargar el escuadrón. Comprueba tu conexión y reintenta.'))
    expect(retry(view).hidden).toBe(false)
  })

  it('también muestra el error si falla la carga del hábito', async () => {
    api.getDailyHabit.mockRejectedValue(new TypeError('Failed to fetch'))
    const view = mount()
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent)
      .toContain('No se ha podido cargar el escuadrón'))
    expect(view.querySelector('h1').textContent).toBe('Panel del escuadrón')
  })

  it('«Reintentar» vuelve a cargar, limpia el error y pinta el escuadrón', async () => {
    api.getSquad.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const view = mount()
    await vi.waitFor(() => expect(retry(view).hidden).toBe(false))
    const pending = deferred()
    api.getSquad.mockReturnValueOnce(pending.promise)
    retry(view).click()
    expect(view.querySelector('[role="alert"]').textContent).toBe('')
    expect(view.querySelector('[role="status"]').textContent).toBe('Cargando escuadrón…')
    expect(retry(view).hidden).toBe(true)
    retry(view).click()
    expect(api.getSquad).toHaveBeenCalledTimes(2)
    pending.resolve(squad)
    await loaded(view)
  })
})
