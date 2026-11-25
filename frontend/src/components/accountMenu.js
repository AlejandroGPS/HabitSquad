import { iniciales } from './avatar.js'
import { icon } from './icons.js'

const ITEM = [
  'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-start font-extrabold',
  'hover:bg-black/[0.05] focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-60',
].join(' ')

let nextId = 0

function link(href, iconName, text) {
  const node = document.createElement('a')
  node.className = `${ITEM} text-ink`
  node.href = href
  node.dataset.link = ''
  node.append(icon(iconName), text)
  return node
}

export function accountMenu({ nombre, fotoUrl, onLogout, loadProfile }) {
  const root = document.createElement('div')
  root.className = 'relative'

  const panelId = `menu-cuenta-${++nextId}`
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = [
    'grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-accent font-black text-white',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  ].join(' ')
  toggle.setAttribute('aria-label', 'Tu cuenta')
  toggle.setAttribute('aria-expanded', 'false')
  toggle.setAttribute('aria-controls', panelId)

  const panel = document.createElement('div')
  panel.id = panelId
  panel.hidden = true
  panel.className = [
    'absolute top-full right-0 z-20 mt-2 w-64 rounded-[1.25rem] bg-white p-2',
    'shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_40px_-12px_rgb(60_30_140/0.35)]',
  ].join(' ')

  const heading = document.createElement('p')
  heading.className = 'truncate px-3 pt-2 pb-1 text-[0.8125rem] font-extrabold text-ink-muted'
  function mostrarIdentidad(nombre, fotoUrl) {
    heading.textContent = nombre || 'Tu cuenta'
    const respaldo = !nombre && loadProfile ? icon('users') : iniciales(nombre)
    if (!fotoUrl) {
      toggle.replaceChildren(respaldo)
      return
    }
    const photo = document.createElement('img')
    photo.alt = ''
    photo.className = 'h-full w-full rounded-full object-cover'
    photo.referrerPolicy = 'no-referrer'
    photo.addEventListener('error', () => toggle.replaceChildren(respaldo), { once: true })
    photo.src = fotoUrl
    toggle.replaceChildren(photo)
  }
  mostrarIdentidad(nombre, fotoUrl)

  async function cargarIdentidad() {
    try {
      const perfil = await loadProfile()
      if (perfil) mostrarIdentidad(perfil.nickname, perfil.foto_url)
    } catch {
      // El menú sigue disponible si no se puede cargar la identidad.
    }
  }

  const separator = document.createElement('hr')
  separator.className = 'my-1 border-hairline'

  const logoutButton = document.createElement('button')
  logoutButton.type = 'button'
  logoutButton.className = `${ITEM} text-[#c93400]`
  logoutButton.append(icon('logout'), 'Cerrar sesión')
  logoutButton.disabled = !onLogout
  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true
    try {
      await onLogout()
    } finally {
      logoutButton.disabled = false
    }
  })

  panel.append(
    heading,
    link('/perfil', 'users', 'Ver perfil'),
    link('/escuadrones/nuevo', 'plus', 'Crear un escuadrón'),
    link('/escuadrones/unirse', 'join', 'Unirme a un escuadrón'),
    separator,
    logoutButton,
  )
  root.append(toggle, panel)

  function setOpen(open) {
    panel.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden))
  panel.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false)
  })
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || panel.hidden) return
    setOpen(false)
    toggle.focus()
  })
  document.addEventListener('click', function closeOutside(event) {
    if (!root.isConnected) document.removeEventListener('click', closeOutside)
    else if (!root.contains(event.target)) setOpen(false)
  })

  if (loadProfile) void cargarIdentidad()
  return root
}
