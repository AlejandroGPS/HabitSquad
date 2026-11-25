import { APP_NAV } from '../appLayout.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'
import { rememberSquad, rememberedSquad } from '../../session.js'

function squadId(id) {
  const value = String(id ?? '')
  if (/^[1-9]\d*$/.test(value)) return value
  const remembered = rememberedSquad()
  return remembered && /^[1-9]\d*$/.test(remembered) ? remembered : null
}

// Panel, alertas, hábito y configuración comparten las secciones y el escuadrón seleccionado.
export function squadNavigation(id) {
  const selectedId = squadId(id)
  if (selectedId) rememberSquad(selectedId)
  const selected = Boolean(selectedId)
  return [
    ...APP_NAV.map((item) => {
      if (selected && item.id === 'escuadron') return { ...item, href: `/escuadrones/panel?id=${selectedId}` }
      if (selected && item.id === 'habito') return { ...item, href: `/habito?escuadron=${selectedId}` }
      return { ...item }
    }),
    { id: 'configuracion', label: 'Configuración', icon: 'settings',
      href: selected ? `/escuadrones/configuracion?origen=${selectedId}` : '/escuadrones/configuracion', webOnly: true },
  ]
}

export function squadSettingsLink(id) {
  const link = element('a', 'glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-accent lg:hidden', icon('settings'))
  link.href = squadNavigation(id).find(({ id: itemId }) => itemId === 'configuracion').href
  link.dataset.link = ''
  link.setAttribute('aria-label', 'Configuración del escuadrón')
  return link
}
