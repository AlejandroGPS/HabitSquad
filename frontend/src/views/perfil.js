import { getProfile, listSquads, getSquad } from '../api.js'
import { button, element } from '../components/dom.js'
import { icon } from '../components/icons.js'
import { iniciales } from '../components/avatar.js'
import { loadProfileInto, profileAvatar, profileCard, profileLink, profileShell, PROFILE_SOFT_BUTTON } from '../components/perfil.js'
import { semanaActual } from '../tiempo.js'
import { habitText } from './habitoDiario.js'

function momentoDe(ahora) {
  return ahora instanceof Date ? ahora : ahora()
}

function rachaChip(valor, donde) {
  const texto = `${valor} ${valor === 1 ? 'día' : 'días'} de racha`
  return element(
    'p',
    'inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full bg-[#fff1e6] px-4 py-1.5 text-sm font-black text-[#c93400]',
    icon('flame', 'h-4 w-4'),
    donde ? `${texto} · ${donde}` : texto,
  )
}

function fillStreak(node, valor, donde) {
  node.replaceChildren(Number.isInteger(valor) && valor >= 0 ? rachaChip(valor, donde) : null)
}

function estadoHabito(result, own) {
  if (result.status === 'rejected') return 'No disponible'
  if (!own?.habito) return 'Sin hábito'
  if (own.prueba_hoy?.estado === 'cumplido') return 'Cumplido hoy'
  if (own.prueba_hoy?.estado === 'no_cumplido') return 'No cumplido'
  if (own.prueba_hoy) return 'Pendiente'
  return 'Sin prueba'
}

function mejorRacha(rows) {
  return rows.reduce((mejor, row) => (
    row.failed || !Number.isInteger(row.squad.racha) ? mejor
      : !mejor || row.squad.racha > mejor.squad.racha ? row : mejor
  ), null)
}

function destacado(rows) {
  const disponible = rows.filter((row) => !row.failed)
  return mejorRacha(disponible) ?? disponible.find((row) => row.own?.habito) ?? disponible[0] ?? null
}

function marcaDia(estado, hoy) {
  if (estado === 'cumplido') return 'bg-[#248a3d] text-white'
  if (estado === 'pendiente') return 'bg-[#fff1e6] text-[#c93400]'
  if (estado === 'no_cumplido') return 'bg-[#fde8ea] text-[#d70015]'
  if (hoy) return 'bg-white text-accent ring-2 ring-inset ring-accent'
  return 'bg-[#f3f1f8] text-ink-muted'
}

function semanaDe(semana, ahora) {
  if (!Array.isArray(semana) || semana.length !== 7) return null
  const dias = semanaActual(ahora)
  const lista = element(
    'ol',
    'mt-4 grid grid-cols-7 gap-1',
    ...dias.map((dia, indice) => element(
      'li',
      'text-center',
      element('span', `block text-[0.6875rem] font-extrabold ${dia.hoy ? 'text-accent' : 'text-ink-muted'}`, dia.letra),
      element('span', `mx-auto mt-1 grid h-9 w-9 place-items-center rounded-full text-xs font-black ${marcaDia(semana[indice]?.estado, dia.hoy)}`, String(dia.numero)),
    )),
  )
  lista.setAttribute('aria-label', 'Esta semana')
  return lista
}

function accionDeHoy(squad, own) {
  if (!own?.habito) return ['Elegir mi hábito', `/habito?escuadron=${squad.id}`]
  if (!own.prueba_hoy) return ['Subir foto de prueba', `/prueba?escuadron=${squad.id}`]
  return ['Abrir escuadrón', `/escuadrones/panel?id=${squad.id}`]
}

function hoyCard(row, ahora) {
  const { squad, own } = row
  const [label, href] = accionDeHoy(squad, own)
  const semana = semanaDe(own?.semana, ahora)
  return profileCard('Hoy', squad.nombre,
    element('p', 'mt-3 break-words text-2xl font-black', own?.habito ? habitText(own.habito) : 'Aún no has elegido tu hábito'),
    element('p', 'mt-1 text-sm font-bold text-ink-muted', estadoHabito({ status: 'fulfilled' }, own)),
    semana,
    profileLink(href, label, `${PROFILE_SOFT_BUTTON} mt-4`),
  )
}

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

function habits(loadSquads, loadSquad, { onStreak, fallbackRacha, ahora, today }) {
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
    today.replaceChildren()
    try {
      const squads = await loadSquads()
      if (!squads.length) {
        status.textContent = 'Todavía no tienes escuadrones. Tu primer hábito empieza aquí.'
        body.append(profileLink('/escuadrones', 'Ver mis escuadrones'))
        onStreak(fallbackRacha, null)
        return
      }
      const details = await Promise.allSettled(squads.map(({ id }) => loadSquad(id)))
      const rows = details.map((result, index) => {
        const squad = result.status === 'fulfilled' ? result.value : squads[index]
        return { result, squad, own: squad.miembros?.find((member) => member.es_usuario), failed: result.status === 'rejected' }
      })
      const mejor = mejorRacha(rows)
      onStreak(mejor ? mejor.squad.racha : fallbackRacha, mejor ? mejor.squad.nombre : null)
      const foco = destacado(rows)
      if (foco) today.append(hoyCard(foco, momentoDe(ahora)))
      let failed = false
      for (const [index, row] of rows.entries()) {
        const { result, squad, own } = row
        const state = estadoHabito(result, own)
        const fulfilled = state === 'Cumplido hoy'
        const stateColor = fulfilled ? 'bg-[#e8f5ec] text-[#248a3d]' : own?.prueba_hoy ? 'bg-[#fff1e6] text-[#c93400]' : 'bg-white text-ink-muted'
        const letters = squad.nombre.trim().includes(' ') ? iniciales(squad.nombre) : squad.nombre.slice(0, 2).toUpperCase()
        const avatar = element('span', `grid h-11 w-11 shrink-0 place-items-center rounded-xl font-black text-white ${index % 2 ? 'bg-streak' : 'bg-accent'}`, letters)
        avatar.setAttribute('aria-hidden', 'true')
        if (row.failed) failed = true
        const title = own?.habito ? habitText(own.habito) : squad.nombre
        const text = element('div', 'min-w-0 flex-1 basis-40',
          element('p', 'break-words font-extrabold', title),
          own?.habito && element('p', 'break-words text-sm font-semibold text-ink-muted', squad.nombre),
        )
        text.title = `${title} · ${squad.nombre}`
        const racha = Number.isInteger(squad.racha)
          ? element('span', 'inline-flex shrink-0 items-center gap-1 font-black', String(squad.racha), icon('flame', 'h-4 w-4 text-streak'))
          : null
        const meta = element('span', 'ml-auto flex shrink-0 items-center gap-2',
          racha,
          element('span', `shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-extrabold ${stateColor}`, state),
        )
        body.append(profileLink(`/escuadrones/panel?id=${squad.id}`, [avatar, text, meta],
          'flex min-h-20 flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[#f3f1f8] p-3 hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent'))
      }
      count.textContent = `${squads.length} ${squads.length === 1 ? 'escuadrón' : 'escuadrones'}`
      status.textContent = ''
      retry.hidden = !failed
    } catch {
      status.textContent = 'No se han podido cargar tus hábitos.'
      retry.hidden = false
      onStreak(fallbackRacha, null)
    } finally { pending = false }
  }
  void load()
  return card
}

export function perfilScreen({ onLogout, racha = null, ahora = () => new Date(), api = { getProfile, listSquads, getSquad } } = {}) {
  const fallbackRacha = Number.isInteger(racha) && racha >= 0 ? racha : null
  const shell = profileShell('Mi perfil', onLogout)
  loadProfileInto(shell, api.getProfile, (profile) => {
    const avatar = element('div', 'relative mx-auto w-fit', profileAvatar(profile))
    const camera = profileLink('/perfil/editar#foto', icon('camera'), 'absolute -right-1 bottom-0 grid h-11 w-11 place-items-center rounded-full bg-accent text-white ring-4 ring-white focus-visible:outline-2 focus-visible:outline-accent')
    camera.setAttribute('aria-label', 'Cambiar foto de perfil')
    avatar.append(camera)
    const streak = element('div', 'empty:hidden')
    fillStreak(streak, fallbackRacha, null)
    const identity = profileCard('Tu perfil', null,
      element('div', 'mt-4 flex flex-col items-center gap-2 text-center', avatar,
        element('p', 'mt-2 max-w-full break-words text-2xl font-black', profile.nickname),
        element('p', 'max-w-full break-all font-semibold text-ink-muted', profile.email),
        streak,
        profile.email_pendiente && element('p', 'rounded-2xl bg-accent-soft p-3 text-sm font-bold text-accent', `Pendiente de confirmar: ${profile.email_pendiente}`),
        profileLink('/perfil/editar', 'Editar perfil', `${PROFILE_SOFT_BUTTON} mt-3`),
      ),
    )
    const today = element('div', 'profile-today empty:hidden')
    return element('div', 'profile-grid',
      element('div', 'profile-identity', identity),
      today,
      element('div', 'profile-summary min-w-0', habits(api.listSquads, api.getSquad, {
        today,
        ahora,
        fallbackRacha,
        onStreak: (valor, donde) => fillStreak(streak, valor, donde),
      })),
      element('div', 'profile-account', account(profile, onLogout)),
    )
  })
  return shell.root
}
