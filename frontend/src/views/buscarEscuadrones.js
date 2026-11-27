import { accountMenu } from '../components/accountMenu.js'
import { pillLink } from '../components/buttons.js'
import { button, element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import { landingNav } from '../components/landing/landingNav.js'
import { escuadronResultado, normalizeSearch } from '../components/buscador/escuadronResultado.js'
import { unirseDialog } from '../components/buscador/unirseDialog.js'
import { squadSearchApi, squadSearchError } from '../buscador-api.js'
import { rememberSquad } from '../session.js'

export function buscarEscuadronesScreen({ onLogout, loadProfile, api = squadSearchApi } = {}) {
  let squads = []
  let loading = false
  let requestVersion = 0
  let searchTimer
  const title = element('h1', 'text-[2rem] leading-tight font-black tracking-tight lg:text-[2.5rem]', 'Buscar escuadrones')
  const search = element('input', 'min-w-0 flex-1 bg-transparent py-3 font-semibold outline-none')
  search.type = 'search'
  search.id = 'buscar-escuadrones'
  search.placeholder = 'Busca por nombre…'
  search.autocomplete = 'off'
  const label = element('label', 'sr-only', 'Buscar escuadrones por nombre')
  label.htmlFor = search.id
  const count = element('span', 'squad-search-count')
  const searchBox = element('div', 'squad-search', icon('search'), label, search, count)
  const resultLabel = element('h2', 'font-extrabold')
  const sort = element('select', 'squad-sort')
  sort.setAttribute('aria-label', 'Ordenar escuadrones')
  for (const [value, text] of [['recommended', 'Recomendados'], ['streak', 'Racha más larga'], ['places', 'Más plazas libres'], ['name', 'Nombre: A–Z']]) {
    const option = element('option', '', text); option.value = value; sort.append(option)
  }
  const list = element('ul', 'space-y-3')
  list.setAttribute('aria-label', 'Escuadrones públicos')
  const status = element('p', 'mt-4 font-semibold text-ink-muted')
  status.setAttribute('role', 'status')
  const error = element('p', 'squad-error')
  error.setAttribute('role', 'alert')
  const retry = button('squad-cancel', load, 'Reintentar')
  retry.hidden = true
  const empty = element('div', 'squad-empty', icon('search', 'mx-auto h-9 w-9 text-accent'),
    element('h3', 'mt-3 text-xl font-black', 'No encontramos tu escuadrón'),
    element('p', 'mt-2 font-semibold text-ink-muted', 'Prueba otro nombre.'),
    button('squad-action mt-4', () => { search.value = ''; void load(); search.focus() }, 'Limpiar búsqueda'))
  empty.hidden = true
  const results = element('section', 'min-w-0', element('div', 'mb-3 flex flex-wrap items-center justify-between gap-2', resultLabel, sort), error, retry, list, empty, status)
  results.setAttribute('aria-label', 'Resultados de búsqueda')
  const codeInput = element('input', 'squad-code-input')
  codeInput.id = 'search-invitation-code'
  codeInput.name = 'codigo'
  codeInput.maxLength = 6
  codeInput.required = true
  codeInput.pattern = '[A-Za-z0-9]{6}'
  codeInput.autocomplete = 'off'
  codeInput.placeholder = 'K7P2QX'
  codeInput.setAttribute('autocapitalize', 'characters')
  const codeLabel = element('label', 'sr-only', 'Código de invitación de 6 caracteres')
  codeLabel.htmlFor = codeInput.id
  // La unión con código conserva su pantalla y su validación existentes.
  const codeContinue = pillLink({ href: '/escuadrones/unirse', variant: 'onColor', className: 'mt-3 w-full' }, 'Continuar con código')
  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    codeContinue.href = `/escuadrones/unirse?codigo=${encodeURIComponent(codeInput.value)}`
  })
  const aside = element('aside', 'squad-search-aside',
    element('section', 'squad-code-card', element('span', 'squad-aside-icon', icon('join')),
      element('h2', 'mt-4 text-xl font-black', '¿Tienes un código?'),
      element('p', 'mt-2 font-semibold text-white/90', 'Si te han invitado, entra directamente.'), codeLabel, codeInput, codeContinue),
    element('section', 'squad-create-card', element('h2', 'text-xl font-black', '¿No encuentras el tuyo?'),
      element('p', 'mt-2 font-semibold text-ink-muted', 'Crea un escuadrón y empieza una racha con tu gente.'),
      pillLink({ href: '/escuadrones/nuevo', variant: 'secondary', className: 'mt-4 w-full bg-accent-soft text-base' }, icon('plus'), 'Crear un escuadrón')))

  const modal = unirseDialog({ api, onUpdate(updated) {
    // El listado del backend excluye los escuadrones a los que ya perteneces.
    squads = squads.filter((squad) => squad.id !== updated.id)
    rememberSquad(updated.id)
    render()
  }, onClose(id) {
    const action = [...list.querySelectorAll('[data-squad-action]')].find((node) => node.dataset.squadAction === String(id) && !node.disabled)
    const target = action ?? search
    target.focus()
  }, onUnavailable: () => { void load() } })

  function render() {
    const query = normalizeSearch(search.value.trim())
    const filtered = loading ? [] : squads.filter((squad) => squad.publico && normalizeSearch(squad.nombre).includes(query))
    if (sort.value === 'streak') filtered.sort((a, b) => b.racha - a.racha)
    if (sort.value === 'places') filtered.sort((a, b) => (b.capacidad - b.miembrosActuales) - (a.capacidad - a.miembrosActuales))
    if (sort.value === 'name') filtered.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    count.textContent = loading ? 'Buscando…' : `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`
    resultLabel.textContent = loading ? 'Buscando escuadrones…' : `${filtered.length} ${filtered.length === 1 ? 'escuadrón público' : 'escuadrones públicos'}`
    status.textContent = loading ? 'Cargando escuadrones…' : count.textContent
    status.classList.toggle('sr-only', !loading)
    list.replaceChildren(...filtered.map((squad) => escuadronResultado(squad, search.value,
      (value) => modal.open(value, document.activeElement))))
    empty.hidden = loading || filtered.length > 0 || Boolean(error.textContent)
  }
  async function load() {
    clearTimeout(searchTimer)
    const version = ++requestVersion
    loading = true
    error.textContent = ''
    retry.hidden = true
    results.setAttribute('aria-busy', 'true')
    render()
    try {
      const updated = await api.list(search.value.trim())
      if (version === requestVersion) squads = updated
    } catch (cause) {
      if (version === requestVersion) {
        squads = []
        error.textContent = squadSearchError(cause, 'No se han podido cargar los escuadrones. Comprueba la conexión y vuelve a intentarlo.')
        retry.hidden = false
      }
    } finally {
      if (version === requestVersion) { loading = false; results.setAttribute('aria-busy', 'false'); render() }
    }
  }
  search.addEventListener('input', () => {
    clearTimeout(searchTimer)
    // Invalida ya la respuesta anterior, incluso durante la espera entre teclas.
    requestVersion++
    loading = true
    error.textContent = ''
    retry.hidden = true
    results.setAttribute('aria-busy', 'true')
    render()
    searchTimer = setTimeout(() => { if (search.isConnected) void load() }, 250)
  })
  sort.addEventListener('change', render)
  const backdrop = element('div', 'access-backdrop pointer-events-none fixed inset-0 -z-10')
  backdrop.setAttribute('aria-hidden', 'true')
  const page = element('div', 'relative isolate min-h-dvh overflow-x-clip font-rounded text-ink antialiased', backdrop,
    landingNav({ cuenta: accountMenu({ onLogout, loadProfile }), zona: 'escuadrones' }),
    element('main', 'mx-auto w-full max-w-6xl px-4 pt-6 pb-12 sm:px-8 lg:pt-10',
      pillLink({ href: '/escuadrones', variant: 'secondary', className: 'mb-5 h-11 px-4 text-sm' }, icon('users'), 'Mis escuadrones'),
      title, element('p', 'mt-2 font-semibold text-ink-muted', 'Encuentra tu escuadrón y empieza a sumar días juntos.'),
      searchBox, element('div', 'squad-search-grid', results, aside)), modal.node)
  void load()
  return page
}
