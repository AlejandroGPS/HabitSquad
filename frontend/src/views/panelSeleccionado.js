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
  panelCargando,
  rachaCard,
  rachaChip,
  semanaCard,
} from '../components/panel/index.js'
import { habitText } from './habitoDiario.js'

const ANCHO_COMPLETO = 'col-span-2 lg:col-span-4'
const REJILLA = 'mt-4 grid grid-cols-2 gap-3 px-4 lg:mt-6 lg:grid-cols-4 lg:gap-4 lg:px-0'

export function panelSeleccionadoScreen({ navigate, api = { getSquad, getDailyHabit }, ahora = () => new Date() } = {}) {
  const id = new URLSearchParams(window.location.search).get('id')
  const root = element('div')
  const back = element('a', `${ANCHO_COMPLETO} inline-flex min-h-11 items-center font-bold text-accent`, '← Mis escuadrones')
  back.href = '/escuadrones'
  back.dataset.link = ''
  const status = element('p', `${ANCHO_COMPLETO} font-semibold text-ink-muted empty:hidden`)
  status.setAttribute('role', 'status')
  const error = element('p', `${ANCHO_COMPLETO} font-bold text-red-700 empty:hidden`)
  error.setAttribute('role', 'alert')
  const retry = element('button', `${ANCHO_COMPLETO} min-h-11 justify-self-start font-bold text-accent underline`, 'Reintentar')
  retry.type = 'button'
  retry.hidden = true
  const huecos = panelCargando()
  const body = element('div', REJILLA, back, status, error, retry)
  // La cuenta usa el nickname y la foto que ya trae el escuadrón, sin pedir el perfil aparte.
  let mostrarIdentidad
  const identidad = new Promise((resolve) => { mostrarIdentidad = resolve })
  const cuenta = accountMenu({
    loadProfile: () => identidad,
    onLogout: async () => { await logout(); navigate('/login') },
  })
  root.append(appLayout({ active: 'escuadron', kicker: 'Mis escuadrones', title: 'Panel del escuadrón', body, trailing: cuenta }))
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
    status.classList.add('sr-only')
    body.append(...huecos)
    try {
      const squad = await api.getSquad(id)
      const ownHabit = await api.getDailyHabit(id)
      const miembros = squad.miembros.map((miembro) => ({
        nombre: miembro.nickname || `Miembro ${miembro.usuario_id}`,
        fotoUrl: miembro.foto_url,
        esUsuario: miembro.es_usuario,
        habito: habitText(miembro.habito),
        estado: miembro.prueba_hoy?.estado,
        pruebaId: miembro.prueba_hoy?.id,
        semana: miembro.semana,
      }))
      const racha = squad.racha ?? 0
      const momento = ahora()
      const abrirPrueba = ({ pruebaId }) => navigate(`/escuadrones/prueba?escuadron=${id}&registro=${pruebaId}`)
      const propio = squad.miembros.find(({ es_usuario }) => es_usuario)
      mostrarIdentidad(propio && { nickname: propio.nickname, foto_url: propio.foto_url })
      const pruebaPropia = miembros.find(({ esUsuario }) => esUsuario)?.pruebaId
      const tarjetas = [
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
        invitaCard({ codigo: squad.codigo_invitacion, libres: 5 - squad.miembros.length }),
      ]
      for (const [orden, tarjeta] of tarjetas.entries()) {
        tarjeta.classList.add('entrada')
        tarjeta.style.setProperty('--orden', String(orden))
      }
      const content = element('div', REJILLA, back, ...tarjetas)
      const focus = cuenta.contains(document.activeElement) ? document.activeElement : null
      root.replaceChildren(appLayout({ active: 'escuadron', kicker: 'Escuadrón', title: squad.nombre, body: content,
        trailing: [rachaChip({ racha }), cuenta] }))
      focus?.focus()
      for (const link of root.querySelectorAll('a[href="/habito"]')) {
        link.href = `/habito?escuadron=${id}`
      }
    } catch (cause) {
      status.textContent = ''
      status.classList.remove('sr-only')
      for (const hueco of huecos) hueco.remove()
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
