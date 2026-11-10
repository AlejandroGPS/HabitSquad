import { ApiError, getDailyHabit, getSquad, logout } from '../api.js'
import { appLayout } from '../components/appLayout.js'
import { accountMenu } from '../components/accountMenu.js'
import { element } from '../components/dom.js'
import {
  cierreCard,
  habitoCard,
  hoyCard,
  invitaCard,
  miembrosCard,
  rachaCard,
  rachaChip,
  semanaCard,
} from '../components/panel/index.js'
import { habitText } from './habitoDiario.js'

export function panelSeleccionadoScreen({ navigate, api = { getSquad, getDailyHabit }, ahora = () => new Date() } = {}) {
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
      const miembros = squad.miembros.map((miembro) => ({
        nombre: miembro.nombre || `Miembro ${miembro.usuario_id}`,
        esUsuario: miembro.es_usuario,
        habito: habitText(miembro.habito),
        estado: miembro.prueba_hoy?.estado,
        pruebaId: miembro.prueba_hoy?.id,
        semana: miembro.semana,
      }))
      const racha = squad.racha ?? 0
      const momento = ahora()
      const abrirPrueba = ({ pruebaId }) => navigate(`/escuadrones/prueba?escuadron=${id}&registro=${pruebaId}`)
      const pruebaPropia = miembros.find(({ esUsuario }) => esUsuario)?.pruebaId
      const content = element('div', 'mt-4 grid grid-cols-2 gap-3 px-4 lg:mt-6 lg:grid-cols-4 lg:gap-4 lg:px-0', back,
        rachaCard({ racha }),
        hoyCard({ miembros }),
        cierreCard({ ahora: momento }),
        semanaCard({ miembros, ahora: momento }),
        habitoCard({
          habito: habitText(ownHabit),
          onElegirHabito: () => navigate(`/habito?escuadron=${id}`),
          onSubirPrueba: () => navigate(`/prueba?escuadron=${id}`),
          onVerPrueba: pruebaPropia ? () => abrirPrueba({ pruebaId: pruebaPropia }) : undefined,
        }),
        miembrosCard({ miembros, onVerFoto: abrirPrueba, onVotar: abrirPrueba }),
        invitaCard({ codigo: squad.codigo_invitacion, libres: 5 - squad.miembros.length }))
      back.classList.add('col-span-2', 'lg:col-span-4')
      root.replaceChildren(appLayout({ active: 'escuadron', kicker: 'Escuadrón', title: squad.nombre, body: content,
        trailing: [rachaChip({ racha }), accountMenu({ onLogout: async () => { await logout(); navigate('/login') } })] }))
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
