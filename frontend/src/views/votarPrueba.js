import { appMark } from '../components/brand.js'
import { flameIcon } from '../components/icons.js'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

// Mock submission and previous votes; replace with API data when proof endpoints exist.
const MOCK_SUBMISSION = {
  member: 'Laura',
  initial: 'L',
  habit: 'Leer',
  comment: 'Capítulo 7 terminado',
  submittedAt: 'Hoy · 20:14',
  yesVotes: 1,
  totalVotes: 2,
  voters: [{ name: 'Carlos', initial: 'C', vote: 'sí' }],
}

function element(tag, className = '', text = '') {
  const node = document.createElement(tag)
  node.className = className
  if (text) node.textContent = text
  return node
}

function svgIcon(name, className = 'h-5 w-5') {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.8')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add(...className.split(/\s+/).filter(Boolean))

  const shapes = {
    back: [['path', { d: 'm15 18-6-6 6-6' }]],
    squad: [
      ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }],
      ['circle', { cx: '10', cy: '7', r: '4' }],
      ['path', { d: 'M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' }],
    ],
    bell: [
      ['path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9' }],
      ['path', { d: 'M10 21h4' }],
    ],
    habit: [
      ['rect', { x: '4', y: '4', width: '16', height: '16', rx: '2' }],
      ['path', { d: 'M9 9h6M9 13h6M9 17h3' }],
    ],
    proof: [
      ['path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z' }],
      ['path', { d: 'M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20M8 7h8M8 11h8' }],
    ],
    check: [['path', { d: 'm5 12 4 4L19 6' }]],
    close: [['path', { d: 'm18 6-12 12M6 6l12 12' }]],
    people: [
      ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }],
      ['circle', { cx: '10', cy: '7', r: '4' }],
      ['path', { d: 'M20 8v6M23 11h-6' }],
    ],
  }
  for (const [tag, attributes] of shapes[name] ?? []) {
    const shape = document.createElementNS(SVG_NAMESPACE, tag)
    for (const [attribute, value] of Object.entries(attributes)) {
      shape.setAttribute(attribute, value)
    }
    svg.append(shape)
  }
  return svg
}

function menuIcon(name) {
  if (name === 'streak') return flameIcon('h-[1.125rem] w-[1.125rem] shrink-0')
  return svgIcon(name, 'h-[1.125rem] w-[1.125rem] shrink-0')
}

function sidebarItem({ label, icon, href, badge, active = false }) {
  const item = element(href ? 'a' : 'span')
  item.className = [
    'relative flex min-h-10 min-w-0 items-center gap-2.5 rounded-xl px-2.5 text-[0.8125rem] font-extrabold',
    active ? 'bg-accent-soft text-accent' : 'text-ink-muted',
    href && !active ? 'hover:bg-white/70 hover:text-ink' : '',
  ].join(' ')
  if (href) {
    item.href = href
    item.dataset.link = ''
  }
  if (active) item.setAttribute('aria-current', 'page')
  item.append(menuIcon(icon), element('span', 'min-w-0 flex-1 truncate', label))
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

function squadNavigation() {
  const items = [
    { label: 'Escuadrón', icon: 'squad', href: '/', active: true },
    { label: 'Racha', icon: 'streak' },
    { label: 'Alertas', icon: 'bell', badge: '3' },
    { label: 'Mi hábito', icon: 'habit', href: '/habito' },
  ]

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
  for (const item of items) nav.append(sidebarItem(item))

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

  const mobile = element(
    'nav',
    'glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 grid grid-cols-4 rounded-2xl p-1.5 lg:hidden',
  )
  mobile.setAttribute('aria-label', 'Navegación principal')
  for (const item of items) {
    const link = element(
      item.href ? 'a' : 'span',
      `flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[0.625rem] font-extrabold ${item.active ? 'bg-accent-soft text-accent' : 'text-ink-muted'}`,
    )
    if (item.href) {
      link.href = item.href
      link.dataset.link = ''
    }
    if (item.active) link.setAttribute('aria-current', 'page')
    link.append(menuIcon(item.icon), element('span', 'truncate', item.label))
    mobile.append(link)
  }
  return { aside, mobile }
}

function bookArtwork() {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
  svg.setAttribute('viewBox', '0 0 360 250')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', 'Ilustración de un libro abierto como vista previa de la foto')
  svg.setAttribute('class', 'h-[58%] w-[80%] max-w-[25rem] drop-shadow-[0_18px_18px_rgb(70_30_90/0.24)]')

  const add = (tag, attributes) => {
    const shape = document.createElementNS(SVG_NAMESPACE, tag)
    for (const [name, value] of Object.entries(attributes)) {
      shape.setAttribute(name, value)
    }
    svg.append(shape)
  }
  add('path', { d: 'M38 47 Q104 30 178 58 L178 220 Q102 194 38 210 Z', fill: '#fff9e9' })
  add('path', { d: 'M182 58 Q255 30 322 47 L322 210 Q254 194 182 220 Z', fill: '#fffdf5' })
  add('path', { d: 'M180 58 L180 219', stroke: '#e6dcc5', 'stroke-width': '5' })
  for (const y of [84, 109, 134, 159, 184]) {
    add('path', { d: `M62 ${y} H150`, stroke: '#d8cdb7', 'stroke-linecap': 'round', 'stroke-width': '6' })
    add('path', { d: `M207 ${y} H294`, stroke: '#d8cdb7', 'stroke-linecap': 'round', 'stroke-width': '6' })
  }
  add('path', { d: 'M270 39 H294 V105 L282 94 L270 105 Z', fill: '#ff5d45' })
  return svg
}

function photoCard() {
  const figure = element(
    'figure',
    'relative flex aspect-[4/3] min-h-[15rem] w-full items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#ffc48d] via-[#f39d9f] to-[#8540d8] sm:min-h-[20rem] lg:aspect-auto lg:min-h-[23rem]',
  )
  figure.setAttribute('aria-label', 'Foto de prueba de Laura, vista previa de ejemplo')
  figure.append(bookArtwork())
  const caption = element(
    'figcaption',
    'absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 rounded-full border border-white/15 bg-[#351c5d]/65 px-2.5 py-2 text-white backdrop-blur-xl sm:inset-x-3 sm:bottom-3 sm:px-3',
  )
  caption.append(
    element('span', 'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d83a12] text-[0.75rem] font-black', MOCK_SUBMISSION.initial),
    element('span', 'min-w-0 flex-1', ''),
  )
  caption.lastElementChild.append(
    element('span', 'block text-[0.75rem] font-extrabold', MOCK_SUBMISSION.member),
    element('span', 'block text-[0.625rem] font-semibold text-white/75', MOCK_SUBMISSION.submittedAt),
  )
  caption.append(
    element('span', 'rounded-full bg-white/15 px-2 py-1 text-[0.5625rem] font-bold text-white/90', 'Foto de ejemplo'),
  )
  figure.append(caption)
  return figure
}

function proofDetails() {
  const card = element(
    'section',
    'rounded-3xl bg-gradient-to-br from-accent to-accent-hover p-4 text-white shadow-[0_7px_0_rgb(63_31_179/0.16),0_15px_24px_-18px_rgb(60_30_140/0.5)] sm:p-5',
  )
  const heading = element('div', 'flex items-start justify-between gap-3')
  heading.append(
    element('div', 'min-w-0', ''),
    element('span', 'grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 text-white/90', ''),
  )
  heading.firstElementChild.append(
    element('p', 'text-[0.6875rem] font-bold text-white/75', 'Su hábito'),
    element('h2', 'mt-0.5 text-[1.125rem] leading-tight font-black', MOCK_SUBMISSION.habit),
  )
  heading.lastElementChild.append(svgIcon('proof', 'h-4 w-4'))

  const quote = element(
    'blockquote',
    'mt-3 rounded-xl bg-white/15 px-3 py-2 text-[0.75rem] font-semibold italic text-white/95',
    `«${MOCK_SUBMISSION.comment}»`,
  )
  card.append(heading, quote)
  return card
}

function votesCard() {
  const card = element(
    'section',
    'rounded-3xl border-2 border-white bg-white/85 p-4 shadow-[0_6px_0_rgb(60_30_140/0.06),0_14px_25px_-20px_rgb(60_30_140/0.42)] sm:p-5',
  )
  card.setAttribute('aria-label', 'Votos de la prueba')
  const titleRow = element('div', 'flex items-center justify-between gap-3')
  titleRow.append(
    element('div', 'min-w-0', ''),
    element('span', 'grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-success/10 text-success', ''),
  )
  titleRow.firstElementChild.append(
    element('p', 'text-[0.6875rem] font-bold text-ink-muted', 'Votos'),
    element('p', 'text-[1.375rem] leading-tight font-black text-ink', `${MOCK_SUBMISSION.yesVotes} de ${MOCK_SUBMISSION.totalVotes}`),
  )
  titleRow.lastElementChild.append(svgIcon('people', 'h-4 w-4'))

  const voterList = element('ul', 'mt-2 flex flex-col gap-1.5')
  const voterRows = new Map()
  for (const voter of MOCK_SUBMISSION.voters) {
    const row = element('li', 'flex min-w-0 items-center gap-2 text-[0.6875rem]')
    row.append(
      element('span', 'grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#248a3d] text-white', ''),
      element('span', 'min-w-0 truncate font-extrabold text-ink', voter.name),
      element('span', 'min-w-0 truncate font-semibold text-ink-muted', `ha dicho que ${voter.vote}`),
    )
    row.firstElementChild.append(svgIcon('check', 'h-3.5 w-3.5'))
    voterRows.set(voter.name, row)
    voterList.append(row)
  }

  const selfRow = element('li', 'flex min-w-0 items-center gap-2 text-[0.6875rem]')
  const selfBadge = element('span', 'grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-fill text-[0.625rem] font-black text-ink-muted', 'A')
  const selfName = element('span', 'shrink-0 font-extrabold text-ink', 'Tú')
  const selfVote = element('span', 'min-w-0 truncate font-semibold text-ink-muted', 'Te falta tu voto')
  selfRow.append(selfBadge, selfName, selfVote)
  voterList.append(selfRow)

  const result = element(
    'p',
    'mt-3 hidden rounded-xl bg-accent-soft px-3 py-2 text-[0.6875rem] leading-snug font-extrabold text-accent',
  )
  result.setAttribute('role', 'status')
  result.setAttribute('aria-live', 'polite')

  card.append(titleRow, voterList, result)
  return {
    card,
    count: titleRow.firstElementChild.lastElementChild,
    selfBadge,
    selfVote,
    result,
    voterRows,
  }
}

function header() {
  const row = element('header', 'mb-4 flex min-w-0 items-center gap-2.5 sm:mb-5 sm:gap-3')
  const back = element(
    'a',
    'glass grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink transition hover:-translate-x-0.5 focus-visible:outline-2 focus-visible:outline-accent sm:h-10 sm:w-10',
  )
  back.href = '/'
  back.dataset.link = ''
  back.setAttribute('aria-label', 'Volver al escuadrón')
  back.append(svgIcon('back', 'h-5 w-5'))

  const title = element('div', 'min-w-0 flex-1')
  title.append(
    element('p', 'text-[0.625rem] font-bold text-ink-muted sm:text-[0.6875rem]', 'Votación'),
    element('h1', 'truncate text-[1.125rem] leading-tight font-black tracking-tight text-ink sm:text-[1.5rem]', `Prueba de ${MOCK_SUBMISSION.member}`),
  )

  const actions = element('div', 'ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2')
  const streak = element('div', 'glass flex h-8 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-black text-ink sm:h-9 sm:px-3 sm:text-[0.8125rem]')
  streak.append(flameIcon('h-4 w-4 text-streak'), element('span', '', '12'))
  const bell = element('span', 'glass relative grid h-8 w-8 place-items-center rounded-full text-ink-muted sm:h-9 sm:w-9')
  bell.setAttribute('aria-label', 'Avisos: 3 pendientes')
  bell.append(svgIcon('bell', 'h-4 w-4'))
  bell.append(element('span', 'absolute end-1 top-1 h-2 w-2 rounded-full bg-streak ring-2 ring-white'))
  const avatar = element('span', 'grid h-8 w-8 place-items-center rounded-full bg-accent text-[0.75rem] font-black text-white sm:h-9 sm:w-9', 'A')
  avatar.setAttribute('aria-label', 'Perfil de Ana')
  actions.append(streak, bell, avatar)
  row.append(back, title, actions)
  return row
}

function mockVotePanel() {
  const panel = element('div', 'flex min-w-0 flex-col gap-3.5')
  const details = proofDetails()
  const votes = votesCard()
  const buttons = element('div', 'grid grid-cols-2 gap-2 sm:gap-3')
  const no = element(
    'button',
    'flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full border-2 border-[#f5cbd2] bg-[#f4dce1] px-2 text-[0.75rem] font-extrabold text-[#d70015] transition hover:bg-[#f7d1d8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d70015] disabled:cursor-default disabled:opacity-50 sm:text-[0.8125rem]',
  )
  no.type = 'button'
  no.append(svgIcon('close', 'h-4 w-4'), element('span', '', 'No cuenta'))

  const yes = element(
    'button',
    'flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#248a3d] px-2 text-[0.75rem] font-extrabold text-white transition hover:bg-[#1d7332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#248a3d] disabled:cursor-default disabled:opacity-50 sm:text-[0.8125rem]',
  )
  yes.type = 'button'
  yes.append(svgIcon('check', 'h-4 w-4'), element('span', '', 'Sí, cuenta'))
  buttons.append(no, yes)

  const vote = (value) => {
    if (no.disabled || yes.disabled) return
    const approvedVotes = MOCK_SUBMISSION.yesVotes + (value === 'sí' ? 1 : 0)
    const voteTotal = MOCK_SUBMISSION.totalVotes
    votes.count.textContent = `${voteTotal} de ${voteTotal}`
    votes.selfBadge.className = `grid h-6 w-6 shrink-0 place-items-center rounded-lg ${value === 'sí' ? 'bg-[#248a3d] text-white' : 'bg-[#d70015] text-white'}`
    votes.selfBadge.replaceChildren(svgIcon(value === 'sí' ? 'check' : 'close', 'h-3.5 w-3.5'))
    votes.selfVote.textContent = `ha dicho que ${value}`
    votes.selfVote.className = 'min-w-0 truncate font-semibold text-ink-muted'
    votes.result.textContent = approvedVotes > voteTotal / 2
      ? 'Voto guardado en esta vista de ejemplo: la prueba cuenta para la racha.'
      : 'Voto guardado en esta vista de ejemplo: la prueba no alcanza la mayoría para la racha.'
    votes.result.classList.remove('hidden')
    no.disabled = true
    yes.disabled = true

    // TODO(frontend-only): send this vote to the backend when the proof-voting API is ready.
  }
  no.addEventListener('click', () => vote('no'))
  yes.addEventListener('click', () => vote('sí'))

  panel.append(details, votes.card, buttons)
  return panel
}

export function votarPruebaScreen() {
  const main = element(
    'main',
    'relative isolate min-h-dvh w-full overflow-x-clip font-rounded text-ink antialiased ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]',
  )
  const backdrop = element('div', 'access-backdrop fixed inset-0 -z-10')
  backdrop.setAttribute('aria-hidden', 'true')

  const app = element('div', 'relative z-10 flex min-h-dvh items-stretch gap-3 p-3 sm:gap-4 sm:p-4')
  const { aside, mobile } = squadNavigation()
  const workspace = element('div', 'flex min-w-0 flex-1 flex-col pb-20 lg:pb-0')
  const panel = element('div', 'mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col')
  panel.append(header())

  const content = element('div', 'grid min-w-0 grid-cols-1 gap-3.5 lg:grid-cols-[1.05fr_1fr] lg:gap-4')
  const photo = element(
    'div',
    'rounded-3xl border-2 border-white bg-white/85 p-2.5 shadow-[0_7px_0_rgb(60_30_140/0.06),0_18px_28px_-20px_rgb(60_30_140/0.42)] sm:p-3',
  )
  photo.append(photoCard())
  content.append(photo, mockVotePanel())
  panel.append(content)

  const note = element(
    'p',
    'mt-3 text-center text-[0.625rem] font-semibold text-ink-muted lg:text-start',
    'Vista con foto y votos de ejemplo. Las votaciones reales estarán disponibles al conectar el backend.',
  )
  panel.append(note)
  workspace.append(panel, mobile)
  app.append(aside, workspace)
  main.append(backdrop, app)
  return main
}
