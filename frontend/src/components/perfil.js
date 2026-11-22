import { ApiError } from '../api.js'
import { iniciales } from './avatar.js'
import { accountMenu } from './accountMenu.js'
import { element } from './dom.js'
import { landingNav } from './landing/landingNav.js'

export const PROFILE_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-extrabold text-white hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-wait'
export const PROFILE_SOFT_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent-soft px-5 py-2.5 font-extrabold text-accent hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50'

export function profileLink(href, text, className = PROFILE_SOFT_BUTTON) {
  const link = element('a', className, text)
  link.href = href
  link.dataset.link = ''
  return link
}

export function profileCard(title, description, ...children) {
  return element('section', 'profile-card',
    element('h2', 'text-lg font-black', title),
    description && element('p', 'mt-1 font-semibold text-ink-muted', description),
    ...children,
  )
}

export function profileAvatar(profile, className = 'h-24 w-24') {
  const fallback = element('span', `grid ${className} shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-3xl font-black text-accent ring-4 ring-white`, iniciales(profile.nickname))
  if (profile.foto_url) {
    const image = element('img', 'h-full w-full object-cover')
    image.src = profile.foto_url
    image.alt = `Foto de ${profile.nickname}`
    image.referrerPolicy = 'no-referrer'
    image.addEventListener('error', () => fallback.replaceChildren(iniciales(profile.nickname)), { once: true })
    fallback.replaceChildren(image)
  }
  return fallback
}

export function profileShell(title, onLogout) {
  const content = element('main', 'mx-auto w-full max-w-6xl px-4 pt-6 pb-12 sm:px-8 lg:pt-10')
  content.append(element('h1', 'mb-6 text-3xl font-black tracking-tight sm:text-4xl', title))
  const background = element('div', 'access-backdrop pointer-events-none fixed inset-0 -z-10')
  background.setAttribute('aria-hidden', 'true')
  const nav = landingNav({ cuenta: accountMenu({ onLogout }) })
  const root = element('div', 'relative isolate min-h-dvh overflow-x-clip font-rounded text-ink antialiased', background, nav, content)
  return {
    root, content,
    updateAccount(profile) {
      const next = landingNav({ cuenta: accountMenu({ nombre: profile.nickname, fotoUrl: profile.foto_url, onLogout }) })
      root.querySelector('header').replaceWith(next)
    },
  }
}

export function profileError(error) {
  if (error instanceof ApiError) {
    if (error.status === 501) return 'El perfil todavía no está disponible. Inténtalo de nuevo más tarde.'
    if (error.status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
    if (error.status === 429) return 'Has hecho demasiados intentos. Espera un rato y vuelve a probar.'
    if (error.status === 400) {
      for (const value of Object.values(error.data ?? {})) {
        const message = Array.isArray(value) ? value[0] : value
        if (typeof message === 'string') return message
      }
    }
  }
  return 'No se ha podido completar la operación. Comprueba la conexión e inténtalo de nuevo.'
}

export function loadProfileInto(shell, load, render) {
  const status = element('p', 'font-bold text-ink-muted', 'Cargando tu perfil…')
  status.setAttribute('role', 'status')
  const error = element('p', 'font-bold text-[#d70015] empty:hidden')
  error.setAttribute('role', 'alert')
  const retry = element('button', `${PROFILE_SOFT_BUTTON} mt-4`, 'Reintentar')
  retry.type = 'button'
  retry.hidden = true
  const area = element('div', '', status, error, retry)
  shell.content.append(area)
  let pending = false
  async function run() {
    if (pending) return
    pending = true
    area.setAttribute('aria-busy', 'true')
    retry.hidden = true
    error.textContent = ''
    status.textContent = 'Cargando tu perfil…'
    try {
      const profile = await load()
      shell.updateAccount(profile)
      area.replaceChildren(render(profile))
    } catch (cause) {
      status.textContent = ''
      error.textContent = profileError(cause)
      retry.hidden = false
    } finally {
      pending = false
      area.setAttribute('aria-busy', 'false')
    }
  }
  retry.addEventListener('click', run)
  void run()
}
