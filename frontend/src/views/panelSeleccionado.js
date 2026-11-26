import { ApiError, getDailyHabit, getSquad, logout } from '../api.js'
import { APP_NAV, appLayout } from '../components/appLayout.js'
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
import { conectarEscuadron } from '../tiempoReal.js'
import { habitText } from './habitoDiario.js'
import { squadNavigation, squadSettingsLink } from '../components/panel/navigation.js'

const ANCHO_COMPLETO = 'col-span-2 lg:col-span-4'
const REJILLA = 'mt-4 grid grid-cols-2 gap-3 px-4 lg:mt-6 lg:grid-cols-4 lg:gap-4 lg:px-0'

export function panelSeleccionadoScreen({
  navigate,
  api = { getSquad, getDailyHabit },
  ahora = () => new Date(),
  conectar = conectarEscuadron,
} = {}) {
  const id = new URLSearchParams(window.location.search).get('id')
  const navItems = squadNavigation(id)
  const sidebarNavItems = navItems.filter(({ id }) => id !== 'racha' && id !== 'alertas')
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
  root.append(appLayout({ active: 'escuadron', kicker: 'Mis escuadrones', title: 'Panel del escuadrón', body, trailing: cuenta,
    navItems, sidebarNavItems }))
  let loading = false
  let pendiente = false
  let pintado = null
  let enDirecto = null

  // Al repintar se sustituyen los nodos: el foco vuelve al control equivalente del panel nuevo.
  function recordarFoco() {
    const activo = document.activeElement
    if (!root.contains(activo)) return () => {}
    if (cuenta.contains(activo)) return () => activo.focus({ preventScroll: true })
    const indice = [...root.querySelectorAll('a, button')].indexOf(activo)
    return () => {
      const equivalente = root.querySelectorAll('a, button')[indice]
      if (equivalente?.textContent === activo.textContent) equivalente.focus({ preventScroll: true })
    }
  }

  function conectarEnDirecto() {
    if (enDirecto || !root.isConnected) return
    const refrescar = () => void load({ enVivo: true })
    enDirecto = conectar(id, {
      alActualizar: refrescar,
      alSuscribirse: refrescar,
    })
    const observador = new MutationObserver(() => {
      if (root.isConnected) return
      observador.disconnect()
      enDirecto.cerrar()
    })
    observador.observe(document.body, { childList: true, subtree: true })
  }

  // Tras una expulsión el aviso en directo sigue llegando, pero el detalle ya responde 403.
  function sinAcceso() {
    enDirecto?.cerrar()
    pendiente = false
    pintado = null
    status.textContent = ''
    error.textContent = 'Ya no formas parte de este escuadrón. Vuelve a Mis escuadrones.'
    retry.hidden = true
    body.replaceChildren(back, status, error, retry)
    root.replaceChildren(appLayout({ active: 'escuadron', kicker: 'Mis escuadrones', title: 'Panel del escuadrón', body, trailing: cuenta,
      sidebarNavItems: APP_NAV.filter(({ id }) => id !== 'racha' && id !== 'alertas') }))
  }

  // En vivo se repinta sin huecos ni animaciones, y solo si cambia algo de lo que se ve.
  // Si falla, se mantiene el panel que ya había hasta el siguiente aviso.
  async function load({ enVivo = false } = {}) {
    if (loading) {
      pendiente ||= enVivo
      return
    }
    if (!id || !/^[1-9]\d*$/.test(id)) {
      status.textContent = 'Selecciona un escuadrón desde Mis escuadrones.'
      return
    }
    loading = true
    if (!enVivo) {
      retry.hidden = true
      error.textContent = ''
      status.textContent = 'Cargando escuadrón…'
      status.classList.add('sr-only')
      body.append(...huecos)
    }
    try {
      const squad = await api.getSquad(id)
      const ownHabit = await api.getDailyHabit(id)
      const miembros = squad.miembros.map((miembro) => ({
        nombre: miembro.nickname || miembro.nombre || `Miembro ${miembro.usuario_id}`,
        fotoUrl: miembro.foto_url,
        esUsuario: miembro.es_usuario,
        habito: habitText(miembro.habito),
        estado: miembro.prueba_hoy?.estado,
        pruebaId: miembro.prueba_hoy?.id,
        semana: miembro.semana,
      }))
      const racha = squad.racha ?? 0
      const habitoPropio = habitText(ownHabit)
      const visible = JSON.stringify([squad.nombre, squad.codigo_invitacion, squad.limite_miembros, racha, habitoPropio, miembros])
      if (enVivo && visible === pintado) return
      pintado = visible
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
          habito: habitoPropio,
          onElegirHabito: () => navigate(`/habito?escuadron=${id}`),
          onSubirPrueba: () => navigate(`/prueba?escuadron=${id}`),
          onVerPrueba: pruebaPropia ? () => abrirPrueba({ pruebaId: pruebaPropia }) : undefined,
        }),
        miembrosCard({ miembros, plazas: squad.limite_miembros ?? 5, onVerFoto: abrirPrueba, onVotar: abrirPrueba }),
        invitaCard({ codigo: squad.codigo_invitacion, libres: (squad.limite_miembros ?? 5) - squad.miembros.length }),
      ]
      if (!enVivo) {
        for (const [orden, tarjeta] of tarjetas.entries()) {
          tarjeta.classList.add('entrada')
          tarjeta.style.setProperty('--orden', String(orden))
        }
      }
      const devolverFoco = recordarFoco()
      const content = element('div', REJILLA, back, ...tarjetas)
      root.replaceChildren(appLayout({ active: 'escuadron', kicker: 'Escuadrón', title: squad.nombre, body: content,
        navItems, sidebarNavItems,
        trailing: [rachaChip({ racha }), squadSettingsLink(id), cuenta] }))
      devolverFoco()
      for (const link of root.querySelectorAll('a[href="/habito"]')) {
        link.href = `/habito?escuadron=${id}`
      }
      conectarEnDirecto()
    } catch (cause) {
      if (enVivo) {
        if (cause instanceof ApiError && [403, 404].includes(cause.status)) sinAcceso()
        return
      }
      status.textContent = ''
      status.classList.remove('sr-only')
      for (const hueco of huecos) hueco.remove()
      error.textContent = cause instanceof ApiError && [403, 404].includes(cause.status)
        ? 'Este escuadrón no está disponible para tu cuenta. Vuelve a Mis escuadrones.'
        : 'No se ha podido cargar el escuadrón. Comprueba tu conexión y reintenta.'
      retry.hidden = false
    } finally {
      loading = false
      if (pendiente) {
        pendiente = false
        void load({ enVivo: true })
      }
    }
  }
  retry.addEventListener('click', () => load())
  void load()
  return root
}
