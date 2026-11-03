import { flameIcon } from './icons.js'
import { mascota } from './mascota.js'
import { accessNavbar } from './navbar.js'

const SQUAD = [
  { initial: 'C', color: 'bg-[#7c5cff]' },
  { initial: 'L', color: 'bg-streak' },
  { initial: 'T', color: 'bg-sky' },
]

function element(tag, className = '', text = '') {
  const node = document.createElement(tag)
  node.className = className
  if (text) node.textContent = text
  return node
}

function badge(className, ...children) {
  const node = element(
    'div',
    `glass absolute hidden items-center gap-2 rounded-2xl px-4 py-3 motion-safe:animate-float lg:flex ${className}`,
  )
  node.append(...children)
  return node
}

export function squadBadges() {
  const team = element('div', 'flex -space-x-2')
  for (const { initial, color } of SQUAD) {
    team.append(
      element(
        'span',
        `grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[0.8125rem] font-black text-white ${color}`,
        initial,
      ),
    )
  }

  const badges = element('div', 'pointer-events-none absolute inset-0')
  badges.setAttribute('aria-hidden', 'true')
  badges.append(
    badge(
      'top-[22%] left-[10%] -rotate-6',
      flameIcon('h-7 w-7 shrink-0 text-streak'),
      element('span', 'text-[1.5rem] font-black text-streak', '12'),
      element('span', 'text-[0.875rem] font-bold text-ink-muted', 'días'),
    ),
    badge(
      'top-[30%] right-[9%] rotate-3 [animation-delay:-2s]',
      element(
        'span',
        'grid h-8 w-8 place-items-center rounded-full bg-success text-[1rem] font-black text-white',
        '✓',
      ),
      element('span', 'text-[0.9375rem] font-extrabold text-ink', 'Carlos ha cumplido'),
    ),
    badge(
      'bottom-[16%] left-[13%] rotate-2 [animation-delay:-4s]',
      team,
      element('span', 'text-[0.9375rem] font-extrabold text-ink', '1 de 3 hoy'),
    ),
  )
  return badges
}

function mascot() {
  return mascota('h-20 w-auto drop-shadow-[0_14px_16px_rgb(60_30_140/0.22)] motion-safe:animate-bob sm:h-24')
}

export function accessLayout({
  active = null,
  title,
  description,
  bubble,
  showAccountLinks = true,
  hideGreetingOnShortScreens = false,
  cardClassName = 'glass w-full max-w-[25rem] rounded-[2rem] p-6 sm:p-7',
}) {
  const main = element(
    'main',
    [
      'relative isolate flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip',
      'font-rounded text-ink antialiased',
      'ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]',
    ].join(' '),
  )

  const backdrop = element('div', 'access-backdrop fixed inset-0 -z-10')
  backdrop.setAttribute('aria-hidden', 'true')

  const greeting = element(
    'div',
    `mb-4 flex items-center gap-4 ${hideGreetingOnShortScreens ? '[@media(max-height:720px)]:hidden' : ''}`,
  )
  greeting.append(
    mascot(),
    element(
      'p',
      'glass speech-bubble rounded-2xl px-4 py-2.5 text-[1rem] font-extrabold text-ink',
      bubble,
    ),
  )

  const card = element('section', cardClassName)
  const content = element('div', 'mt-1 flex min-w-0 flex-col')
  card.append(
    element(
      'h1',
      'text-center text-[1.5rem] leading-tight font-extrabold tracking-tight text-balance',
      title,
    ),
    element(
      'p',
      'mt-0.5 text-center text-[0.9375rem] font-semibold text-pretty text-ink-muted',
      description,
    ),
    content,
  )

  const body = element(
    'div',
    'relative flex flex-1 flex-col items-center justify-center px-4 py-2 sm:py-4',
  )
  body.append(squadBadges(), greeting, card)

  main.append(backdrop, accessNavbar({ active, showAccountLinks }), body)
  return { main, content }
}
