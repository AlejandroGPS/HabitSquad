import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../session.js'
import { habitoDiarioScreen } from './habitoDiario.js'

const squads = [{ id: 7, nombre: 'Lectores' }, { id: 9, nombre: 'Deportistas' }]
const habit = { id: 3, opcion: 'leer', texto_personalizado: '' }
const response = (status, data = null) => ({ ok: status >= 200 && status < 300, status, json: async () => data })

describe('Elegir hábito conectado a la API', () => {
  let fetchMock
  beforeEach(() => {
    window.history.replaceState({}, '', '/habito?escuadron=7')
    localStorage.clear()
    saveSession({ access: 'access', refresh: 'refresh' })
    fetchMock = vi.fn().mockResolvedValue(response(404))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    document.body.replaceChildren()
    localStorage.clear()
    window.history.replaceState({}, '', '/')
    vi.unstubAllGlobals()
  })
  async function mount(initial = habit, navigate) {
    fetchMock.mockResolvedValueOnce(response(200, squads[0])).mockResolvedValueOnce(response(initial ? 200 : 404, initial))
    const view = habitoDiarioScreen({ navigate })
    document.body.replaceChildren(view)
    await vi.waitFor(() => expect(view.querySelector('form').getAttribute('aria-busy')).toBe('false'))
    return view
  }
  function submit(view) {
    view.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
  }
  it('presenta las seis ideas del PDF, campo siempre visible y navegación de detalle', async () => {
    const view = await mount(null)
    expect(view.querySelectorAll('input[type="radio"]')).toHaveLength(6)
    expect(view.querySelector('select')).toBeNull()
    expect(view.querySelector('input[name="habito"]').maxLength).toBe(60)
    expect(view.querySelector('#habito-contador').textContent).toBe('0/60')
    expect(view.querySelector('input[name="habito"]').closest('[hidden]')).toBeNull()
    expect(view.querySelector('a[aria-label="Volver al panel"]').getAttribute('href')).toBe('/escuadrones/panel?id=7')
    expect(view.querySelector('nav.lg\\:hidden')).toBeNull()
    expect(view.textContent).toContain('la racha del escuadrón vuelve a cero')
  })
  it.each([
    ['Leer 20 minutos', 'otro'],
    ['Ir al gimnasio', 'gimnasio'],
    ['Meditar 10 minutos', 'otro'],
    ['Caminar 8.000 pasos', 'otro'],
    ['Sin móvil en la cama', 'otro'],
    ['Estudiar 1 hora', 'otro'],
  ])('guarda la idea «%s» sin perder su texto', async (text, option) => {
    const view = await mount(null)
    view.querySelector(`input[value="${text}"]`).click()
    expect(view.querySelector('input[name="habito"]').value).toBe(text)
    expect(view.querySelector('#habito-contador').textContent).toBe(`${text.length}/60`)
    const payload = { opcion: option, texto_personalizado: option === 'otro' ? text : '' }
    fetchMock.mockResolvedValueOnce(response(200, { ...habit, ...payload }))
    submit(view)
    await vi.waitFor(() => expect(view.textContent).toContain('Hábito guardado'))
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual(payload)
  })
  it('desmarca la idea al escribir un hábito propio', async () => {
    const view = await mount(null)
    view.querySelector('input[value="Leer 20 minutos"]').click()
    const input = view.querySelector('input[name="habito"]')
    input.value = 'Practicar guitarra'
    input.dispatchEvent(new Event('input'))
    expect([...view.querySelectorAll('input[type="radio"]')].some((radio) => radio.checked)).toBe(false)
  })
  it('vuelve al panel solamente después de confirmar el guardado en el servidor', async () => {
    const navigate = vi.fn()
    const view = await mount(habit, navigate)
    let resolve
    fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    submit(view)
    expect(navigate).not.toHaveBeenCalled()
    resolve(response(200, habit))
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/escuadrones/panel?id=7'))
  })
  it('conserva íntegro un hábito antiguo de más de 60 caracteres y pide acortarlo al guardar', async () => {
    const text = 'x'.repeat(80)
    const view = await mount({ ...habit, opcion: 'otro', texto_personalizado: text })
    expect(view.querySelector('input[name="habito"]').value).toBe(text)
    submit(view)
    expect(view.querySelector('[role="alert"]').textContent).toContain('60 caracteres')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('consulta el escuadrón elegido y recupera su hábito con autorización JWT', async () => {
    const view = await mount()
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/escuadrones/7/', expect.objectContaining({ headers: expect.any(Headers) }))
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer access')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/escuadrones/7/habito/')
    expect(view.querySelector('input[name="habito"]').value).toBe('Leer')
  })
  it('permite elegir el primer hábito ante un 404 vacío', async () => {
    const view = await mount(null)
    expect(view.textContent).toContain('Todavía no has elegido')
    expect(view.querySelector('button[type="submit"]').disabled).toBe(false)
    submit(view)
    expect(view.querySelector('[role="alert"]').textContent).toContain('Elige una idea')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it.each(['gimnasio', 'leer', 'estudiar'])('guarda %s mediante PUT y actualiza la confirmación', async (option) => {
    const view = await mount(null)
    const input = view.querySelector('input[name="habito"]')
    input.value = { gimnasio: 'Ir al gimnasio', leer: 'Leer', estudiar: 'Estudiar' }[option]
    input.dispatchEvent(new Event('input'))
    fetchMock.mockResolvedValueOnce(response(200, { ...habit, opcion: option }))
    submit(view)
    expect(view.querySelector('button[type="submit"]').disabled).toBe(true)
    submit(view)
    await vi.waitFor(() => expect(view.textContent).toContain('Hábito guardado en tu escuadrón.'))
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2][0]).toBe('/api/escuadrones/7/habito/')
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ opcion: option, texto_personalizado: '' }) })
    expect(view.querySelector('button[type="submit"]').disabled).toBe(false)
  })
  it('recupera y actualiza el texto personalizado sin usar almacenamiento local', async () => {
    const view = await mount({ ...habit, opcion: 'otro', texto_personalizado: 'Caminar' })
    const input = view.querySelector('input[name="habito"]')
    expect(input.value).toBe('Caminar')
    input.value = '  Practicar guitarra  '
    input.dispatchEvent(new Event('input'))
    fetchMock.mockResolvedValueOnce(response(200, { ...habit, opcion: 'otro', texto_personalizado: 'Practicar guitarra' }))
    submit(view)
    await vi.waitFor(() => expect(view.textContent).toContain('Hábito guardado en tu escuadrón.'))
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ opcion: 'otro', texto_personalizado: 'Practicar guitarra' })
    expect(localStorage.getItem('habitsquad.dailyHabit.pendingSync')).toBeNull()
  })
  it.each(['   ', 'x'.repeat(61)])('rechaza un texto personalizado inválido sin enviarlo', async (text) => {
    const view = await mount(null)
    view.querySelector('input[name="habito"]').value = text
    submit(view)
    expect(view.querySelector('[role="alert"]').textContent).toContain('entre 1 y 60')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('usa exclusivamente el escuadrón recibido desde la pantalla Mis escuadrones', async () => {
    window.history.replaceState({}, '', '/habito?escuadron=9')
    const view = await mount()
    expect(view.querySelector('select')).toBeNull()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/escuadrones/9/')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/escuadrones/9/habito/')
    fetchMock.mockResolvedValueOnce(response(200, habit))
    submit(view)
    await vi.waitFor(() => expect(view.textContent).toContain('Hábito guardado'))
    expect(fetchMock.mock.calls[2][0]).toBe('/api/escuadrones/9/habito/')
    expect(fetchMock.mock.calls.some(([path]) => path === '/api/escuadrones/')).toBe(false)
  })
  it('no consulta el hábito ni guarda si el escuadrón recibido no pertenece al usuario', async () => {
    window.history.replaceState({}, '', '/habito?escuadron=999')
    fetchMock.mockResolvedValueOnce(response(403))
    const view = habitoDiarioScreen()
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent).toContain('permiso'))
    expect(view.querySelector('button[type="submit"]').disabled).toBe(true)
    submit(view)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it.each([403, 404, 500])('no permite guardar si falla la consulta del hábito con %s', async (code) => {
    fetchMock.mockResolvedValueOnce(response(200, squads[0])).mockResolvedValueOnce(response(code, { detail: 'Error de consulta' }))
    const view = habitoDiarioScreen()
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent).not.toBe(''))
    expect(view.querySelector('button[type="submit"]').disabled).toBe(true)
    expect(view.textContent).not.toContain('Todavía no has elegido')
    submit(view)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it.each([400, 403, 404, 500])('mantiene el formulario y permite reintentar si guardar devuelve %s', async (code) => {
    const view = await mount()
    fetchMock.mockResolvedValueOnce(response(code, { opcion: ['Opción no válida.'] }))
    submit(view)
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent).not.toBe(''))
    expect(view.textContent).not.toContain('Hábito guardado en tu escuadrón.')
    expect(view.querySelector('input[name="habito"]').value).toBe('Leer')
    expect(view.querySelector('button[type="submit"]').disabled).toBe(false)
  })
  it.each(['/habito', '/habito?escuadron=abc', '/habito?escuadron=0'])('sin un escuadrón válido en %s remite a Mis escuadrones sin elegir uno automáticamente', (url) => {
    window.history.replaceState({}, '', url)
    const view = habitoDiarioScreen()
    document.body.replaceChildren(view)
    expect(view.querySelector('select')).toBeNull()
    expect(view.textContent).toContain('Elige primero un escuadrón en Mis escuadrones')
    expect(view.querySelector('button[type="submit"]').disabled).toBe(true)
    const input = view.querySelector('input[name="habito"]')
    expect(input.disabled).toBe(false)
    view.querySelector('input[value="Leer 20 minutos"]').click()
    expect(input.value).toBe('Leer 20 minutos')
    const choose = [...view.querySelectorAll('a')].find((link) => link.textContent === 'Ir a Mis escuadrones')
    expect(choose.hidden).toBe(false)
    expect(choose.getAttribute('href')).toBe('/')
    submit(view)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('permite elegir una idea mientras carga el escuadrón y conserva el borrador al recibir el hábito', async () => {
    let resolveList
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveList = resolve }))
      .mockResolvedValueOnce(response(200, habit))
    const view = habitoDiarioScreen()
    document.body.replaceChildren(view)
    const input = view.querySelector('input[name="habito"]')
    expect(input.disabled).toBe(false)
    view.querySelector('input[value="Meditar 10 minutos"]').click()
    expect(input.value).toBe('Meditar 10 minutos')
    resolveList(response(200, squads[0]))
    await vi.waitFor(() => expect(view.querySelector('button[type="submit"]').disabled).toBe(false))
    expect(input.value).toBe('Meditar 10 minutos')
    fetchMock.mockResolvedValueOnce(response(200, { opcion: 'otro', texto_personalizado: input.value }))
    submit(view)
    await vi.waitFor(() => expect(view.textContent).toContain('Hábito guardado'))
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ opcion: 'otro', texto_personalizado: 'Meditar 10 minutos' })
  })
  it('no borra el texto escrito mientras se espera la respuesta del hábito', async () => {
    let resolveHabit
    fetchMock.mockResolvedValueOnce(response(200, squads[0]))
      .mockReturnValueOnce(new Promise((resolve) => { resolveHabit = resolve }))
    const view = habitoDiarioScreen()
    document.body.replaceChildren(view)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const input = view.querySelector('input[name="habito"]')
    expect(input.disabled).toBe(false)
    input.value = 'Caminar con mi perro'
    input.dispatchEvent(new Event('input'))
    resolveHabit(response(200, habit))
    await vi.waitFor(() => expect(view.querySelector('form').getAttribute('aria-busy')).toBe('false'))
    expect(input.value).toBe('Caminar con mi perro')
  })
  it('permite reintentar una carga fallida sin sobrescribir el hábito existente', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    const view = habitoDiarioScreen()
    document.body.replaceChildren(view)
    await vi.waitFor(() => expect(view.querySelector('[role="alert"]').textContent).toContain('conectar'))
    expect(view.querySelector('button[type="submit"]').disabled).toBe(true)
    expect(view.querySelector('input[name="habito"]').disabled).toBe(false)
    expect(view.querySelector('fieldset').disabled).toBe(false)
    fetchMock.mockResolvedValueOnce(response(200, squads[0])).mockResolvedValueOnce(response(200, habit))
    ;[...view.querySelectorAll('button')].find((button) => button.textContent === 'Reintentar').click()
    await vi.waitFor(() => expect(view.querySelector('input[name="habito"]').value).toBe('Leer'))
  })
})
