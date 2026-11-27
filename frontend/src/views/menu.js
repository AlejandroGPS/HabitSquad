import { ApiError, listSquads } from '../api.js'
import { element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import { habitText } from './habitoDiario.js'

const CAPACITY = 5
const CODE_LENGTH = 6
const TONES = ['#5b32ea', '#ff7a1a', '#1cb0f6', '#3dcc4a', '#ce82ff', '#ff4b4b']
const CATEGORY_TONE = {
  lectura: '#5b32ea',
  deporte: '#ef6a00',
  meditacion: '#0b92d0',
  alimentacion: '#2ea043',
  estudio: '#e09000',
}
const FACES = ['#8b6cff', '#ff9a4a', '#4eb8f0', '#67c23a', '#f48fb1', '#ffd15c']

const CATEGORIES = [
  { id: 'lectura', label: 'Lectura', test: /le(er|ctura)|libro/i, chip: 'bg-[#efeaff] text-[#5b32ea]' },
  { id: 'deporte', label: 'Deporte', test: /corr|camin|gimnas|deport|paso|entren/i, chip: 'bg-[#fff1e6] text-[#e35d00]' },
  { id: 'meditacion', label: 'Meditación', test: /medit/i, chip: 'bg-[#e7f6ff] text-[#0878c9]' },
  { id: 'alimentacion', label: 'Alimentación', test: /az[uú]c|comida|aliment|dieta/i, chip: 'bg-[#e9f8e4] text-[#248a3d]' },
  { id: 'estudio', label: 'Estudio', test: /estud/i, chip: 'bg-[#fff4d6] text-[#b86e00]' },
]

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'plazas', label: 'Con plazas libres' },
  ...CATEGORIES.map(({ id, label }) => ({ id, label })),
]

function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function alphanumeric(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function membersOf(squad) {
  return Array.isArray(squad.miembros) ? squad.miembros : []
}

function habitsOf(squad) {
  const seen = new Set()
  const habits = []
  for (const member of membersOf(squad)) {
    const text = String(habitText(member.habito) ?? '').trim()
    const key = fold(text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    habits.push(text)
  }
  return habits
}

function categoryOf(habit) {
  return CATEGORIES.find((category) => category.test.test(habit)) ?? null
}

function categoriesOf(squad) {
  const seen = new Set()
  const categories = []
  for (const habit of habitsOf(squad)) {
    const category = categoryOf(habit)
    if (!category || seen.has(category.id)) continue
    seen.add(category.id)
    categories.push(category)
  }
  return categories
}

function freeSpots(squad) {
  return Math.max(0, CAPACITY - membersOf(squad).length)
}

function toneFor(squad) {
  const category = categoriesOf(squad)[0]
  if (category) return CATEGORY_TONE[category.id]
  let hash = 0
  for (const char of String(squad.nombre ?? '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}

function squadInitials(nombre) {
  const words = String(nombre ?? '').trim().split(/\s+/).filter(Boolean)
  const strong = words.filter((word) => [...word].length > 2)
  const chosen = (strong.length >= 2 ? strong : words).slice(0, 2)
  return chosen.map((word) => [...word][0] ?? '').join('').toUpperCase() || '?'
}

function routeLink(href, className, ...children) {
  const link = element('a', className, ...children)
  link.href = href
  link.dataset.link = ''
  return link
}

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

function paintCount(node, text) {
  if (node.textContent === text) return
  node.textContent = text
  node.classList.remove('buscar-pop')
  void node.offsetWidth
  node.classList.add('buscar-pop')
}

function memberFaces(members) {
  const shown = members.slice(0, 3)
  if (!shown.length) return null
  const wrap = element('span', 'inline-flex items-center')
  wrap.setAttribute('aria-hidden', 'true')
  shown.forEach((member, index) => {
    const face = element('span', 'inline-block h-6 w-6 rounded-full border-2 border-white')
    face.style.background = FACES[(Number(member.usuario_id) || index) % FACES.length]
    if (index) face.style.marginLeft = '-7px'
    wrap.append(face)
  })
  return wrap
}

function squadCard(squad, index) {
  const members = membersOf(squad)
  const habits = habitsOf(squad)
  const categories = categoriesOf(squad)
  const free = freeSpots(squad)
  const full = free === 0
  const row = element('li', 'buscar-rise')
  row.style.setProperty('--i', String(index))

  const avatar = element(
    'span',
    'grid h-14 w-14 shrink-0 place-items-center rounded-[1.15rem] text-[1.05rem] font-black text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]',
    squadInitials(squad.nombre),
  )
  avatar.style.background = toneFor(squad)

  const title = element(
    'div',
    'flex min-w-0 flex-wrap items-center gap-2',
    element('h3', 'min-w-0 truncate text-[1.05rem] font-black', squad.nombre),
  )
  for (const category of categories) {
    title.append(element('span', `rounded-full px-2 py-0.5 text-[0.7rem] font-extrabold ${category.chip}`, category.label))
  }

  const meta = element('div', 'mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] font-bold')
  if (typeof squad.racha === 'number' && squad.racha > 0) {
    const days = squad.racha === 1 ? '1 día' : `${squad.racha} días`
    meta.append(element('span', 'inline-flex items-center gap-1 text-streak', icon('flame', 'h-4 w-4'), days))
  }
  const faces = memberFaces(members)
  if (faces) meta.append(faces)
  meta.append(element('span', 'text-ink-muted', `${members.length}/${CAPACITY}`))
  if (!full) {
    meta.append(element('span', 'text-[#248a3d]', free === 1 ? '1 plaza libre' : `${free} plazas libres`))
  }

  const action = routeLink(
    `/escuadrones/panel?id=${squad.id}`,
    full
      ? 'inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#ececf1] px-4 text-[0.9375rem] font-extrabold text-ink-muted transition-transform duration-150 motion-safe:active:scale-95'
      : 'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-[0.9375rem] font-extrabold text-white shadow-[0_8px_16px_-10px_rgb(91_50_234/0.9)] transition-[transform,background-color] duration-150 hover:bg-accent-hover motion-safe:active:scale-95',
  )
  if (full) {
    action.textContent = 'Completo'
    action.setAttribute('aria-label', `Abrir panel de ${squad.nombre}`)
  } else {
    action.append(icon('userPlus', 'h-4 w-4'), 'Unirme')
    action.setAttribute('aria-label', `Unirme a ${squad.nombre}`)
  }

  action.classList.add('max-sm:ms-auto')
  row.append(element(
    'article',
    'buscar-card flex flex-wrap items-center gap-x-3 gap-y-3 rounded-[1.35rem] bg-white px-3.5 py-3.5 ring-1 ring-white sm:flex-nowrap sm:gap-4 sm:px-4',
    avatar,
    element(
      'div',
      'min-w-0 flex-1 basis-[calc(100%-4.25rem)] sm:basis-0',
      title,
      element('p', 'mt-0.5 truncate text-[0.875rem] font-semibold text-ink-muted', habits.join(' · ') || 'Sin hábito definido todavía'),
      meta,
    ),
    action,
  ))
  return row
}

function skeletonCard(index) {
  const row = element(
    'li',
    'buscar-rise rounded-[1.35rem] bg-white px-4 py-3.5 shadow-[0_12px_30px_-22px_rgb(60_30_140/0.35)]',
    element(
      'div',
      'flex items-center gap-4',
      element('span', 'buscar-shimmer h-14 w-14 shrink-0 rounded-[1.15rem]'),
      element(
        'span',
        'flex min-w-0 flex-1 flex-col gap-2',
        element('span', 'buscar-shimmer h-4 w-40 max-w-[62%] rounded-full'),
        element('span', 'buscar-shimmer h-3 w-56 max-w-[80%] rounded-full'),
        element('span', 'buscar-shimmer h-3 w-28 rounded-full'),
      ),
      element('span', 'buscar-shimmer h-11 w-24 shrink-0 rounded-full'),
    ),
  )
  row.style.setProperty('--i', String(index))
  row.setAttribute('aria-hidden', 'true')
  return row
}

function codeCard({ onJoin, navigate }) {
  const card = element('section', 'buscar-codigo buscar-side rounded-[1.6rem] p-5 text-white sm:p-6')
  card.style.setProperty('--i', '0')
  const title = element('h2', 'mt-4 text-[1.35rem] font-black', '¿Tienes un código?')
  title.id = 'codigo-buscar-titulo'
  const form = element('form', 'mt-4 flex flex-col gap-3')
  form.noValidate = true
  form.setAttribute('aria-label', 'Unirme con un código')

  const boxes = element('div', 'grid grid-cols-6 gap-1.5 sm:gap-2')
  boxes.setAttribute('role', 'group')
  boxes.setAttribute('aria-labelledby', title.id)
  const inputs = []
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    const input = element('input', '')
    input.type = 'text'
    input.maxLength = 1
    input.inputMode = 'text'
    input.autocomplete = index === 0 ? 'one-time-code' : 'off'
    input.spellcheck = false
    input.setAttribute('autocapitalize', 'characters')
    input.setAttribute('aria-label', `Carácter ${index + 1} del código`)
    input.setAttribute('aria-invalid', 'false')
    inputs.push(input)
    boxes.append(input)
  }

  function paintBox(input) {
    const filled = input.value !== ''
    const invalid = input.getAttribute('aria-invalid') === 'true'
    input.className = [
      'h-12 w-full rounded-xl text-center text-xl font-black uppercase outline-none transition-[background-color,color] duration-150',
      filled ? 'bg-white text-[#1d1d1f]' : 'bg-white/25 text-white',
      invalid ? 'ring-2 ring-red-200' : '',
    ].join(' ')
  }

  function pulse(input) {
    paintBox(input)
    input.classList.remove('buscar-tecla')
    void input.offsetWidth
    if (input.value) input.classList.add('buscar-tecla')
  }

  for (const input of inputs) paintBox(input)

  const error = element(
    'p',
    'rounded-xl bg-white px-3 py-2 text-[0.8125rem] font-bold text-red-700',
  )
  error.id = 'codigo-buscar-error'
  error.hidden = true
  error.setAttribute('role', 'alert')
  const success = element(
    'p',
    'rounded-xl bg-white/15 px-3 py-2 text-[0.8125rem] font-bold',
  )
  success.hidden = true
  success.setAttribute('role', 'status')
  const panelLink = routeLink(
    '/escuadrones/panel',
    'text-sm font-extrabold text-white underline',
    'Ir al panel',
  )
  panelLink.hidden = true

  function showError(message) {
    success.hidden = true
    success.textContent = ''
    panelLink.hidden = true
    error.hidden = false
    error.textContent = message
    boxes.setAttribute('aria-describedby', error.id)
    for (const input of inputs) {
      input.setAttribute('aria-invalid', 'true')
      input.setAttribute('aria-describedby', error.id)
      paintBox(input)
    }
  }

  function clearError() {
    error.hidden = true
    error.textContent = ''
    boxes.removeAttribute('aria-describedby')
    for (const input of inputs) {
      input.setAttribute('aria-invalid', 'false')
      input.removeAttribute('aria-describedby')
      paintBox(input)
    }
  }

  function writeFrom(start, chars) {
    for (let offset = 0; offset < chars.length; offset += 1) {
      const target = start + offset
      if (target >= inputs.length) break
      inputs[target].value = chars[offset]
      pulse(inputs[target])
    }
    inputs[Math.min(start + chars.length, inputs.length - 1)].focus()
  }

  for (const [index, input] of inputs.entries()) {
    input.addEventListener('input', () => {
      clearError()
      const chars = alphanumeric(input.value)
      if (chars.length > 1) {
        writeFrom(index, chars)
        return
      }
      input.value = chars
      pulse(input)
      if (chars && index < inputs.length - 1) inputs[index + 1].focus()
    })
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && index > 0) {
        event.preventDefault()
        inputs[index - 1].value = ''
        pulse(inputs[index - 1])
        inputs[index - 1].focus()
      } else if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        inputs[index - 1].focus()
      } else if (event.key === 'ArrowRight' && index < inputs.length - 1) {
        event.preventDefault()
        inputs[index + 1].focus()
      }
    })
    input.addEventListener('paste', (event) => {
      event.preventDefault()
      clearError()
      const pasted = alphanumeric(event.clipboardData?.getData('text') ?? '')
      if (!pasted) return
      writeFrom(pasted.length >= inputs.length ? 0 : index, pasted)
    })
    input.addEventListener('focus', () => input.select())
  }

  const submit = element(
    'button',
    'mt-1 flex h-12 w-full items-center justify-center rounded-full bg-white text-[1rem] font-extrabold text-accent transition-transform duration-150 hover:bg-white/95 disabled:cursor-wait disabled:opacity-70 motion-safe:active:scale-[0.98]',
    'Unirme',
  )
  submit.type = 'submit'
  let pending = false
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (pending) return
    const code = inputs.map((input) => input.value).join('')
    if (code.length < CODE_LENGTH) {
      showError('Introduce el código completo de 6 caracteres.')
      inputs.find((input) => input.value === '')?.focus()
      return
    }
    if (typeof onJoin !== 'function') return
    pending = true
    submit.disabled = true
    submit.textContent = 'Uniéndote…'
    try {
      const squad = await onJoin(code)
      clearError()
      if (squad?.id && typeof navigate === 'function') {
        navigate(`/escuadrones/panel?id=${squad.id}`)
        return
      }
      success.hidden = false
      success.textContent = squad?.nombre ? `Te has unido a «${squad.nombre}».` : 'Te has unido al escuadrón.'
      if (squad?.id) {
        panelLink.href = `/escuadrones/panel?id=${squad.id}`
        panelLink.hidden = false
      }
    } catch (cause) {
      const message = cause instanceof Error && cause.message
        ? cause.message
        : 'No se ha podido unir al escuadrón. Inténtalo de nuevo.'
      showError(message)
    } finally {
      pending = false
      submit.disabled = false
      submit.textContent = 'Unirme'
    }
  })

  form.append(boxes, error, success, panelLink, submit)
  card.append(
    element('span', 'grid h-10 w-10 place-items-center rounded-xl bg-white/20', icon('join', 'h-5 w-5')),
    title,
    element('p', 'mt-1 text-[0.9375rem] font-semibold text-white/90', 'Si te han invitado, entra directamente.'),
    form,
  )
  return card
}

function createCard() {
  const card = element(
    'section',
    'buscar-side rounded-[1.6rem] bg-white p-5 shadow-[0_12px_30px_-22px_rgb(60_30_140/0.45)] ring-1 ring-white sm:p-6',
  )
  card.style.setProperty('--i', '1')
  const title = element('h2', 'text-[1.2rem] font-black', '¿No encuentras el tuyo?')
  card.setAttribute('aria-labelledby', 'crear-escuadron-titulo')
  title.id = 'crear-escuadron-titulo'
  card.append(
    title,
    element(
      'p',
      'mt-1 text-[0.9375rem] font-semibold text-ink-muted',
      'Crea un escuadrón, hazlo público y deja que te encuentren.',
    ),
    routeLink(
      '/escuadrones/nuevo',
      'mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#efeaff] text-[0.98rem] font-extrabold text-accent transition-[transform,background-color] duration-150 hover:bg-[#e4dcff] motion-safe:active:scale-[0.98]',
      icon('plus', 'h-4 w-4'),
      'Crear un escuadrón',
    ),
  )
  return card
}

export function menuScreen({ onJoin, navigate, loadSquads = listSquads } = {}) {
  const main = element('main', 'buscar-page min-h-dvh overflow-x-clip font-rounded text-[#1d1d1f] antialiased')
  const wrap = element('div', 'mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10')

  const heading = element('h1', 'buscar-in text-[1.85rem] leading-none font-black tracking-tight sm:text-[2.35rem]', 'Buscar escuadrones')
  const intro = element(
    'div',
    '',
    heading,
    element('p', 'buscar-in mt-2 max-w-xl text-[0.98rem] font-semibold text-ink-muted', 'Encuentra gente con tu mismo hábito y súmate a su racha.'),
  )

  const searchForm = element(
    'form',
    'buscar-in mt-6 flex h-14 items-center gap-3 rounded-full bg-white px-4 shadow-[0_12px_32px_-20px_rgb(60_30_140/0.45)] ring-1 ring-white',
  )
  searchForm.setAttribute('role', 'search')
  searchForm.style.animationDelay = '40ms'
  searchForm.addEventListener('submit', (event) => event.preventDefault())
  const searchLabel = element('label', 'sr-only', 'Busca por nombre')
  searchLabel.htmlFor = 'buscar-escuadron'
  const searchInput = element(
    'input',
    'min-w-0 flex-1 bg-transparent text-[0.975rem] font-semibold outline-none placeholder:font-semibold placeholder:text-ink-muted/80',
  )
  searchInput.id = 'buscar-escuadron'
  searchInput.type = 'search'
  searchInput.placeholder = 'Busca por nombre...'
  searchInput.autocomplete = 'off'
  searchInput.spellcheck = false
  const results = element('span', 'shrink-0 text-[0.8125rem] font-bold text-ink-muted tabular-nums', '…')
  results.id = 'buscar-resultados'
  searchForm.append(searchLabel, icon('search', 'h-5 w-5 shrink-0 text-ink-muted'), searchInput, results)

  const chips = element('div', 'buscar-chips mt-4 flex gap-2 overflow-x-auto pb-1')
  chips.setAttribute('role', 'group')
  chips.setAttribute('aria-label', 'Filtrar escuadrones')
  const chipButtons = FILTERS.map((filter) => {
    const chip = element(
      'button',
      'buscar-chip h-10 shrink-0 rounded-full px-4 text-[0.875rem] font-extrabold transition-[background-color,color,transform] duration-200 motion-safe:active:scale-95',
      filter.label,
    )
    chip.type = 'button'
    chip.dataset.filter = filter.id
    chip.setAttribute('aria-pressed', String(filter.id === 'todos'))
    chips.append(chip)
    return chip
  })

  const layout = element('div', 'mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]')
  const section = element('section', 'min-w-0')
  section.setAttribute('aria-labelledby', 'squad-list-title')
  const listTitle = element('h2', 'text-[0.9375rem] font-extrabold text-ink-muted', 'Escuadrones')
  listTitle.id = 'squad-list-title'
  const sort = element(
    'select',
    'h-10 appearance-none rounded-full bg-white/80 py-0 ps-4 pe-9 text-[0.8125rem] font-bold text-ink-muted shadow-sm',
  )
  sort.setAttribute('aria-label', 'Ordenar escuadrones')
  for (const [value, label] of [['racha', 'Racha más larga'], ['plazas', 'Más plazas libres'], ['nombre', 'Nombre']]) {
    const option = element('option', '', label)
    option.value = value
    sort.append(option)
  }
  const sortWrap = element(
    'div',
    'relative shrink-0',
    sort,
    element('span', 'pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-ink-muted', icon('chevron', 'h-4 w-4')),
  )
  const listHeader = element('div', 'flex items-center justify-between gap-3', listTitle, sortWrap)
  const status = element('p', 'mt-3 text-sm font-semibold text-ink-muted', 'Cargando escuadrones…')
  status.setAttribute('role', 'status')
  const listError = element('p', 'mt-3 text-sm font-bold text-red-700')
  listError.setAttribute('role', 'alert')
  const retry = element('button', 'mt-1 min-h-11 font-bold text-accent underline', 'Reintentar')
  retry.type = 'button'
  retry.hidden = true
  const list = element('ul', 'mt-3 flex flex-col gap-3')
  section.append(listHeader, status, listError, retry, list)

  const aside = element(
    'aside',
    'flex flex-col gap-4',
    codeCard({ onJoin, navigate }),
    createCard(),
  )
  layout.append(section, aside)
  wrap.append(intro, searchForm, chips, layout)
  main.append(wrap)

  let squads = []
  let loading = false
  let query = ''
  let filter = 'todos'
  let order = 'racha'

  function visibleSquads() {
    const needle = fold(query.trim())
    return squads
      .filter((squad) => {
        if (needle && !fold(squad.nombre).includes(needle)) return false
        if (filter === 'plazas' && freeSpots(squad) <= 0) return false
        if (filter !== 'todos' && filter !== 'plazas' && !categoriesOf(squad).some((category) => category.id === filter)) return false
        return true
      })
      .sort((a, b) => {
        if (order === 'nombre') return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        if (order === 'plazas') {
          return freeSpots(b) - freeSpots(a) || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        }
        return (b.racha ?? 0) - (a.racha ?? 0) || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      })
  }

  function showSkeletons() {
    list.replaceChildren(...[0, 1, 2].map(skeletonCard))
    listTitle.textContent = 'Escuadrones'
    status.className = 'sr-only'
    status.textContent = 'Cargando escuadrones…'
    paintCount(results, '…')
  }

  function render() {
    if (loading) return
    const visible = visibleSquads()
    paintCount(results, countLabel(visible.length, 'resultado', 'resultados'))
    listTitle.textContent = countLabel(visible.length, 'escuadrón', 'escuadrones')
    list.replaceChildren()
    if (!squads.length) {
      status.className = 'mt-3 text-sm font-semibold text-ink-muted'
      status.textContent = 'Todavía no perteneces a ningún escuadrón. Crea uno o únete con un código.'
      return
    }
    if (!visible.length) {
      status.className = 'buscar-rise mt-3 text-sm font-semibold text-ink-muted'
      status.textContent = 'Ningún escuadrón coincide con esa búsqueda.'
      return
    }
    status.className = 'sr-only'
    status.textContent = listTitle.textContent
    visible.forEach((squad, index) => list.append(squadCard(squad, index)))
  }

  function paintChips() {
    for (const chip of chipButtons) {
      const selected = chip.getAttribute('aria-pressed') === 'true'
      chip.className = [
        'buscar-chip h-10 shrink-0 rounded-full px-4 text-[0.875rem] font-extrabold transition-[background-color,color,transform] duration-200 motion-safe:active:scale-95',
        selected ? 'bg-accent text-white shadow-[0_8px_16px_-10px_rgb(91_50_234/0.85)]' : 'bg-white/85 text-[#3c3c3c] shadow-sm hover:bg-white',
      ].join(' ')
    }
  }

  function selectFilter(id) {
    filter = id
    for (const chip of chipButtons) chip.setAttribute('aria-pressed', String(chip.dataset.filter === id))
    paintChips()
    render()
  }

  for (const chip of chipButtons) {
    chip.addEventListener('click', () => selectFilter(chip.dataset.filter))
  }
  paintChips()

  searchInput.addEventListener('input', () => {
    query = searchInput.value
    render()
  })
  sort.addEventListener('change', () => {
    order = sort.value
    render()
  })

  async function load() {
    if (loading) return
    loading = true
    retry.hidden = true
    listError.textContent = ''
    section.setAttribute('aria-busy', 'true')
    showSkeletons()
    try {
      const data = await loadSquads()
      if (!Array.isArray(data)) throw new Error('respuesta inesperada')
      squads = data
    } catch (cause) {
      squads = []
      list.replaceChildren()
      status.className = 'sr-only'
      status.textContent = ''
      paintCount(results, '0 resultados')
      listTitle.textContent = 'Escuadrones'
      listError.textContent = cause instanceof ApiError && cause.status === 401
        ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
        : 'No se han podido cargar tus escuadrones. Comprueba la conexión y vuelve a intentarlo.'
      retry.hidden = false
      return
    } finally {
      loading = false
      section.setAttribute('aria-busy', 'false')
    }
    render()
  }

  retry.addEventListener('click', () => { void load() })
  void load()
  return main
}
