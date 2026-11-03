import mascotUrl from '../assets/mascota.webp'
import { appMark } from '../components/brand.js'

import { listSquads, ApiError } from '../api.js'

export function node(tag, className = '', text = '') {
  const el = document.createElement(tag)
  el.className = className
  el.textContent = text
  return el
}
export function link(href, text, className = 'squad-primary') {
  const el = node('a', className, text)
  el.href = href
  el.dataset.link = ''
  return el
}
export function squadShell(title) {
  const main = node('main', 'squad-page min-h-dvh font-rounded antialiased')
  const wrap = node('div', 'mx-auto w-full max-w-6xl px-4 py-5 sm:px-8 sm:py-8')
  const header = node('header', 'squad-nav mb-8 flex items-center justify-between gap-4 rounded-[2rem] p-4 sm:mb-12')
  const brand = link('/', '', 'flex min-h-11 items-center gap-2 text-lg font-black')
  brand.setAttribute('aria-label', 'HabitSquad, inicio')
  brand.append(appMark('h-9 w-9'), node('span', '', 'HabitSquad'))
  header.append(brand, node('span', 'squad-muted text-sm font-bold', 'Un día más, juntos.'))
  wrap.append(header, node('h1', 'text-[2rem] font-black tracking-tight', title))
  main.append(wrap)
  return { main, wrap }
}
export function menuScreen({ onLogout, title = 'Menú principal', loadSquads = listSquads } = {}) {
  const { main, wrap } = squadShell(title)
  wrap.append(node('p', 'squad-muted mt-2 text-base font-semibold', 'Tu próximo día de racha empieza aquí. Elige con quién lo compartes.'))
  const layout = node('div', 'mt-8 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]')
  const selector = node('section', 'squad-card p-5 sm:p-7')
  selector.setAttribute('aria-labelledby', 'squad-list-title')
  const heading = node('h2', 'text-xl font-black', 'Mis escuadrones')
  heading.id = 'squad-list-title'
  selector.append(heading, node('p', 'squad-muted mt-1 text-sm font-semibold', 'Selecciona un escuadrón para abrir su panel.'))
  const list = node('ul', 'mt-5 flex flex-col gap-3')
  const listStatus = node('p', 'squad-muted mt-4 text-sm font-semibold', 'Cargando tus escuadrones…')
  listStatus.setAttribute('role', 'status')
  const listError = node('p', 'mt-3 text-sm font-bold text-red-700')
  listError.setAttribute('role', 'alert')
  const retry = node('button', 'min-h-11 font-bold text-accent underline', 'Reintentar')
  retry.type = 'button'
  retry.hidden = true
  selector.append(listStatus, listError, list, retry)
  let loading = false
  async function load() {
    if (loading) return
    loading = true
    retry.hidden = true
    list.replaceChildren()
    listError.textContent = ''
    listStatus.textContent = 'Cargando tus escuadrones…'
    selector.setAttribute('aria-busy', 'true')
    try {
      const squads = await loadSquads()
      listStatus.textContent = squads.length ? `${squads.length} escuadrones disponibles` : 'Todavía no perteneces a ningún escuadrón. Crea uno o únete con un código.'
      for (const squad of squads) {
        const row = node('li')
        const item = link(`/escuadrones/panel?id=${squad.id}`, '', 'squad-choice flex min-h-24 items-center gap-4 rounded-[1.25rem] p-4')
        item.setAttribute('aria-label', `Abrir panel de ${squad.nombre}`)
        const details = node('span', 'min-w-0 flex-1')
        details.append(node('span', 'block text-base font-black', squad.nombre), node('span', 'squad-muted mt-1 block text-sm font-semibold', `${squad.miembros.length} de 5 miembros`))
        const initials = squad.nombre.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
        item.append(node('span', 'squad-avatar grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-black', initials), details, node('span', 'text-xl', '→'))
        row.append(item)
        list.append(row)
      }
    } catch (error) {
      listStatus.textContent = ''
      listError.textContent = error instanceof ApiError && error.status === 401
        ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
        : 'No se han podido cargar tus escuadrones. Comprueba la conexión y vuelve a intentarlo.'
      retry.hidden = false
    } finally {
      loading = false
      selector.setAttribute('aria-busy', 'false')
    }
  }
  retry.addEventListener('click', load)
  void load()
  const aside = node('div', 'flex flex-col gap-6')
  const create = node('section', 'squad-create overflow-hidden rounded-[1.75rem] p-6 text-white')
  const mascot = node('img', 'mb-3 h-24 w-24 object-contain')
  mascot.src = mascotUrl
  mascot.alt = ''
  create.append(mascot, node('h2', 'text-2xl font-black', 'Empieza una nueva racha'), node('p', 'mt-2 mb-5 text-base font-semibold', 'Reúne a tu gente y cread un hábito que dure.'), link('/escuadrones/nuevo', 'Crear un escuadrón', 'squad-white-button'), link('/escuadrones/unirse', 'Tengo un código de invitación', 'mt-3 flex min-h-11 items-center font-bold text-white underline'))
  const account = node('section', 'squad-card p-6')
  const logout = node('button', 'squad-logout mt-4 w-full', 'Cerrar sesión')
  logout.type = 'button'
  const status = node('p', 'squad-muted mt-2 text-sm font-semibold')
  status.setAttribute('role', 'status')
  logout.addEventListener('click', async () => {
    if (logout.disabled) return
    logout.disabled = true
    try { await onLogout?.() }
    catch { status.textContent = 'No se ha podido cerrar la sesión. Inténtalo de nuevo.' }
    finally { logout.disabled = false }
  })
  account.append(node('h2', 'text-lg font-black', 'Tu sesión'), node('p', 'squad-muted mt-1 text-sm font-semibold', 'Puedes volver cuando quieras. Tu escuadrón te espera.'), logout, status)
  aside.append(create, account)
  layout.append(selector, aside)
  wrap.append(layout)
  return main
}
