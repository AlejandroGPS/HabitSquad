import { getProfile, listSquads, getSquad } from '../api.js'
import { button, element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import { iniciales } from '../components/avatar.js'
import { loadProfileInto, profileAvatar, profileCard, profileLink, profileShell, PROFILE_SOFT_BUTTON } from '../components/perfil.js'
import { habitText } from './habitoDiario.js'

function account(profile, onLogout) {
  const row = (label, value, href) => profileLink(href, element('span', 'flex w-full items-center justify-between gap-3',
    element('span', 'font-extrabold', label),
    element('span', 'flex shrink-0 items-center gap-2 text-sm text-ink-muted', value, icon('forward', 'h-4 w-4 shrink-0'))),
  'flex min-h-12 items-center rounded-xl px-2 hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent')
  return profileCard('Cuenta', null,
    element('div', 'mt-3 flex flex-col gap-1',
      row('Correo', profile.email_pendiente ? 'Cambio pendiente' : 'Gestionar', '/perfil/editar#correo'),
      row('Cambiar contraseña', '', '/perfil/editar#contrasena'),
      row('Recordatorio', profile.hora_aviso, '/perfil/editar#recordatorio'),
      button('mt-3 flex min-h-11 items-center gap-3 border-t border-hairline pt-3 font-extrabold text-[#c93400]', async (event) => {
        const control = event.currentTarget
        control.disabled = true
        try { await onLogout?.() } finally { control.disabled = false }
      }, icon('logout'), 'Cerrar sesión'),
    ),
  )
}

function habits(loadSquads, loadSquad) {
  const body = element('div', 'mt-4 flex flex-col gap-3')
  const status = element('p', 'mt-3 text-sm font-semibold text-ink-muted', 'Cargando tus hábitos…')
  status.setAttribute('role', 'status')
  const count = element('p', 'shrink-0 text-sm font-semibold text-ink-muted')
  const retry = button(`${PROFILE_SOFT_BUTTON} mt-3`, load, 'Reintentar')
  retry.hidden = true
  const card = profileCard('Mis hábitos', null, status, body, retry)
  const heading = card.querySelector('h2')
  const header = element('div', 'flex items-center justify-between gap-3')
  heading.before(header)
  header.append(heading, count)
  let pending = false
  async function load() {
    if (pending) return
    pending = true
    retry.hidden = true
    status.textContent = 'Cargando tus hábitos…'
    count.textContent = ''
    body.replaceChildren()
    try {
      const squads = await loadSquads()
      if (!squads.length) {
        status.textContent = 'Todavía no tienes escuadrones. Tu primer hábito empieza aquí.'
        body.append(profileLink('/escuadrones', 'Ver mis escuadrones'))
        return
      }
      const details = await Promise.allSettled(squads.map(({ id }) => loadSquad(id)))
      let failed = false
      details.forEach((result, index) => {
        const squad = result.status === 'fulfilled' ? result.value : squads[index]
        const own = squad.miembros?.find((member) => member.es_usuario)
        const fulfilled = own?.prueba_hoy?.estado === 'cumplido'
        const state = result.status === 'rejected' ? 'No disponible' : !own?.habito ? 'Sin hábito' : fulfilled ? 'Cumplido hoy' : own.prueba_hoy?.estado === 'no_cumplido' ? 'No cumplido' : own.prueba_hoy ? 'Pendiente' : 'Sin prueba'
        const stateColor = fulfilled ? 'bg-[#e8f5ec] text-[#248a3d]' : own?.prueba_hoy ? 'bg-[#fff1e6] text-[#c93400]' : 'bg-white text-ink-muted'
        const letters = squad.nombre.trim().includes(' ') ? iniciales(squad.nombre) : squad.nombre.slice(0, 2).toUpperCase()
        const avatar = element('span', `grid h-11 w-11 shrink-0 place-items-center rounded-xl font-black text-white ${index % 2 ? 'bg-streak' : 'bg-accent'}`, letters)
        avatar.setAttribute('aria-hidden', 'true')
        if (result.status === 'rejected') failed = true
        const title = own?.habito ? habitText(own.habito) : squad.nombre
        const text = element('div', 'min-w-0 flex-1',
          element('p', 'break-words font-extrabold', title),
          own?.habito && element('p', 'break-words text-sm font-semibold text-ink-muted', squad.nombre),
        )
        text.title = `${title} · ${squad.nombre}`
        body.append(profileLink(`/escuadrones/panel?id=${squad.id}`, [avatar, text,
          element('span', `shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-extrabold ${stateColor}`, state),
        ], 'flex min-h-20 items-center gap-3 rounded-2xl bg-[#f3f1f8] p-3 hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent'))
      })
      count.textContent = `${squads.length} ${squads.length === 1 ? 'escuadrón' : 'escuadrones'}`
      status.textContent = ''
      retry.hidden = !failed
    } catch {
      status.textContent = 'No se han podido cargar tus hábitos.'
      retry.hidden = false
    } finally { pending = false }
  }
  void load()
  return card
}

export function perfilScreen({ onLogout, racha = null, api = { getProfile, listSquads, getSquad } } = {}) {
  const hasStreak = Number.isInteger(racha) && racha >= 0
  const shell = profileShell('Mi perfil', onLogout)
  loadProfileInto(shell, api.getProfile, (profile) => {
    const avatar = element('div', 'relative mx-auto w-fit', profileAvatar(profile))
    const camera = profileLink('/perfil/editar#foto', icon('camera'), 'absolute -right-1 bottom-0 grid h-11 w-11 place-items-center rounded-full bg-accent text-white ring-4 ring-white focus-visible:outline-2 focus-visible:outline-accent')
    camera.setAttribute('aria-label', 'Cambiar foto de perfil')
    avatar.append(camera)
    const identity = profileCard('Tu perfil', null,
      element('div', 'mt-4 flex flex-col items-center gap-2 text-center', avatar,
        element('p', 'mt-2 max-w-full break-words text-2xl font-black', profile.nickname),
        element('p', 'max-w-full break-all font-semibold text-ink-muted', profile.email),
        hasStreak && element('p', 'mt-1 inline-flex items-center gap-2 rounded-full bg-[#fff1e6] px-4 py-1.5 text-sm font-black text-[#c93400]',
          icon('flame', 'h-4 w-4'), `${racha} ${racha === 1 ? 'día' : 'días'} de racha`),
        profile.email_pendiente && element('p', 'rounded-2xl bg-accent-soft p-3 text-sm font-bold text-accent', `Pendiente de confirmar: ${profile.email_pendiente}`),
        profileLink('/perfil/editar', 'Editar perfil', `${PROFILE_SOFT_BUTTON} mt-3`),
      ),
    )
    return element('div', 'profile-grid',
      element('div', 'profile-identity', identity),
      element('div', 'profile-summary min-w-0', habits(api.listSquads, api.getSquad)),
      element('div', 'profile-account', account(profile, onLogout)),
    )
  })
  return shell.root
}
