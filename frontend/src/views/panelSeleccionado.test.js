import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, logout } from '../api.js'
import { panelSeleccionadoScreen } from './panelSeleccionado.js'

vi.mock('../api.js', async (importOriginal) => ({ ...(await importOriginal()), logout: vi.fn().mockResolvedValue() }))

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
    expect(view.querySelector('aside a[href="/escuadrones/configuracion?origen=7"]')?.textContent).toBe('Configuración')
    expect(view.querySelector('aside a[href="/alertas"]')).toBeNull()
    expect(view.querySelector('aside a[href="/perfil/editar#recordatorio"]')).toBeNull()
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
    expect(view.querySelectorAll('main [aria-hidden="true"]:has(.hueco)')).toHaveLength(7)
    pending.resolve(squad)
    await loaded(view)
    expect(view.querySelector('.hueco')).toBeNull()
  })

  it('las tarjetas cargadas entran una detrás de otra', async () => {
    const view = mount()
    await loaded(view)
    const tarjetas = [...view.querySelectorAll('.entrada')]
    expect(tarjetas).toHaveLength(7)
    expect(tarjetas.map((tarjeta) => tarjeta.style.getPropertyValue('--orden'))).toEqual(['0', '1', '2', '3', '4', '5', '6'])
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
    const invita = [...view.querySelectorAll('section')].find((item) => item.textContent.includes('ABC123'))
    expect(invita.classList.contains('hidden')).toBe(false)
    for (const link of view.querySelectorAll('a[href^="/habito"]')) {
      expect(link.getAttribute('href')).toBe('/habito?escuadron=7')
    }
  })

  it('incluye Configuración en el menú del panel y en la cabecera móvil, conservando el escuadrón', async () => {
    const view = mount()
    await loaded(view)
    const nav = view.querySelector('aside nav')
    expect([...nav.children].map((item) => item.textContent)).toEqual(['Escuadrón', 'Mi hábito', 'Configuración'])
    const settings = nav.querySelector('a[href="/escuadrones/configuracion?origen=7"]')
    expect(settings.textContent).toBe('Configuración')
    expect(settings.hasAttribute('data-link')).toBe(true)
    expect(nav.querySelector('[aria-current="page"]').getAttribute('href')).toBe('/escuadrones/panel?id=7')
    expect(nav.querySelector('a[href="/habito?escuadron=7"]')).not.toBeNull()
    expect(view.querySelector('header a[aria-label="Configuración del escuadrón"]').getAttribute('href')).toBe(settings.getAttribute('href'))
    expect(view.textContent).not.toContain('Configuración · demo')
  })

  it('muestra el límite guardado en la API y los nicknames del detalle', async () => {
    api.getSquad.mockResolvedValue({ ...squad, limite_miembros: 8, miembros: squad.miembros.map((member) => ({ ...member, nickname: `nick${member.usuario_id}` })) })
    const view = mount()
    await loaded(view)
    expect(view.textContent).toContain('3 de 8 miembros')
    expect(view.textContent).toContain('Quedan 5 plazas')
    expect(view.textContent).toContain('nick2')
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

  it('si el foco está en la cuenta mientras carga, sigue ahí al pintar el escuadrón', async () => {
    const pending = deferred()
    api.getSquad.mockReturnValue(pending.promise)
    const view = mount()
    const cuenta = view.querySelector('[aria-label="Tu cuenta"]')
    cuenta.focus()
    pending.resolve(squad)
    await loaded(view)
    expect(document.activeElement).toBe(cuenta)
  })

  it('«Cerrar sesión» desde la cuenta cierra la sesión y lleva al login', async () => {
    const view = mount()
    await loaded(view)
    view.querySelector('[aria-label="Tu cuenta"]').click()
    button(view, 'Cerrar sesión').click()
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'))
    expect(logout).toHaveBeenCalledOnce()
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
    expect(view.textContent).toContain('4días seguidos')
    expect(view.textContent).toContain('1/3')
    expect(view.textContent).toContain('23:59')
    expect(view.textContent).toContain('Quedan 03:29 h')

    const filas = [...tarjeta('Esta semana').querySelectorAll('.flex.items-center.gap-3')]
    expect(filas.map((fila) => fila.querySelector('span').textContent)).toEqual(['L 9', 'M 10', 'X 11', 'J 12', 'V 13', 'S 14', 'D 15'])
    const barras = (fila) => [...fila.querySelectorAll('.rounded-full')].map((barra) => barra.className.split(' ').at(-1))
    expect(barras(filas[0])).toEqual(['bg-[#248a3d]', 'bg-[#248a3d]', 'bg-[#e5e5ea]'])
    expect(barras(filas[1])).toEqual(['bg-red-600', 'bg-[#248a3d]', 'bg-[#e5e5ea]'])
    expect(barras(filas[2])).toEqual(['bg-[#e5e5ea]', 'bg-[#c93400]', 'bg-[#248a3d]'])
    expect(barras(filas[6])).toEqual(['bg-[#e5e5ea]', 'bg-[#e5e5ea]', 'bg-[#e5e5ea]'])
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

describe('panel del escuadrón: sincronización en tiempo real', () => {
  const aviso = { tipo: 'panel.actualizado', escuadron_id: 7, motivo: 'voto_emitido', registro_id: 21 }
  let api
  let navigate
  let conexion
  let conectar
  let avisos

  beforeEach(() => {
    window.history.replaceState({}, '', '/escuadrones/panel?id=7')
    api = { getSquad: vi.fn().mockResolvedValue(squad), getDailyHabit: vi.fn().mockResolvedValue(ownHabit) }
    navigate = vi.fn()
    conexion = { cerrar: vi.fn() }
    conectar = vi.fn((_, opciones) => {
      avisos = opciones
      return conexion
    })
  })
  afterEach(() => {
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
  })

  function mount() {
    const view = panelSeleccionadoScreen({ navigate, api, conectar })
    document.body.replaceChildren(view)
    return view
  }
  const loaded = (view) => vi.waitFor(() => expect(view.querySelector('h1').textContent).toBe('Lectores'))
  const settle = () => new Promise((resolve) => setTimeout(resolve))

  it('se conecta al canal del escuadrón cuando el panel ha cargado, y una sola vez', async () => {
    const view = mount()
    expect(conectar).not.toHaveBeenCalled()
    await loaded(view)
    expect(conectar).toHaveBeenCalledOnce()
    expect(conectar).toHaveBeenCalledWith('7', {
      alActualizar: expect.any(Function),
      alSuscribirse: expect.any(Function),
    })
    api.getSquad.mockResolvedValue({ ...squad, racha: 1 })
    avisos.alActualizar(aviso)
    await vi.waitFor(() => expect(view.textContent).toContain('1día seguido'))
    expect(conectar).toHaveBeenCalledOnce()
  })

  it.each([
    ['la URL no es válida', '/escuadrones/panel?id=abc', null],
    ['el escuadrón no está disponible', '/escuadrones/panel?id=7', new ApiError(403)],
    ['falla la carga', '/escuadrones/panel?id=7', new TypeError('Failed to fetch')],
  ])('no se conecta si %s', async (_, url, cause) => {
    window.history.replaceState({}, '', url)
    if (cause) api.getSquad.mockRejectedValue(cause)
    const view = mount()
    if (cause) await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent).not.toBe(''))
    await settle()
    expect(conectar).not.toHaveBeenCalled()
  })

  it('se conecta cuando «Reintentar» consigue cargar el panel', async () => {
    api.getSquad.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const view = mount()
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent).not.toBe(''))
    expect(conectar).not.toHaveBeenCalled()
    ;[...view.querySelectorAll('button')].find((item) => item.textContent === 'Reintentar').click()
    await loaded(view)
    expect(conectar).toHaveBeenCalledOnce()
  })

  it('si se sale del panel antes de que cargue, no llega a conectarse', async () => {
    const pending = deferred()
    api.getSquad.mockReturnValue(pending.promise)
    mount()
    document.body.replaceChildren()
    pending.resolve(squad)
    await vi.waitFor(() => expect(api.getDailyHabit).toHaveBeenCalled())
    await settle()
    expect(conectar).not.toHaveBeenCalled()
  })

  it('con cada aviso pinta la racha y los miembros nuevos sin huecos ni animaciones de entrada', async () => {
    const view = mount()
    await loaded(view)
    expect(view.textContent).toContain('0días seguidos')
    expect(view.textContent).toContain('1/3')

    const pending = deferred()
    api.getSquad.mockReturnValueOnce(pending.promise)
    avisos.alActualizar(aviso)
    expect(api.getSquad).toHaveBeenCalledTimes(2)
    expect(view.querySelector('.hueco')).toBeNull()
    expect(view.textContent).not.toContain('Cargando escuadrón…')

    pending.resolve({
      ...squad,
      racha: 5,
      miembros: [
        squad.miembros[0],
        { ...squad.miembros[1], prueba_hoy: { id: 21, estado: 'cumplido' } },
        squad.miembros[2],
        { usuario_id: 4, nickname: 'Marta', foto_url: null, es_usuario: false, habito: { opcion: 'gimnasio', texto_personalizado: '' }, prueba_hoy: null },
      ],
    })
    await vi.waitFor(() => expect(view.textContent).toContain('5días seguidos'))
    expect(view.textContent).toContain('2/4')
    expect(view.textContent).toContain('4 de 5 miembros')
    const items = [...view.querySelectorAll('li')].map((item) => item.textContent)
    expect(items[1]).toContain('Correr 5 km · Cumplido')
    expect(items[3]).toContain('Marta')
    expect(view.querySelectorAll('.entrada')).toHaveLength(0)
    expect(view.querySelector('.hueco')).toBeNull()
  })

  it('al suscribirse o reconectar vuelve a pedir el panel, pero no lo repinta si no ha cambiado nada visible', async () => {
    const view = mount()
    await loaded(view)
    const racha = view.querySelector('section')
    api.getSquad.mockResolvedValue({
      ...squad,
      miembros: squad.miembros.map((miembro) => ({ ...miembro, unido_en: '2026-11-24T10:00:00Z' })),
    })
    avisos.alSuscribirse()
    await vi.waitFor(() => expect(api.getDailyHabit).toHaveBeenCalledTimes(2))
    await settle()
    expect(racha.isConnected).toBe(true)
    expect(view.querySelectorAll('.entrada')).toHaveLength(7)
  })

  it('si cambia el hábito propio, lo repinta', async () => {
    const view = mount()
    await loaded(view)
    api.getDailyHabit.mockResolvedValue({ opcion: 'gimnasio', texto_personalizado: '' })
    avisos.alActualizar({ ...aviso, motivo: 'habito_actualizado' })
    await vi.waitFor(() => expect(view.textContent).toContain('Ir al gimnasio'))
  })

  it.each([
    ['nickname', 'laura.actualizada'],
    ['foto_url', 'https://res.cloudinary.com/demo/perfiles/laura-nueva.jpg'],
  ])('repinta cuando solo cambia %s de un miembro', async (campo, valor) => {
    const view = mount()
    await loaded(view)
    const anterior = view.querySelector('section')
    api.getSquad.mockResolvedValue({
      ...squad,
      miembros: squad.miembros.map((miembro, indice) => indice === 1 ? { ...miembro, [campo]: valor } : miembro),
    })
    avisos.alActualizar(aviso)
    await vi.waitFor(() => expect(anterior.isConnected).toBe(false))
    const miembro = view.querySelectorAll('li')[1]
    if (campo === 'nickname') expect(miembro.textContent).toContain(valor)
    else expect(miembro.querySelector('img').getAttribute('src')).toBe(valor)
    expect(view.querySelector('.hueco')).toBeNull()
    expect(view.querySelectorAll('.entrada')).toHaveLength(0)
  })

  it('actualiza las plazas en directo cuando solo cambia la configuración y conserva su menú', async () => {
    const view = mount()
    await loaded(view)
    api.getSquad.mockResolvedValue({ ...squad, limite_miembros: 8 })
    avisos.alActualizar({ ...aviso, motivo: 'configuracion_actualizada' })
    await vi.waitFor(() => expect(view.textContent).toContain('3 de 8 miembros'))
    expect(view.textContent).toContain('Quedan 5 plazas')
    expect(view.querySelector('aside a[href="/escuadrones/configuracion?origen=7"]')).not.toBeNull()
    expect(view.querySelector('header a[aria-label="Configuración del escuadrón"]')).not.toBeNull()
  })

  it('junta los avisos que llegan mientras carga en una sola petición más', async () => {
    const view = mount()
    await loaded(view)
    const pending = deferred()
    api.getSquad.mockReturnValueOnce(pending.promise)
    avisos.alActualizar(aviso)
    avisos.alActualizar({ ...aviso, motivo: 'prueba_actualizada' })
    avisos.alSuscribirse()
    expect(api.getSquad).toHaveBeenCalledTimes(2)
    pending.resolve(squad)
    await vi.waitFor(() => expect(api.getSquad).toHaveBeenCalledTimes(3))
    await settle()
    expect(api.getSquad).toHaveBeenCalledTimes(3)
  })

  it('si falla una actualización en vivo mantiene el panel sin mostrar errores', async () => {
    const view = mount()
    await loaded(view)
    api.getSquad.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    avisos.alActualizar(aviso)
    await vi.waitFor(() => expect(api.getSquad).toHaveBeenCalledTimes(2))
    await settle()
    expect(view.querySelector('h1').textContent).toBe('Lectores')
    expect(view.textContent).not.toContain('No se ha podido cargar')
    expect(view.querySelector('.hueco')).toBeNull()

    api.getSquad.mockResolvedValue({ ...squad, racha: 2 })
    avisos.alActualizar(aviso)
    await vi.waitFor(() => expect(view.textContent).toContain('2días seguidos'))
  })

  it('al repintar devuelve el foco al mismo botón', async () => {
    const view = mount()
    await loaded(view)
    const votar = [...view.querySelectorAll('button')].find((item) => item.textContent === 'Votar')
    votar.focus()
    api.getSquad.mockResolvedValue({ ...squad, racha: 3 })
    avisos.alActualizar(aviso)
    await vi.waitFor(() => expect(view.textContent).toContain('3días seguidos'))
    expect(votar.isConnected).toBe(false)
    expect(document.activeElement.textContent).toBe('Votar')
    expect(view.contains(document.activeElement)).toBe(true)
  })

  it('el foco se queda en «Mis escuadrones» aunque el enlace pase al panel nuevo', async () => {
    const view = mount()
    await loaded(view)
    const back = [...view.querySelectorAll('a')].find((link) => link.textContent === '← Mis escuadrones')
    back.focus()
    api.getSquad.mockResolvedValue({ ...squad, racha: 3 })
    avisos.alActualizar(aviso)
    await vi.waitFor(() => expect(view.textContent).toContain('3días seguidos'))
    expect(document.activeElement).toBe(back)
  })

  it('si el botón que tenía el foco ya no existe, no enfoca otro', async () => {
    const view = mount()
    await loaded(view)
    ;[...view.querySelectorAll('button')].find((item) => item.textContent === 'Votar').focus()
    api.getSquad.mockResolvedValue({
      ...squad,
      miembros: [squad.miembros[0], { ...squad.miembros[1], prueba_hoy: { id: 21, estado: 'cumplido' } }, squad.miembros[2]],
    })
    avisos.alActualizar(aviso)
    await vi.waitFor(() => expect(view.textContent).toContain('2/3'))
    expect(document.activeElement).toBe(document.body)
  })

  it('un miembro que desaparece en directo, por ejemplo expulsado, deja de verse', async () => {
    const view = mount()
    await loaded(view)
    api.getSquad.mockResolvedValue({ ...squad, miembros: [squad.miembros[0], squad.miembros[2]] })
    avisos.alActualizar({ ...aviso, motivo: 'miembro_expulsado' })
    await vi.waitFor(() => expect(view.textContent).toContain('2 de 5 miembros'))
    expect([...view.querySelectorAll('li')].map((item) => item.textContent).join()).not.toContain('lau')
  })

  it.each([[403], [404]])('si en directo el escuadrón responde %i, el usuario ha sido expulsado y pierde el panel', async (status) => {
    const view = mount()
    await loaded(view)
    api.getSquad.mockRejectedValue(new ApiError(status))
    avisos.alActualizar({ ...aviso, motivo: 'miembro_expulsado' })
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent)
      .toBe('Ya no formas parte de este escuadrón. Vuelve a Mis escuadrones.'))
    expect(view.querySelector('h1').textContent).toBe('Panel del escuadrón')
    expect(view.querySelectorAll('section')).toHaveLength(0)
    expect(view.textContent).not.toContain('ABC123')
    expect([...view.querySelectorAll('button')].find((item) => item.textContent === 'Reintentar').hidden).toBe(true)
    const back = [...view.querySelectorAll('a')].find((link) => link.textContent === '← Mis escuadrones')
    expect(back.getAttribute('href')).toBe('/escuadrones')
    expect(view.querySelector('[aria-label="Tu cuenta"]')).not.toBeNull()
    expect(conexion.cerrar).toHaveBeenCalledOnce()
  })

  it('si la expulsión llega mientras ya había otra recarga, no vuelve a pedir el panel', async () => {
    const view = mount()
    await loaded(view)
    const pending = deferred()
    api.getSquad.mockReturnValueOnce(pending.promise)
    avisos.alActualizar(aviso)
    avisos.alActualizar({ ...aviso, motivo: 'miembro_expulsado' })
    pending.reject(new ApiError(403))
    await vi.waitFor(() => expect(view.textContent).toContain('Ya no formas parte de este escuadrón'))
    await settle()
    expect(api.getSquad).toHaveBeenCalledTimes(2)
  })

  it('al salir del panel cierra la conexión', async () => {
    const view = mount()
    await loaded(view)
    expect(conexion.cerrar).not.toHaveBeenCalled()
    document.body.append(document.createElement('div'))
    await settle()
    expect(conexion.cerrar).not.toHaveBeenCalled()
    document.body.replaceChildren(document.createElement('div'))
    await vi.waitFor(() => expect(conexion.cerrar).toHaveBeenCalledOnce())
  })
})
