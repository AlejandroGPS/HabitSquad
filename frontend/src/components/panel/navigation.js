import { APP_NAV, updateAppNavigation } from '../appLayout.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'
import { rememberSquad, rememberedSquad } from '../../session.js'

export function selectedSquadId(id) {
  const value = String(id ?? '')
  if (/^[1-9]\d*$/.test(value)) return value
  const remembered = rememberedSquad()
  return remembered && /^[1-9]\d*$/.test(remembered) ? remembered : null
}

// Las pantallas del escuadrón comparten las secciones y el escuadrón seleccionado.
export function squadNavigation(id, isAdmin = false) {
  const selectedId = selectedSquadId(id)
  if (selectedId) rememberSquad(selectedId)
  const selected = Boolean(selectedId)
  const items = APP_NAV.map((item) => {
    if (selected && item.id === 'escuadron') return { ...item, href: `/escuadrones/panel?id=${selectedId}` }
    if (selected && item.id === 'habito') return { ...item, href: `/habito?escuadron=${selectedId}` }
    if (selected && item.id === 'alertas') return { ...item, href: `/alertas?escuadron=${selectedId}` }
    return { ...item }
  })
  if (isAdmin) items.splice(1, 0, {
    id: 'configuracion', label: 'Configuración', icon: 'settings',
    href: selected ? `/escuadrones/configuracion?origen=${selectedId}` : '/escuadrones/configuracion',
  })
  return items
}

export function isSquadAdmin(squad) {
  return squad?.miembros?.some((member) => member.es_usuario && member.es_administrador === true) ?? false
}

export function squadSettingsSlot() {
  const slot = element('span', 'contents')
  slot.dataset.squadSettings = ''
  return slot
}

export function updateSquadNavigation(root, id, active, isAdmin) {
  updateAppNavigation(root, active, squadNavigation(id, isAdmin))
  root.querySelector('[data-squad-settings]')?.replaceChildren(...(isAdmin ? [squadSettingsLink(id)] : []))
}

export function squadSettingsLink(id) {
  const link = element('a', 'glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-accent lg:hidden', icon('settings'))
  link.href = squadNavigation(id, true).find(({ id }) => id === 'configuracion').href
  link.dataset.link = ''
  link.setAttribute('aria-label', 'Configuración del escuadrón')
  return link
}
