import { appMark } from './brand.js'
import { element } from './dom.js'
import { icon } from './icons.js'

export const APP_NAV = [
  { id: 'escuadron', label: 'Escuadrón', icon: 'users', href: '/' },
  { id: 'racha', label: 'Racha', icon: 'flame' },
  { id: 'alertas', label: 'Alertas', icon: 'bell' },
  { id: 'habito', label: 'Mi hábito', icon: 'book', href: '/habito', webOnly: true },
  { id: 'configuracion', label: 'Configuración', icon: 'settings', href: '/escuadrones/configuracion', webOnly: true },
]

// Las secciones sin pantalla todavía se muestran desactivadas en vez de llevar a una página vacía.
function navItem(item, active, className) {
  const current = item.id === active
  const state = current ? 'bg-black/[0.07] text-accent' : 'text-ink'
  const node = item.href ? element('a', `${className} ${state}`) : element('span', `${className} ${state} opacity-45`)
  if (item.href) {
    node.href = item.href
    node.dataset.link = ''
  } else {
    node.setAttribute('aria-disabled', 'true')
  }
  if (current) node.setAttribute('aria-current', 'page')
  return node
}

function sidebar(active, footer) {
  const brand = element(
    'a',
    'flex items-center gap-2.5 rounded-xl px-2 py-1',
    appMark('h-10 w-10'),
    element('span', 'text-[1.25rem] font-black text-ink', 'HabitSquad'),
  )
  brand.href = '/'
  brand.dataset.link = ''

  const nav = element('nav', 'mt-8 flex flex-col gap-1')
  nav.setAttribute('aria-label', 'Secciones')
  for (const item of APP_NAV) {
    const link = navItem(item, active, 'flex items-center gap-3 rounded-2xl px-3 py-2.5 font-extrabold')
    link.append(icon(item.icon), item.label)
    nav.append(link)
  }

  return element(
    'aside',
    'glass sticky top-4 m-4 me-0 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 flex-col rounded-[2rem] p-4 lg:flex',
    brand,
    nav,
    footer && element('div', 'mt-auto', footer),
  )
}

function tabBar(active) {
  const nav = element(
    'nav',
    'glass sticky bottom-4 z-10 mx-4 flex justify-around rounded-full p-1.5 lg:hidden',
  )
  nav.setAttribute('aria-label', 'Secciones')
  for (const item of APP_NAV.filter(({ webOnly }) => !webOnly)) {
    const link = navItem(
      item,
      active,
      'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[0.75rem] font-bold',
    )
    link.append(icon(item.icon, 'h-6 w-6 shrink-0'), element('span', '', item.label))
    nav.append(link)
  }
  return nav
}

export function appLayout({ active, kicker, title, leading, trailing, sidebarFooter, body, detail = false }) {
  const header = element(
    'header',
    'flex items-center gap-3 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-1 lg:px-0 lg:pt-8',
    leading && element('span', detail ? '' : 'lg:hidden', leading),
    element(
      'div',
      'min-w-0',
      element('p', 'text-[0.9375rem] font-bold text-ink-muted', kicker),
      element('h1', 'truncate text-[1.375rem] leading-tight font-black lg:text-[2rem]', title),
    ),
    trailing && element('div', 'ms-auto flex items-center gap-2', trailing),
  )

  const content = element(
    'div',
    'mx-auto flex min-h-dvh w-full max-w-md min-w-0 flex-col pb-[max(1rem,env(safe-area-inset-bottom))] lg:max-w-6xl lg:px-8 lg:pb-8',
    header,
    body,
    element('div', 'min-h-4 flex-1'),
    !detail && tabBar(active),
  )

  const backdrop = element('div', 'app-backdrop pointer-events-none fixed inset-0 -z-10')
  backdrop.setAttribute('aria-hidden', 'true')

  return element(
    'main',
    'relative isolate flex min-h-dvh overflow-x-clip font-rounded text-ink antialiased',
    backdrop,
    sidebar(active, sidebarFooter),
    element('div', 'min-w-0 flex-1', content),
  )
}
