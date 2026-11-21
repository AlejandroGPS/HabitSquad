import { iniciales } from '../avatar.js'
import { button, element } from '../dom.js'
import { icon } from '../icons.js'

export const normalizeSearch = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es')

export function highlightedName(name, query) {
  const node = element('span')
  const needle = normalizeSearch(query.trim())
  const haystack = normalizeSearch(name)
  let start = 0
  let index = needle ? haystack.indexOf(needle) : -1
  while (index !== -1) {
    node.append(name.slice(start, index), element('mark', 'squad-match', name.slice(index, index + needle.length)))
    start = index + needle.length
    index = haystack.indexOf(needle, start)
  }
  node.append(name.slice(start))
  return node
}

export function squadBadge(squad) {
  const badge = element('span', 'squad-badge', iniciales(squad.nombre))
  badge.dataset.color = squad.color
  badge.setAttribute('aria-hidden', 'true')
  return badge
}

export function escuadronResultado(squad, query, onJoin) {
  const free = Math.max(0, squad.capacidad - squad.miembros.length)
  const action = button('squad-action', () => onJoin(squad), icon(squad.unido ? 'check' : 'userPlus'),
    squad.unido ? (squad.habitoPropio ? 'Ya eres miembro' : 'Elegir hábito') : free ? 'Unirme' : 'Completo')
  action.disabled = (!free && !squad.unido) || Boolean(squad.habitoPropio)
  action.dataset.squadAction = squad.id
  action.setAttribute('aria-label', `${action.textContent} · ${squad.nombre}`)
  const places = element('span', free ? 'squad-available' : 'squad-full', `${free} ${free === 1 ? 'plaza libre' : 'plazas libres'}`)
  return element('li', 'squad-result',
    element('div', 'squad-result-main', squadBadge(squad),
      element('h3', 'squad-result-name', highlightedName(squad.nombre, query))),
    element('div', 'squad-result-meta',
      element('span', 'squad-streak', icon('flame', 'h-4 w-4 shrink-0'), `${squad.racha} ${squad.racha === 1 ? 'día' : 'días'}`),
      element('span', 'squad-capacity', `${squad.miembros.length}/${squad.capacidad} miembros`), places),
    action)
}
