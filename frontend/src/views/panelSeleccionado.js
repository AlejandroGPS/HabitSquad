import { ApiError, getDailyHabit, getSquad, logout } from '../api.js'
import { appLayout } from '../components/appLayout.js'
import { accountMenu } from '../components/accountMenu.js'
import { card } from '../components/card.js'
import { element } from '../components/dom.js'
import { habitoCard, invitaCard } from '../components/panel/index.js'

function habitText(habit) {
  if (!habit) return null
  return habit.opcion === 'otro' ? habit.texto_personalizado : { gimnasio: 'Ir al gimnasio', leer: 'Leer', estudiar: 'Estudiar' }[habit.opcion]
}

export function panelSeleccionadoScreen({ navigate, api = { getSquad, getDailyHabit } } = {}) {
  const id = new URLSearchParams(window.location.search).get('id')
  const root = element('div')
  const body = element('div', 'mt-5 px-4 lg:px-0')
  const back = element('a', 'inline-flex min-h-11 items-center font-bold text-accent', '← Mis escuadrones')
  back.href = '/'
  back.dataset.link = ''
  const status = element('p', 'mt-3 font-semibold text-ink-muted')
  status.setAttribute('role', 'status')
  const error = element('p', 'mt-3 font-bold text-red-700')
  error.setAttribute('role', 'alert')
  const retry = element('button', 'min-h-11 font-bold text-accent underline', 'Reintentar')
  retry.type = 'button'
  retry.hidden = true
  body.append(back, status, error, retry)
  root.append(appLayout({ active: 'escuadron', kicker: 'Mis escuadrones', title: 'Panel del escuadrón', body }))
  let loading = false
  async function load() {
    if (loading) return
    if (!id || !/^[1-9]\d*$/.test(id)) {
      status.textContent = 'Selecciona un escuadrón desde Mis escuadrones.'
      return
    }
    loading = true
    retry.hidden = true
    error.textContent = ''
    status.textContent = 'Cargando escuadrón…'
    try {
      const squad = await api.getSquad(id)
      const ownHabit = await api.getDailyHabit(id)
      const content = element('div', 'mt-5 grid grid-cols-2 gap-4 px-4 lg:px-0', back,
        habitoCard({ habito: habitText(ownHabit), onElegirHabito: () => navigate(`/habito?escuadron=${id}`) }),
        card('col-span-2', element('h2', 'text-lg font-black', 'Miembros'),
          element('p', 'mt-2 font-semibold text-ink-muted', `${squad.miembros.length} de 5 miembros`),
          element('p', 'mt-2 text-sm text-ink-muted', 'Las fotos y el seguimiento de la racha estarán disponibles próximamente.')),
        invitaCard({ codigo: squad.codigo_invitacion, libres: 5 - squad.miembros.length }))
      back.classList.add('col-span-2')
      root.replaceChildren(appLayout({ active: 'escuadron', kicker: 'Escuadrón', title: squad.nombre, body: content,
        trailing: [accountMenu({ onLogout: async () => { await logout(); navigate('/login') } })] }))
      for (const link of root.querySelectorAll('a[href="/habito"]')) {
        link.href = `/habito?escuadron=${id}`
      }
    } catch (cause) {
      status.textContent = ''
      error.textContent = cause instanceof ApiError && [403, 404].includes(cause.status)
        ? 'Este escuadrón no está disponible para tu cuenta. Vuelve a Mis escuadrones.'
        : 'No se ha podido cargar el escuadrón. Comprueba tu conexión y reintenta.'
      retry.hidden = false
    } finally {
      loading = false
    }
  }
  retry.addEventListener('click', load)
  void load()
  return root
}
