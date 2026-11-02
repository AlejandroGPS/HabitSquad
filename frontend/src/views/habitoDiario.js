import mascotUrl from '../assets/mascota.webp'
import { appMark } from '../components/brand.js'
import { flameIcon } from '../components/icons.js'
import {
  clearFieldError,
  formAlert,
  primaryButtonClass,
  setFieldError,
} from '../components/forms.js'

const HABIT_MAX_LENGTH = 60
const HABIT_STORAGE_KEY = 'habitsquad.dailyHabit.pendingSync'

const SUGGESTIONS = [
  { value: 'Leer 20 minutos', icon: '▣', color: 'text-accent bg-accent-soft' },
  { value: 'Ir al gimnasio', icon: '↗', color: 'text-streak bg-streak/10' },
  { value: 'Meditar 10 minutos', icon: '◉', color: 'text-success bg-success/10' },
  { value: 'Caminar 8.000 pasos', icon: '⌁', color: 'text-sky bg-sky/10' },
  { value: 'Sin móvil en la cama', icon: '☾', color: 'text-accent bg-accent-soft' },
  { value: 'Estudiar 1 hora', icon: '✎', color: 'text-streak bg-streak/10' },
]

const NAV_ITEMS = [
  { label: 'Escuadrón', icon: 'squad', href: '/' },
  { label: 'Racha', icon: 'streak' },
  { label: 'Alertas', icon: 'alerts', badge: '3' },
  { label: 'Mi hábito', icon: 'habit', href: '/habito', active: true },
]

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

function element(tag, className = '', text = '') {
  const node = document.createElement(tag)
  node.className = className
  if (text) node.textContent = text
  return node
}

function icon(name, className = 'h-5 w-5 shrink-0') {
  if (name === 'streak') return flameIcon(className)

  const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.8')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')

  const paths = {
    squad: [
      ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }],
      ['circle', { cx: '10', cy: '7', r: '4' }],
      ['path', { d: 'M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' }],
    ],
    alerts: [
      ['path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9' }],
      ['path', { d: 'M10 21h4' }],
    ],
    habit: [
      ['rect', { x: '4', y: '4', width: '16', height: '16', rx: '2' }],
      ['path', { d: 'M9 9h6M9 13h6M9 17h3' }],
    ],
    back: [['path', { d: 'm15 18-6-6 6-6' }]],
    camera: [
      ['path', { d: 'M14 5h-4l-2 2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z' }],
      ['circle', { cx: '12', cy: '13', r: '3' }],
    ],
    bell: [
      ['path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9' }],
      ['path', { d: 'M10 21h4' }],
    ],
  }
  for (const [tag, attributes] of paths[name] ?? []) {
    const shape = document.createElementNS(SVG_NAMESPACE, tag)
    for (const [attribute, value] of Object.entries(attributes)) {
      shape.setAttribute(attribute, value)
    }
    svg.append(shape)
  }
  svg.classList.add(...className.split(/\s+/).filter(Boolean))
  return svg
}

function menuItem({ label, icon: iconName, href, active = false, badge }) {
  const item = href ? element('a') : element('span')
  item.className = [
    'relative flex min-h-10 min-w-0 items-center gap-2.5 rounded-xl px-2.5 text-[0.8125rem] font-extrabold transition-colors',
    active ? 'bg-accent-soft text-accent' : 'text-ink-muted',
    href && !active ? 'hover:bg-white/70 hover:text-ink' : '',
  ].join(' ')
  if (href) {
    item.href = href
    item.dataset.link = ''
  }
  if (active) item.setAttribute('aria-current', 'page')
  item.append(icon(iconName, 'h-[1.125rem] w-[1.125rem] shrink-0'))
  item.append(element('span', 'min-w-0 flex-1 truncate', label))
  if (badge) {
    const count = element(
      'span',
      'grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[0.6875rem] font-black text-white',
      badge,
    )
    count.setAttribute('aria-label', `${badge} avisos sin leer`)
    item.append(count)
  }
  return item
}

function sidebar() {
  const aside = element(
    'aside',
    'glass sticky top-3 hidden h-[calc(100dvh-1.5rem)] w-[12rem] shrink-0 flex-col rounded-[1.75rem] p-3 xl:w-[13rem] lg:flex',
  )
  aside.setAttribute('aria-label', 'Menú principal')

  const brand = element('a', 'flex min-h-12 items-center gap-2 rounded-xl px-1.5')
  brand.href = '/'
  brand.dataset.link = ''
  brand.setAttribute('aria-label', 'HabitSquad, ir al escuadrón')
  brand.append(
    appMark('h-8 w-8'),
    element('span', 'text-[1rem] font-black tracking-tight text-ink', 'HabitSquad'),
  )

  const nav = element('nav', 'mt-5 flex flex-col gap-1')
  nav.setAttribute('aria-label', 'Secciones')
  for (const item of NAV_ITEMS) nav.append(menuItem(item))

  const squad = element(
    'a',
    'mt-auto flex min-w-0 items-center gap-2 rounded-2xl bg-white/65 p-2',
  )
  squad.href = '/'
  squad.dataset.link = ''
  squad.append(
    element(
      'span',
      'grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-[0.75rem] font-black text-white',
      'LI',
    ),
    element('span', 'min-w-0 flex-1', ''),
  )
  squad.lastElementChild.append(
    element('span', 'block truncate text-[0.6875rem] font-extrabold text-ink', 'Los Inquebrantables'),
    element('span', 'block text-[0.625rem] font-semibold text-ink-muted', '3 de 5 miembros'),
  )
  aside.append(brand, nav, squad)
  return aside
}

function mobileNavigation() {
  const nav = element(
    'nav',
    'glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 grid grid-cols-4 rounded-2xl p-1.5 lg:hidden',
  )
  nav.setAttribute('aria-label', 'Navegación principal')
  for (const item of NAV_ITEMS) {
    const link = element(
      item.href ? 'a' : 'span',
      `flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[0.625rem] font-extrabold ${item.active ? 'bg-accent-soft text-accent' : 'text-ink-muted'}`,
    )
    if (item.href) {
      link.href = item.href
      link.dataset.link = ''
    }
    if (item.active) link.setAttribute('aria-current', 'page')
    link.append(icon(item.icon, 'h-4 w-4'))
    link.append(element('span', 'truncate', item.label))
    nav.append(link)
  }
  return nav
}

function mascot() {
  const image = element(
    'img',
    'h-16 w-auto shrink-0 drop-shadow-[0_10px_14px_rgb(40_20_100/0.24)] sm:h-[4.5rem]',
  )
  image.src = mascotUrl
  image.alt = ''
  image.width = 312
  image.height = 360
  image.decoding = 'async'
  image.draggable = false
  return image
}

function pageHeader() {
  const header = element(
    'header',
    'mb-5 flex min-w-0 items-center gap-3 sm:mb-6',
  )
  const back = element(
    'a',
    'glass grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink transition hover:-translate-x-0.5 focus-visible:outline-2 focus-visible:outline-accent',
  )
  back.href = '/'
  back.dataset.link = ''
  back.setAttribute('aria-label', 'Volver al escuadrón')
  back.append(icon('back', 'h-5 w-5'))

  const titleGroup = element('div', 'min-w-0 flex-1')
  titleGroup.append(
    element('p', 'truncate text-[0.6875rem] font-bold text-ink-muted', 'Los Inquebrantables'),
    element('h1', 'truncate text-[1.25rem] leading-tight font-black tracking-tight text-ink sm:text-[1.5rem]', 'Mi hábito diario'),
  )

  const stats = element('div', 'ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2')
  const streak = element(
    'div',
    'glass flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-black text-ink',
  )
  streak.append(flameIcon('h-4 w-4 text-streak'), element('span', '', '12'))

  const alerts = element(
    'span',
    'glass relative grid h-9 w-9 place-items-center rounded-full text-ink-muted',
  )
  alerts.append(icon('bell'))
  alerts.append(element('span', 'absolute end-1 top-1 h-2 w-2 rounded-full bg-streak ring-2 ring-white'))
  alerts.setAttribute('aria-label', 'Avisos: 3 pendientes')

  const avatar = element(
    'span',
    'grid h-9 w-9 place-items-center rounded-full bg-accent text-[0.8125rem] font-black text-white shadow-[0_4px_0_rgb(63_31_179/0.2)]',
    'A',
  )
  avatar.setAttribute('aria-label', 'Perfil de Ana')
  stats.append(streak, alerts, avatar)
  header.append(back, titleGroup, stats)
  return header
}

export function validateDailyHabit(value) {
  const habit = String(value ?? '').trim()
  if (!habit) {
    return { ok: false, error: 'Elige una idea o escribe tu propio hábito.' }
  }
  if (habit.length > HABIT_MAX_LENGTH) {
    return {
      ok: false,
      error: `El hábito puede tener como máximo ${HABIT_MAX_LENGTH} caracteres.`,
    }
  }
  return { ok: true, habit }
}

function savedHabit() {
  try {
    return localStorage.getItem(HABIT_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function habitoDiarioScreen() {
  const main = element(
    'main',
    [
      'relative isolate min-h-dvh w-full overflow-x-clip font-rounded text-ink antialiased',
      'ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]',
    ].join(' '),
  )
  const backdrop = element('div', 'access-backdrop fixed inset-0 -z-10')
  backdrop.setAttribute('aria-hidden', 'true')

  const app = element('div', 'relative z-10 flex min-h-dvh items-stretch gap-3 p-3 sm:gap-4 sm:p-4')
  const side = sidebar()
  const workspace = element('div', 'flex min-w-0 flex-1 flex-col')
  const panel = element('div', 'mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col')
  panel.append(pageHeader())

  const encouragement = element(
    'section',
    'flex min-w-0 items-center gap-3 rounded-3xl bg-gradient-to-br from-accent to-accent-hover px-4 py-3.5 text-white shadow-[0_8px_0_rgb(63_31_179/0.15),0_20px_35px_-24px_rgb(60_30_140/0.55)] sm:gap-4 sm:px-5 sm:py-4',
  )
  encouragement.setAttribute('aria-label', 'Una regla para tu racha')
  encouragement.append(
    mascot(),
    element('div', 'min-w-0', ''),
  )
  encouragement.lastElementChild.append(
    element('p', 'text-[0.875rem] font-extrabold sm:text-[1rem]', 'Uno solo, y que sea tuyo.'),
    element(
      'p',
      'mt-0.5 text-[0.75rem] leading-snug font-semibold text-white/90 sm:text-[0.8125rem]',
      'Si un día no lo cumples, la racha del escuadrón vuelve a cero.',
    ),
  )

  const form = element('form', 'mt-4 flex min-w-0 flex-col gap-4 sm:mt-5 sm:gap-5')
  form.noValidate = true
  const topGrid = element('div', 'grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1fr]')
  const habitField = element('div', 'min-w-0 rounded-3xl border-2 border-white bg-white/75 p-4 shadow-[0_7px_0_rgb(60_30_140/0.07),0_14px_24px_-18px_rgb(60_30_140/0.35)] sm:p-5')
  const label = element('label', 'text-[0.75rem] font-extrabold text-ink-muted', '¿Qué harás cada día?')
  label.htmlFor = 'habito-diario'
  const input = element(
    'input',
    [
      'mt-1.5 h-11 w-full min-w-0 rounded-xl border-2 border-transparent bg-[#f2f2f7] px-3',
      'text-[0.9375rem] font-bold text-ink outline-none transition-[border-color,box-shadow] duration-200',
      'placeholder:font-semibold placeholder:text-ink-muted/70 focus:border-accent-line focus:ring-4 focus:ring-accent/15',
      'aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/15',
    ].join(' '),
  )
  input.id = 'habito-diario'
  input.name = 'habito'
  input.type = 'text'
  input.placeholder = 'Ej. Leer 20 minutos'
  input.maxLength = HABIT_MAX_LENGTH
  input.autocomplete = 'off'
  input.spellcheck = false
  input.setAttribute('aria-invalid', 'false')

  const counter = element('span', 'self-end text-[0.625rem] font-bold text-ink-muted', `0/${HABIT_MAX_LENGTH}`)
  counter.id = 'habito-diario-contador'
  counter.setAttribute('aria-live', 'polite')
  counter.setAttribute('aria-label', `0 de ${HABIT_MAX_LENGTH} caracteres`)
  const error = formAlert()
  error.id = 'habito-diario-error'
  error.classList.add('hidden')
  const inputStack = element('div', 'flex min-w-0 flex-col gap-1')
  inputStack.append(input, counter, error)
  input.setAttribute('aria-describedby', counter.id)
  habitField.append(label, inputStack)

  const suggestionsGroup = element('fieldset', 'min-w-0')
  const legend = element('legend', 'text-[0.75rem] font-bold text-ink-muted', 'Ideas para empezar')
  const suggestions = element('div', 'mt-2 grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-3')
  suggestionsGroup.append(legend, suggestions)
  const radios = []
  for (const [index, suggestion] of SUGGESTIONS.entries()) {
    const choice = element(
      'label',
      [
        'flex min-h-[3.25rem] min-w-0 cursor-pointer items-center gap-2 rounded-2xl border-2 border-transparent',
        'bg-white/90 px-2.5 py-2 shadow-[0_5px_0_rgb(60_30_140/0.06),0_10px_20px_-17px_rgb(60_30_140/0.4)]',
        'transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:bg-white sm:gap-2.5 sm:px-3',
        'has-checked:border-accent has-checked:bg-accent-soft/50',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
      ].join(' '),
    )
    const radio = element('input', 'sr-only')
    radio.type = 'radio'
    radio.name = 'idea-habito'
    radio.id = `idea-habito-${index + 1}`
    radio.value = suggestion.value
    radio.setAttribute('aria-label', suggestion.value)

    const badge = element(
      'span',
      `grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[0.9375rem] font-black sm:h-9 sm:w-9 ${suggestion.color}`,
      suggestion.icon,
    )
    badge.setAttribute('aria-hidden', 'true')
    const text = element('span', 'min-w-0 flex-1 text-[0.6875rem] leading-tight font-extrabold text-ink sm:text-[0.75rem]', suggestion.value)
    const check = element('span', 'ms-auto hidden shrink-0 font-black text-accent', '✓')
    check.setAttribute('aria-hidden', 'true')

    radio.addEventListener('change', () => {
      if (!radio.checked) return
      input.value = suggestion.value
      updateCounter()
      clearFieldError(input, error)
      input.setAttribute('aria-describedby', counter.id)
      status.textContent = ''
      status.classList.add('hidden')
    })
    choice.append(radio, badge, text, check)
    suggestions.append(choice)
    radios.push(radio)
  }

  const bottomGrid = element('div', 'grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[1.05fr_1fr]')
  const proof = element(
    'section',
    'flex min-w-0 items-center gap-3 rounded-3xl border-2 border-white bg-white/85 p-3 shadow-[0_5px_0_rgb(60_30_140/0.06),0_10px_20px_-17px_rgb(60_30_140/0.4)] sm:p-4',
  )
  proof.setAttribute('aria-label', 'Cómo demuestras tu hábito')
  const cameraBadge = element('span', 'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky/10 text-sky')
  cameraBadge.append(icon('camera', 'h-4 w-4'))
  const proofText = element('div', 'min-w-0')
  proofText.append(
    element('p', 'text-[0.6875rem] font-extrabold text-ink-muted', 'Cómo lo demuestras'),
    element('p', 'mt-0.5 text-[0.75rem] font-extrabold text-ink', 'Con una foto antes de las 23:59.'),
    element('p', 'text-[0.625rem] leading-snug font-semibold text-ink-muted', 'Tu escuadrón la vota y cuenta para la racha.'),
  )
  proof.append(cameraBadge, proofText)

  const saveColumn = element('div', 'flex min-w-0 flex-col justify-end gap-2')
  const offlineNote = element(
    'p',
    'text-center text-[0.6875rem] leading-snug font-semibold text-ink-muted md:text-start',
    'Por ahora se guarda en este dispositivo. La sincronización con el escuadrón queda pendiente.',
  )
  const saveButton = element('button', `${primaryButtonClass} mt-0 h-11 rounded-full border-b-0 text-[0.8125rem]`, 'Guardar hábito')
  saveButton.type = 'submit'
  const status = element(
    'p',
    'hidden rounded-2xl border-2 border-green-200 bg-green-50 px-3 py-2 text-[0.75rem] leading-snug font-bold text-green-800',
  )
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  saveColumn.append(offlineNote, saveButton, status)
  bottomGrid.append(proof, saveColumn)

  topGrid.append(encouragement, habitField)
  form.append(suggestionsGroup, bottomGrid)
  panel.append(topGrid, form)
  workspace.append(panel, mobileNavigation())
  app.append(side, workspace)
  main.append(backdrop, app)

  const existingHabit = savedHabit()
  if (existingHabit) {
    input.value = existingHabit
    const selected = radios.find((radio) => radio.value === existingHabit)
    if (selected) selected.checked = true
  }

  function updateCounter() {
    const length = [...input.value].length
    counter.textContent = `${length}/${HABIT_MAX_LENGTH}`
    counter.setAttribute('aria-label', `${length} de ${HABIT_MAX_LENGTH} caracteres`)
    radios.forEach((radio) => {
      if (radio.value !== input.value) radio.checked = false
      radio.parentElement.lastElementChild.classList.toggle('hidden', !radio.checked)
    })
  }

  input.addEventListener('input', () => {
    updateCounter()
    clearFieldError(input, error)
    input.setAttribute('aria-describedby', counter.id)
    status.textContent = ''
    status.classList.add('hidden')
  })

  updateCounter()

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    status.textContent = ''
    status.classList.add('hidden')

    const result = validateDailyHabit(input.value)
    if (!result.ok) {
      setFieldError(input, error, result.error)
      input.setAttribute('aria-describedby', `${counter.id} ${error.id}`)
      input.focus()
      return
    }
    clearFieldError(input, error)
    input.setAttribute('aria-describedby', counter.id)

    // TODO(frontend-only): when requested, replace this local pending-sync
    // value with the backend habit API. This screen intentionally makes no API calls.
    try {
      localStorage.setItem(HABIT_STORAGE_KEY, result.habit)
    } catch {
      status.textContent = 'No se ha podido guardar en este dispositivo. Inténtalo de nuevo.'
      status.classList.remove('hidden')
      return
    }

    status.textContent = 'Hábito guardado en este dispositivo. La conexión con tu escuadrón queda pendiente.'
    status.classList.remove('hidden')
  })

  return main
}
