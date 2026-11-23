import { ApiError, getDailyHabit, getSquad, logout } from '../api.js'
import { appLayout } from '../components/appLayout.js'
import { accountMenu } from '../components/accountMenu.js'
import { element } from '../components/dom.js'
import {
  animarCambios,
  cierreCard,
  conexionEnDirecto,
  habitoCard,
  hoyCard,
  invitaCard,
  miembrosCard,
  mostrarConexion,
  panelCargando,
  rachaCard,
  rachaChip,
  semanaCard,
} from '../components/panel/index.js'
import { conectarEscuadron } from '../tiempoReal.js'
import { habitText } from './habitoDiario.js'

const ANCHO_COMPLETO = 'col-span-2 lg:col-span-4'
const REJILLA = 'mt-4 grid grid-cols-2 gap-3 px-4 lg:mt-6 lg:grid-cols-4 lg:gap-4 lg:px-0'

export function panelSeleccionadoScreen({
  navigate,
  api = { getSquad, getDailyHabit },
  ahora = () => new Date(),
  conectar = conectarEscuadron,
} = {}) {
  const id = new URLSearchParams(window.location.search).get('id')
  const root = element('div')
  const back = element('a', 'inline-flex min-h-11 items-center font-bold text-accent', '← Mis escuadrones')
  back.href = '/escuadrones'
  back.dataset.link = ''
  const conexion = conexionEnDirecto()
  const barra = element('div', `${ANCHO_COMPLETO} flex items-center justify-between gap-3`, back, conexion)
  const status = element('p', `${ANCHO_COMPLETO} font-semibold text-ink-muted empty:hidden`)
  status.setAttribute('role', 'status')
  const error = element('p', `${ANCHO_COMPLETO} font-bold text-red-700 empty:hidden`)
  error.setAttribute('role', 'alert')
  const retry = element('button', `${ANCHO_COMPLETO} min-h-11 justify-self-start font-bold text-accent underline`, 'Reintentar')
  retry.type = 'button'
  retry.hidden = true
  const huecos = panelCargando()
  const body = element('div', REJILLA, barra, status, error, retry)
  const cuenta = accountMenu({ onLogout: async () => { await logout(); navigate('/login') } })
  root.append(appLayout({ active: 'escuadron', kicker: 'Mis escuadrones', title: 'Panel del escuadrón', body, trailing: cuenta }))
  let loading = false
  let pendiente = false
  let pintado = null
  let anterior = null
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
      alCambiarEstado: (estado) => mostrarConexion(conexion, estado),
    })
    const observador = new MutationObserver(() => {
      if (root.isConnected) return
      observador.disconnect()
      enDirecto.cerrar()
    })
    observador.observe(document.body, { childList: true, subtree: true })
  }

  // En vivo se repinta sin huecos ni animaciones de entrada, solo si cambia algo de lo que se ve,
  // y se anima únicamente lo que ha cambiado. Si falla, se mantiene el panel que ya había.
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
        id: miembro.usuario_id,
        nombre: miembro.nombre || `Miembro ${miembro.usuario_id}`,
        esUsuario: miembro.es_usuario,
        habito: habitText(miembro.habito),
        estado: miembro.prueba_hoy?.estado,
        pruebaId: miembro.prueba_hoy?.id,
        semana: miembro.semana,
      }))
      const racha = squad.racha ?? 0
      const habitoPropio = habitText(ownHabit)
      const visible = JSON.stringify([squad.nombre, squad.codigo_invitacion, racha, habitoPropio, miembros])
      if (enVivo && visible === pintado) return
      pintado = visible
      const momento = ahora()
      const abrirPrueba = ({ pruebaId }) => navigate(`/escuadrones/prueba?escuadron=${id}&registro=${pruebaId}`)
      const pruebaPropia = miembros.find(({ esUsuario }) => esUsuario)?.pruebaId
      const rachaTarjeta = rachaCard({ racha })
      const hoy = hoyCard({ miembros })
      const miembrosTarjeta = miembrosCard({ miembros, onVerFoto: abrirPrueba, onVotar: abrirPrueba })
      const chip = rachaChip({ racha })
      const tarjetas = [
        rachaTarjeta,
        hoy,
        cierreCard({ ahora: momento }),
        semanaCard({ miembros, ahora: momento }),
        habitoCard({
          habito: habitoPropio,
          onElegirHabito: () => navigate(`/habito?escuadron=${id}`),
          onSubirPrueba: () => navigate(`/prueba?escuadron=${id}`),
          onVerPrueba: pruebaPropia ? () => abrirPrueba({ pruebaId: pruebaPropia }) : undefined,
        }),
        miembrosTarjeta,
        invitaCard({ codigo: squad.codigo_invitacion, libres: 5 - squad.miembros.length }),
      ]
      if (!enVivo) {
        for (const [orden, tarjeta] of tarjetas.entries()) {
          tarjeta.classList.add('entrada')
          tarjeta.style.setProperty('--orden', String(orden))
        }
      } else if (anterior) {
        animarCambios(anterior, { racha, miembros }, { rachaTarjeta, chip, hoy, miembrosTarjeta })
      }
      anterior = { racha, miembros }
      const devolverFoco = recordarFoco()
      const content = element('div', REJILLA, barra, ...tarjetas)
      root.replaceChildren(appLayout({ active: 'escuadron', kicker: 'Escuadrón', title: squad.nombre, body: content,
        trailing: [chip, cuenta] }))
      devolverFoco()
      for (const link of root.querySelectorAll('a[href="/habito"]')) {
        link.href = `/habito?escuadron=${id}`
      }
      conectarEnDirecto()
    } catch (cause) {
      if (enVivo) return
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
