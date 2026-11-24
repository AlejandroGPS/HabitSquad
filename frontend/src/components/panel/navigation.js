import { APP_NAV } from '../appLayout.js'
import { element } from '../dom.js'
import { icon } from '../icons.js'

// Panel y configuración comparten las secciones y el escuadrón seleccionado.
export function squadNavigation(id) {
  const selected = /^[1-9]\d*$/.test(String(id ?? ''))
  return [
    ...APP_NAV.map((item) => {
      if (selected && item.id === 'escuadron') return { ...item, href: `/escuadrones/panel?id=${id}` }
      if (selected && item.id === 'habito') return { ...item, href: `/habito?escuadron=${id}` }
      return { ...item }
    }),
    { id: 'configuracion', label: 'Configuración', icon: 'settings',
      href: selected ? `/escuadrones/configuracion?origen=${id}` : '/escuadrones/configuracion', webOnly: true },
  ]
}

export function squadSettingsLink(id) {
  const link = element('a', 'glass grid h-11 w-11 shrink-0 place-items-center rounded-full text-accent lg:hidden', icon('settings'))
  link.href = squadNavigation(id).find(({ id }) => id === 'configuracion').href
  link.dataset.link = ''
  link.setAttribute('aria-label', 'Configuración del escuadrón')
  return link
}
