import { button, element } from '../dom.js'

export function settingsTabs(onChange) {
  const node = element('div', 'settings-tabs')
  node.setAttribute('role', 'tablist')
  node.setAttribute('aria-label', 'Configuración del escuadrón')
  const tabs = ['General', 'Miembros', 'Invitaciones'].map((label, index) => {
    const tab = button('settings-tab', () => select(index), label)
    tab.id = `settings-tab-${index}`
    tab.setAttribute('role', 'tab')
    tab.setAttribute('aria-controls', 'settings-panel')
    tab.addEventListener('keydown', (event) => {
      const next = { ArrowRight: (index + 1) % 3, ArrowLeft: (index + 2) % 3, Home: 0, End: 2 }[event.key]
      if (next === undefined) return
      event.preventDefault()
      if (tabs[next].disabled) return
      select(next)
      tabs[next].focus()
    })
    node.append(tab)
    return tab
  })
  function select(index, notify = true) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(index === i))
      tab.tabIndex = index === i ? 0 : -1
    })
    if (notify) onChange(index)
  }
  select(0, false)
  return { node, select }
}
