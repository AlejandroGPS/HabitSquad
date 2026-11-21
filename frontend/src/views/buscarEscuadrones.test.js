import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSquadSearch } from '../mocks/buscadorEscuadrones.js'
import { routes, guard } from '../routes.js'
import { buscarEscuadronesScreen } from './buscarEscuadrones.js'

let view
let api
const rows = () => [...view.querySelectorAll('ul[aria-label="Escuadrones públicos"] > li')]
const findButton = (label, root = view) => [...root.querySelectorAll('button')].find((node) => node.textContent === label)
const dialog = () => view.querySelector('dialog')
function search(text) {
  const input = view.querySelector('input[type="search"]')
  input.value = text
  input.dispatchEvent(new Event('input'))
}
async function mount(adapter = createMockSquadSearch()) {
  api = adapter
  view = buscarEscuadronesScreen({ api })
  document.body.replaceChildren(view)
  await vi.waitFor(() => expect(view.querySelector('[aria-label="Resultados de búsqueda"]').getAttribute('aria-busy')).toBe('false'))
  return view
}

beforeEach(() => {
  // jsdom no implementa los métodos del diálogo nativo.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function () { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function () {
    this.removeAttribute('open'); this.dispatchEvent(new Event('close'))
  } })
})
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); localStorage.clear() })

describe('buscador de escuadrones', () => {
  it('protege la ruta y muestra solo los 12 ejemplos públicos, sin llamadas de red', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const route = routes.find((route) => route.path === '/escuadrones/buscar')
    expect(route.private).toBe(true)
    expect(guard(route)).toContain('/login')
    await mount()
    expect(rows()).toHaveLength(12)
    expect(view.querySelector('h1').textContent).toBe('Buscar escuadrones')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('busca sin tildes ni mayúsculas y resalta la coincidencia como texto seguro', async () => {
    await mount()
    search('AZUCAR')
    expect(rows()).toHaveLength(1)
    expect(rows()[0].querySelector('mark').textContent).toBe('azúcar')
    search('lect')
    expect(rows()).toHaveLength(2)
    expect(view.querySelector('[role="status"]').textContent).toBe('2 resultados')
    search('<img src=x onerror=alert(1)>')
    expect(rows()).toHaveLength(0)
    expect(view.querySelector('.squad-empty').hidden).toBe(false)
    findButton('Limpiar búsqueda').click()
    expect(rows()).toHaveLength(12)
  })

  it('ordena los resultados por racha y mantiene la búsqueda por nombre', async () => {
    await mount()
    const sort = view.querySelector('select')
    sort.value = 'streak'; sort.dispatchEvent(new Event('change'))
    expect(rows()[0].querySelector('h3').textContent).toBe('Sin azúcar')
    expect(rows()).toHaveLength(12)
    search('lect')
    expect(rows()[0].querySelector('h3').textContent).toBe('Lectores nocturnos')
    expect(rows()).toHaveLength(2)
  })

  it('no permite abrir un escuadrón completo y cancelar mantiene búsqueda y foco', async () => {
    await mount()
    const full = rows().find((row) => row.textContent.includes('Sin azúcar'))
    const disabled = full.querySelector('button')
    expect(disabled.disabled).toBe(true)
    disabled.click()
    expect(dialog().open).toBe(false)
    search('madrugadores')
    const join = rows()[0].querySelector('button')
    join.focus(); join.click()
    expect(dialog().open).toBe(true)
    expect(dialog().textContent).toContain('plazas libres')
    findButton('Ahora no', dialog()).click()
    expect(dialog().open).toBe(false)
    expect(rows()).toHaveLength(1)
    expect(document.activeElement).toBe(join)
    expect((await api.list()).find((squad) => squad.id === 'madrugadores').unido).toBe(false)
  })

  it('simula unión y hábito, actualiza plazas y evita unirse dos veces', async () => {
    await mount()
    search('madrugadores')
    rows()[0].querySelector('button').click()
    findButton('Unirme a Madrugadores 6:30', dialog()).click()
    await vi.waitFor(() => expect(dialog().querySelector('input[name="habito"]')).not.toBeNull())
    expect(rows()[0].textContent).toContain('3/5')
    const input = dialog().querySelector('input')
    input.value = 'Caminar 30 minutos'
    dialog().querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(dialog().textContent).toContain('¡Todo listo!'))
    findButton('Volver al buscador', dialog()).click()
    expect((await api.list()).find((squad) => squad.id === 'madrugadores').habitoPropio).toBe('Caminar 30 minutos')
    expect(rows()[0].querySelector('button').disabled).toBe(true)
    await api.join('madrugadores')
    expect((await api.list()).find((squad) => squad.id === 'madrugadores').miembros).toHaveLength(3)
  })

  it('permite elegir el hábito más tarde sin perder la unión', async () => {
    await mount()
    search('madrugadores')
    rows()[0].querySelector('button').click()
    findButton('Unirme a Madrugadores 6:30', dialog()).click()
    await vi.waitFor(() => expect(dialog().querySelector('input')).not.toBeNull())
    findButton('Elegir hábito más tarde', dialog()).click()
    findButton('Elegir hábito').click()
    expect(dialog().querySelector('input[name="habito"]')).not.toBeNull()
    expect(rows()[0].textContent).toContain('3/5')
  })

  it('recupera una carga fallida y permite reintentar una unión fallida', async () => {
    const adapter = createMockSquadSearch()
    const list = vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementation(adapter.list)
    const join = vi.fn().mockRejectedValueOnce(new Error('El escuadrón se acaba de completar.'))
    await mount({ ...adapter, list, join })
    expect(view.querySelector('[role="alert"]').textContent).toContain('No se han podido cargar')
    findButton('Reintentar').click()
    await vi.waitFor(() => expect(rows()).toHaveLength(12))
    search('madrugadores')
    rows()[0].querySelector('button').click()
    const confirm = findButton('Unirme a Madrugadores 6:30', dialog())
    confirm.click(); confirm.click()
    expect(join).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(dialog().querySelector('[role="alert"]').textContent).toContain('se acaba de completar'))
    expect(confirm.disabled).toBe(false)
    expect(rows()[0].textContent).toContain('2/5')
  })

  it('mantiene el diálogo al fallar el guardado del hábito y permite reintentar', async () => {
    const adapter = createMockSquadSearch()
    const saveHabit = vi.fn().mockRejectedValueOnce(new Error('No se ha podido guardar.')).mockImplementation(adapter.saveHabit)
    await mount({ ...adapter, saveHabit })
    search('madrugadores')
    rows()[0].querySelector('button').click()
    findButton('Unirme a Madrugadores 6:30', dialog()).click()
    await vi.waitFor(() => expect(dialog().querySelector('input')).not.toBeNull())
    dialog().querySelector('input').value = 'Leer'
    const submit = () => dialog().querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }))
    submit()
    await vi.waitFor(() => expect(dialog().querySelector('[role="alert"]').textContent).toContain('No se ha podido guardar'))
    expect(dialog().querySelector('input').value).toBe('Leer')
    submit()
    await vi.waitFor(() => expect(dialog().textContent).toContain('¡Todo listo!'))
  })

  it('pasa el código normalizado a la pantalla existente', async () => {
    await mount()
    const input = view.querySelector('input[name="codigo"]')
    input.value = 'k7p2qx'; input.dispatchEvent(new Event('input'))
    expect(view.querySelector('aside a[href^="/escuadrones/unirse"]').getAttribute('href')).toBe('/escuadrones/unirse?codigo=K7P2QX')
  })
})
