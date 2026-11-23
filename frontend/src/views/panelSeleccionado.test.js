import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api.js'
import { panelSeleccionadoScreen } from './panelSeleccionado.js'

const squad = {
  id: 7,
  nombre: 'Lectores',
  codigo_invitacion: 'ABC123',
  miembros: [
    { usuario_id: 1, nickname: 'ana', foto_url: 'https://res.cloudinary.com/demo/perfiles/ana.jpg', es_usuario: true, habito: { opcion: 'leer', texto_personalizado: '' }, prueba_hoy: null },
    { usuario_id: 2, nickname: 'lau', foto_url: null, es_usuario: false, habito: { opcion: 'otro', texto_personalizado: 'Correr 5 km' }, prueba_hoy: { id: 21, estado: 'pendiente' } },
    { usuario_id: 3, nickname: '', foto_url: 'https://res.cloudinary.com/demo/perfiles/3.jpg', es_usuario: false, habito: null, prueba_hoy: { id: 22, estado: 'cumplido' } },
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
      const back = [...view.querySelectorAll('a')].find((link) => link.textContent === '← Mis escuadrones')
      expect(back.getAttribute('href')).toBe('/escuadrones')
      expect(back.hasAttribute('data-link')).toBe(true)
      expect(view.querySelector('.hueco')).toBeNull()
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

  it('mientras carga pinta las tarjetas vacías y el aviso queda para lectores de pantalla', async () => {
    const pending = deferred()
    api.getSquad.mockReturnValue(pending.promise)
    const view = mount()
    expect(view.querySelector('[role="status"]').classList.contains('sr-only')).toBe(true)
    expect(view.querySelectorAll('main [aria-hidden="true"]:has(.hueco)')).toHaveLength(5)
    pending.resolve(squad)
    await loaded(view)
    expect(view.querySelector('.hueco')).toBeNull()
  })

  it('las tarjetas cargadas entran una detrás de otra', async () => {
    const view = mount()
    await loaded(view)
    const tarjetas = [...view.querySelectorAll('.entrada')]
    expect(tarjetas).toHaveLength(5)
    expect(tarjetas.map((tarjeta) => tarjeta.style.getPropertyValue('--orden'))).toEqual(['0', '1', '2', '3', '4'])
    expect(view.querySelector('a[href="/escuadrones"]').classList.contains('entrada')).toBe(false)
  })

  it('pinta el escuadrón, el hábito propio, los miembros y el código de invitación', async () => {
    const view = mount()
    await loaded(view)
    expect(api.getDailyHabit).toHaveBeenCalledWith('7')
    expect(view.textContent).toContain('Leer')
    expect(view.textContent).toContain('3 de 5 miembros')
    const items = [...view.querySelectorAll('li')].map((item) => item.textContent)
    expect(items[0]).toBe('anaTúLeer · Sin prueba')
    expect(items[1]).toBe('Llau' + 'Correr 5 km · Pendiente' + 'Votar')
    expect(items[2]).toBe('Miembro 3' + 'Sin hábito · Cumplido' + 'Ver foto')
    expect(view.textContent).toContain('ABC123')
    expect(view.textContent).toContain('Quedan 2 plazas')
    for (const link of view.querySelectorAll('a[href^="/habito"]')) {
      expect(link.getAttribute('href')).toBe('/habito?escuadron=7')
    }
  })

  it('pinta la foto de perfil de cada miembro que la tiene y las iniciales del resto', async () => {
    const view = mount()
    await loaded(view)
    const items = [...view.querySelectorAll('li')]
    expect(items[0].querySelector('img').getAttribute('src')).toBe('https://res.cloudinary.com/demo/perfiles/ana.jpg')
    expect(items[1].querySelector('img')).toBeNull()
    expect(items[2].querySelector('img').getAttribute('src')).toBe('https://res.cloudinary.com/demo/perfiles/3.jpg')
  })

  it('la cuenta muestra el nickname y la foto del usuario que vienen con el escuadrón', async () => {
    const pending = deferred()
    api.getSquad.mockReturnValue(pending.promise)
    const view = mount()
    const cuenta = () => view.querySelector('[aria-label="Tu cuenta"]')
    expect(cuenta().querySelector('img')).toBeNull()
    expect(cuenta().querySelector('svg')).not.toBeNull()
    pending.resolve(squad)
    await loaded(view)
    await vi.waitFor(() => expect(cuenta().querySelector('img')?.getAttribute('src'))
      .toBe('https://res.cloudinary.com/demo/perfiles/ana.jpg'))
    expect(view.querySelector('[id^="menu-cuenta-"]').textContent).toContain('ana')
  })

  it('la cuenta usa las iniciales del nickname si el usuario no tiene foto', async () => {
    api.getSquad.mockResolvedValue({
      ...squad,
      miembros: [{ ...squad.miembros[0], foto_url: null }, ...squad.miembros.slice(1)],
    })
    const view = mount()
    await loaded(view)
    await vi.waitFor(() => expect(view.querySelector('[aria-label="Tu cuenta"]').textContent).toBe('A'))
    expect(view.querySelector('[aria-label="Tu cuenta"] img')).toBeNull()
  })

  it('pinta el resumen: racha, cumplidos de hoy, cierre y semana de cada miembro', async () => {
    const dias = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']
    const semana = (...estados) => dias.map((fecha, indice) => ({ fecha, estado: estados[indice] ?? null }))
    api.getSquad.mockResolvedValue({
      ...squad,
      racha: 4,
      miembros: [
        { ...squad.miembros[0], semana: semana('cumplido', 'no_cumplido') },
        { ...squad.miembros[1], semana: semana('cumplido', 'cumplido', 'pendiente') },
        { ...squad.miembros[2], semana: semana(null, null, 'cumplido') },
      ],
    })
    const view = panelSeleccionadoScreen({ navigate, api, ahora: () => new Date(2026, 10, 11, 20, 30) })
    document.body.replaceChildren(view)
    await loaded(view)

    const tarjeta = (titulo) => [...view.querySelectorAll('section')].find((item) => item.textContent.startsWith(titulo))
    expect(tarjeta('Racha').textContent).toBe(
      'Racha' + '4días seguidos' + 'Hoy 1 de 3 ha cumplido' + 'Cierra a las 23:59' + 'Quedan 03:29 h para subir la prueba',
    )

    const semanaTabla = tarjeta('Esta semana').querySelector('table')
    expect([...semanaTabla.querySelectorAll('thead th[scope="col"]')].map((dia) => dia.textContent)).toEqual([
      'Llunes 9', 'Mmartes 10', 'Xmiércoles 11', 'Jjueves 12', 'Vviernes 13', 'Ssábado 14', 'Ddomingo 15',
    ])
    const filas = [...semanaTabla.querySelectorAll('tbody tr')]
    const casillas = (fila) => [...fila.querySelectorAll('td')].map((celda) => celda.textContent)
    const futuro = Array(4).fill('Por llegar')
    expect(filas.map((fila) => fila.querySelector('th').textContent)).toEqual(['ana', 'Llau', 'Miembro 3'])
    expect(casillas(filas[0])).toEqual(['Cumplido', 'No cumplido', 'Sin prueba', ...futuro])
    expect(casillas(filas[1])).toEqual(['Cumplido', 'Cumplido', 'Pendiente', ...futuro])
    expect(casillas(filas[2])).toEqual(['Sin prueba', 'Sin prueba', 'Cumplido', ...futuro])
  })

  it('reparte las tarjetas en la rejilla y todas se ven también en el móvil', async () => {
    const view = mount()
    await loaded(view)
    const tarjetas = [...view.querySelectorAll('.entrada')]
    const columnas = tarjetas.map((tarjeta) => tarjeta.className.match(/(lg|xl):col-span-\d/g)?.join(' ') ?? null)
    expect(columnas).toEqual(['xl:col-span-2', null, 'xl:col-span-2', null, 'lg:col-span-2 xl:col-span-3'])
    expect(tarjetas.some((tarjeta) => tarjeta.classList.contains('hidden'))).toBe(false)
  })

  it('la tarjeta del hábito lleva la foto, el nickname y el estado de hoy del usuario', async () => {
    api.getSquad.mockResolvedValue({
      ...squad,
      miembros: [{ ...squad.miembros[0], prueba_hoy: { id: 30, estado: 'pendiente' } }, ...squad.miembros.slice(1)],
    })
    const view = mount()
    await loaded(view)
    const habito = [...view.querySelectorAll('section')].find((item) => item.textContent.includes('Mi hábito'))
    expect(habito.textContent).toContain('anaHoy: PendienteMi hábitoLeer')
    expect(habito.querySelector('img').getAttribute('src')).toBe('https://res.cloudinary.com/demo/perfiles/ana.jpg')
  })

  it('el escuadrón se resume en la barra lateral y la racha ya no se repite en la cabecera', async () => {
    const view = mount()
    await loaded(view)
    expect(view.querySelector('aside').textContent).toContain('Lectores3 de 5 miembros')
    expect(view.querySelector('header .text-streak')).toBeNull()
  })

  it('sin racha ni semana del servidor empieza en cero y pinta solo hoy', async () => {
    const view = panelSeleccionadoScreen({ navigate, api, ahora: () => new Date(2026, 10, 11, 23, 59, 30) })
    document.body.replaceChildren(view)
    await loaded(view)
    expect(view.textContent).toContain('0días seguidos')
    expect(view.textContent).toContain('El día ya ha cerrado')
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
    expect(view.querySelector('.hueco')).toBeNull()
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
    expect(view.querySelector('.hueco')).not.toBeNull()
    expect(retry(view).hidden).toBe(true)
    retry(view).click()
    expect(api.getSquad).toHaveBeenCalledTimes(2)
    pending.resolve(squad)
    await loaded(view)
  })
})
