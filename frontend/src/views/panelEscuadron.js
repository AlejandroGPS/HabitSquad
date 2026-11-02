import { mockSquads, node, link, squadShell } from './menu.js'

export function panelEscuadronScreen() {
  const id = new URLSearchParams(window.location.search).get('id')
  const squad = mockSquads.find((entry) => entry.id === id)
  const { main, wrap } = squadShell('Panel del escuadrón')
  wrap.append(link('/', '← Mis escuadrones', 'squad-back my-4 inline-flex min-h-11 items-center font-bold'))
  if (!squad) {
    wrap.append(node('p', 'squad-card p-6', 'Selecciona un escuadrón de ejemplo desde Mis escuadrones.'))
    return main
  }
  wrap.append(node('h2', 'mt-2 text-2xl font-black', squad.name), node('p', 'squad-muted mt-2 font-semibold', 'Panel de ejemplo · La información no está conectada al backend.'))
  const grid = node('div', 'mt-6 grid gap-5 sm:grid-cols-2')
  const streak = node('section', 'squad-streak rounded-[1.75rem] p-7 text-white')
  streak.append(node('h3', 'font-bold', 'Racha compartida'), node('p', 'mt-3 text-5xl font-black', `${squad.streak} días`), node('p', 'mt-3 font-semibold', 'Cada pequeño esfuerzo suma.'))
  const habit = node('section', 'squad-create rounded-[1.75rem] p-7 text-white')
  habit.append(node('h3', 'font-bold', 'Mi hábito'), node('p', 'my-4 text-2xl font-black', 'Uno solo, y que sea tuyo.'), link('/habito', 'Elegir mi hábito', 'squad-white-button'))
  const members = node('section', 'squad-card p-6 sm:col-span-2')
  members.append(node('h3', 'text-xl font-black', 'Tu escuadrón, hoy'), node('p', 'squad-muted my-4 font-semibold', `${squad.members} miembros · Datos de ejemplo`), link('/escuadrones/votar', 'Revisar pruebas de ejemplo'))
  grid.append(streak, habit, members)
  wrap.append(grid)
  return main
}
