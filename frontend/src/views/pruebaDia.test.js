import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api.js'
import { guard, routes } from '../routes.js'
import { clearSession } from '../session.js'
import { MAX_FOTO_BYTES, prepararFoto, pruebaDiaScreen, votantes } from './pruebaDia.js'

const squad = {
  id: 7,
  nombre: 'Lectores',
  miembros: [
    { usuario_id: 1, nombre: 'Ana', es_usuario: true },
    { usuario_id: 2, nombre: 'Laura' },
    { usuario_id: 3, nombre: 'Carlos' },
  ],
}
const ownHabit = { opcion: 'leer', texto_personalizado: '' }
const proof = { id: 21, foto_url: 'https://example.com/prueba.jpg' }
const tarde = () => new Date(2026, 10, 10, 20, 30)

function foto(type = 'image/jpeg', size = 1024, name = 'foto.jpg') {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

let bitmap
let toBlobSize
let drawImage

beforeEach(() => {
  window.history.replaceState({}, '', '/prueba?escuadron=7')
  bitmap = { width: 4000, height: 3000, close: vi.fn() }
  toBlobSize = 300 * 1024
  drawImage = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage })
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => {
    const blob = new Blob(['jpeg'], { type })
    Object.defineProperty(blob, 'size', { value: toBlobSize })
    callback(blob)
  })
  URL.createObjectURL = vi.fn(() => 'blob:vista-previa')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
})

describe('preparar la foto antes de subirla', () => {
  it.each([['image/jpeg'], ['image/png'], ['image/webp']])('deja tal cual una foto %s de hasta 5 MB', async (type) => {
    const file = foto(type, MAX_FOTO_BYTES)
    expect(await prepararFoto(file)).toBe(file)
    expect(createImageBitmap).not.toHaveBeenCalled()
  })

  it('pasa a JPEG de 1600 px como máximo una foto de más de 5 MB', async () => {
    const result = await prepararFoto(foto('image/jpeg', MAX_FOTO_BYTES + 1))
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1600, 1200)
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85)
    expect(bitmap.close).toHaveBeenCalled()
    expect(result).toBeInstanceOf(File)
    expect(result.name).toBe('prueba.jpg')
    expect(result.type).toBe('image/jpeg')
  })

  it('convierte a JPEG una foto HEIC sin agrandarla', async () => {
    bitmap = { width: 1200, height: 900, close: vi.fn() }
    const result = await prepararFoto(foto('image/heic', 1024, 'foto.heic'))
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1200, 900)
    expect(result.type).toBe('image/jpeg')
  })

  it('reduce también las fotos en vertical por su lado largo', async () => {
    bitmap = { width: 3000, height: 4000, close: vi.fn() }
    await prepararFoto(foto('image/png', MAX_FOTO_BYTES * 2))
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1200, 1600)
  })

  it('devuelve null si el navegador no puede abrir la imagen', async () => {
    createImageBitmap.mockRejectedValue(new Error('formato no soportado'))
    expect(await prepararFoto(foto('image/heic'))).toBeNull()
  })

  it('devuelve null si el JPEG sigue pasando de 5 MB', async () => {
    toBlobSize = MAX_FOTO_BYTES + 1
    expect(await prepararFoto(foto('image/heic'))).toBeNull()
  })
})

describe('cuántos compañeros votarán', () => {
  it.each([
    [[], 'Aún no hay nadie más en el escuadrón'],
    [[{}], 'Aún no hay nadie más en el escuadrón'],
    [[{}, {}], '1 compañero'],
    [[{}, {}, {}, {}], '3 compañeros'],
  ])('con %j miembros dice «%s»', (miembros, texto) => {
    expect(votantes(miembros)).toBe(texto)
  })
})

describe('pantalla «Tu prueba de hoy»', () => {
  let api
  let navigate

  beforeEach(() => {
    api = {
      getSquad: vi.fn().mockResolvedValue(squad),
      getDailyHabit: vi.fn().mockResolvedValue(ownHabit),
      uploadProof: vi.fn().mockResolvedValue(proof),
    }
    navigate = vi.fn()
  })

  function mount({ ahora = tarde, conNavigate = true } = {}) {
    const view = pruebaDiaScreen({ navigate: conNavigate ? navigate : undefined, api, ahora })
    document.body.replaceChildren(view)
    return view
  }
  const status = (view) => view.querySelector('[role="status"]')
  const alert = (view) => view.querySelector('[role="alert"]')
  const camera = (view) => view.querySelector('input[aria-label="Hacer la foto con la cámara"]')
  const gallery = (view) => view.querySelector('input[aria-label="Elegir una foto de la galería"]')
  const preview = (view) => view.querySelector('img[alt="Foto de prueba de hoy"]')
  const button = (view, text) => [...view.querySelectorAll('button')].find((item) => item.textContent.includes(text))
  const link = (view, text) => [...view.querySelectorAll('a')].find((item) => item.textContent.trim() === text)
  const send = (view) => button(view, 'Enviar prueba') ?? button(view, 'Enviando…') ?? button(view, 'Prueba enviada')
  const loaded = (view) => vi.waitFor(() => expect(view.querySelector('h1').textContent).toBe('Leer'))

  function choose(input, file) {
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    input.dispatchEvent(new Event('change'))
  }
  async function withPhoto(view, file = foto()) {
    await loaded(view)
    choose(camera(view), file)
    await vi.waitFor(() => expect(status(view).textContent).toBe('Foto lista. Revísala y envíala.'))
  }

  it('/prueba es privada y sin sesión manda al login', () => {
    clearSession()
    const route = routes.find((item) => item.path === '/prueba')
    expect(route.private).toBe(true)
    expect(guard(route)).toBe('/login?siguiente=%2Fprueba%3Fescuadron%3D7')
  })

  it('abre la cámara trasera o la galería con los tipos aceptados', () => {
    const view = mount()
    expect(camera(view).type).toBe('file')
    expect(camera(view).getAttribute('capture')).toBe('environment')
    expect(gallery(view).hasAttribute('capture')).toBe(false)
    for (const input of [camera(view), gallery(view)]) {
      expect(input.accept).toBe('image/jpeg,image/png,image/webp')
    }
  })

  it.each([['/prueba'], ['/prueba?escuadron=abc'], ['/prueba?escuadron=0']])(
    'con la URL %s pide elegir un escuadrón sin llamar a la API',
    (url) => {
      window.history.replaceState({}, '', url)
      const view = mount()
      expect(status(view).textContent).toBe('Elige primero un escuadrón en Mis escuadrones.')
      expect(api.getSquad).not.toHaveBeenCalled()
      expect(camera(view).disabled).toBe(true)
      expect(send(view).disabled).toBe(true)
      expect(link(view, 'Elegir mi hábito').getAttribute('href')).toBe('/habito')
    },
  )

  it('mientras carga lo avisa y no deja hacer la foto', async () => {
    const pending = deferred()
    api.getSquad.mockReturnValue(pending.promise)
    const view = mount()
    expect(status(view).textContent).toBe('Cargando tu hábito…')
    expect(view.querySelector('[aria-busy]').getAttribute('aria-busy')).toBe('true')
    expect(camera(view).disabled).toBe(true)
    expect(gallery(view).disabled).toBe(true)
    expect(send(view).disabled).toBe(true)
    expect(api.getSquad).toHaveBeenCalledWith('7')
    pending.resolve(squad)
    await loaded(view)
    expect(view.querySelector('[aria-busy]').getAttribute('aria-busy')).toBe('false')
  })

  it('muestra el hábito, el tiempo hasta las 23:59 y cuántos votarán', async () => {
    const view = mount()
    await loaded(view)
    expect(api.getDailyHabit).toHaveBeenCalledWith('7')
    expect(view.textContent).toContain('23:59')
    expect(view.textContent).toContain('Quedan 03:29 h')
    expect(view.textContent).toContain('2 compañeros')
    expect(status(view).textContent).toBe('')
    expect(camera(view).disabled).toBe(false)
    expect(gallery(view).disabled).toBe(false)
    expect(send(view).disabled).toBe(true)
    expect(link(view, 'Volver al panel').getAttribute('href')).toBe('/escuadrones/panel?id=7')
  })

  it('muestra el hábito personalizado', async () => {
    api.getDailyHabit.mockResolvedValue({ opcion: 'otro', texto_personalizado: 'Correr 5 km' })
    const view = mount()
    await vi.waitFor(() => expect(view.querySelector('h1').textContent).toBe('Correr 5 km'))
  })

  it('pasadas las 23:59 avisa de que el día se ha cerrado', async () => {
    const view = mount({ ahora: () => new Date(2026, 10, 10, 23, 59, 30) })
    await loaded(view)
    expect(view.textContent).toContain('El día ya se ha cerrado')
  })

  it('sin hábito invita a elegirlo y no deja subir la foto', async () => {
    api.getDailyHabit.mockResolvedValue(null)
    const view = mount()
    await vi.waitFor(() => expect(status(view).textContent).toBe('Antes de subir una foto, elige tu hábito en este escuadrón.'))
    const chooseHabit = link(view, 'Elegir mi hábito')
    expect(chooseHabit.hidden).toBe(false)
    expect(chooseHabit.getAttribute('href')).toBe('/habito?escuadron=7')
    expect(camera(view).disabled).toBe(true)
    expect(send(view).disabled).toBe(true)
  })

  it('con la foto de la cámara muestra la vista previa y «Cambiar foto»', async () => {
    const view = mount()
    expect(preview(view).hidden).toBe(true)
    await withPhoto(view)
    expect(preview(view).hidden).toBe(false)
    expect(preview(view).getAttribute('src')).toBe('blob:vista-previa')
    expect(view.textContent).toContain('Cambiar foto')
    expect(view.textContent).not.toContain('Elegir de la galería')
    const empty = [...view.querySelectorAll('h2')].find((item) => item.textContent === 'Haz la foto ahora')
    expect(empty.parentElement.hidden).toBe(true)
    expect(camera(view).closest('label').hidden).toBe(true)
    expect(camera(view).value).toBe('')
    expect(send(view).disabled).toBe(false)
  })

  it('al cambiar la foto libera la vista previa anterior', async () => {
    URL.createObjectURL.mockReturnValueOnce('blob:primera').mockReturnValueOnce('blob:segunda')
    const view = mount()
    await withPhoto(view)
    choose(gallery(view), foto('image/png', 2048, 'otra.png'))
    await vi.waitFor(() => expect(preview(view).getAttribute('src')).toBe('blob:segunda'))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:primera')
  })

  it('avisa si la foto no se puede usar y no deja enviarla', async () => {
    createImageBitmap.mockRejectedValue(new Error('formato no soportado'))
    const view = mount()
    await loaded(view)
    choose(gallery(view), foto('image/heic'))
    await vi.waitFor(() => expect(alert(view).textContent).toBe('Usa una foto JPG, PNG o WebP de menos de 5 MB.'))
    expect(preview(view).hidden).toBe(true)
    expect(send(view).disabled).toBe(true)
  })

  it('una foto de más de 5 MB se reduce antes de enviarla', async () => {
    const view = mount()
    await withPhoto(view, foto('image/jpeg', MAX_FOTO_BYTES + 1))
    send(view).click()
    await vi.waitFor(() => expect(api.uploadProof).toHaveBeenCalled())
    const [, sent] = api.uploadProof.mock.calls[0]
    expect(sent.name).toBe('prueba.jpg')
    expect(sent.type).toBe('image/jpeg')
  })

  it('envía la foto con uploadProof y lleva a la vista de la prueba', async () => {
    const file = foto()
    const pending = deferred()
    api.uploadProof.mockReturnValue(pending.promise)
    const view = mount()
    await withPhoto(view, file)
    send(view).click()
    expect(api.uploadProof).toHaveBeenCalledWith('7', file)
    expect(send(view).textContent).toBe('Enviando…')
    expect(send(view).disabled).toBe(true)
    expect(camera(view).disabled).toBe(true)
    pending.resolve(proof)
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/escuadrones/prueba?escuadron=7&registro=21'))
  })

  it('no navega si la pantalla ya no está abierta', async () => {
    const pending = deferred()
    api.uploadProof.mockReturnValue(pending.promise)
    const view = mount()
    await withPhoto(view)
    send(view).click()
    document.body.replaceChildren()
    pending.resolve(proof)
    await vi.waitFor(() => expect(send(view).disabled).toBe(false))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('sin navegación muestra la prueba enviada y vuelve al panel', async () => {
    const view = mount({ conNavigate: false })
    await withPhoto(view)
    send(view).click()
    await vi.waitFor(() => expect(status(view).textContent).toBe('Prueba enviada. Tu escuadrón ya puede verla y votarla.'))
    expect(preview(view).getAttribute('src')).toBe(proof.foto_url)
    expect(send(view).textContent).toBe('Prueba enviada')
    expect(send(view).disabled).toBe(true)
    const backToPanel = [...view.querySelectorAll('a')].find((item) => item.textContent === 'Volver al panel' && !item.hidden)
    expect(backToPanel.getAttribute('href')).toBe('/escuadrones/panel?id=7')
  })

  it.each([
    [new ApiError(401), 'Tu sesión ha caducado. Vuelve a iniciar sesión.'],
    [new ApiError(403), 'No perteneces a este escuadrón.'],
    [new ApiError(404), 'El escuadrón ya no existe. Vuelve a Mis escuadrones.'],
    [new TypeError('Failed to fetch'), 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.'],
  ])('si falla la carga con %s lo avisa y deja reintentar', async (cause, message) => {
    api.getSquad.mockRejectedValueOnce(cause)
    const view = mount()
    await vi.waitFor(() => expect(alert(view).textContent).toBe(message))
    expect(status(view).textContent).toBe('')
    expect(button(view, 'Reintentar').hidden).toBe(false)
    expect(camera(view).disabled).toBe(true)

    button(view, 'Reintentar').click()
    await loaded(view)
    expect(api.getSquad).toHaveBeenCalledTimes(2)
    expect(alert(view).textContent).toBe('')
    expect(button(view, 'Reintentar').hidden).toBe(true)
    expect(camera(view).disabled).toBe(false)
  })

  it.each([
    [new ApiError(400, { foto: ['La imagen está dañada.', 'Prueba con otra.'] }), 'La imagen está dañada. Prueba con otra.'],
    [new ApiError(400, { detail: 'Ya has subido la prueba de hoy.' }), 'Ya has subido la prueba de hoy.'],
    [new ApiError(400), 'La foto no es válida. Prueba con otra.'],
    [new ApiError(401), 'Tu sesión ha caducado. Vuelve a iniciar sesión.'],
    [new ApiError(403), 'No perteneces a este escuadrón.'],
    [new ApiError(404), 'El escuadrón ya no existe. Vuelve a Mis escuadrones.'],
    [new TypeError('Failed to fetch'), 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.'],
  ])('si falla el envío con %s lo avisa y deja volver a enviar', async (cause, message) => {
    api.uploadProof.mockRejectedValueOnce(cause)
    const view = mount()
    await withPhoto(view)
    send(view).click()
    await vi.waitFor(() => expect(alert(view).textContent).toBe(message))
    expect(navigate).not.toHaveBeenCalled()
    expect(send(view).textContent).toBe('Enviar prueba')
    expect(send(view).disabled).toBe(false)
  })
})
