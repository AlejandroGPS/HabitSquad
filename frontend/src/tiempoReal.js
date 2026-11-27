import { ApiError, refreshSession } from './api.js'
import { getSession } from './session.js'

const CIERRE_NORMAL = 1000
const NO_AUTENTICADO = 4401
const ESPERA_INICIAL = 1000
const ESPERA_MAXIMA = 30_000

export function urlEscuadron(escuadronId, { protocol, host } = window.location) {
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws/escuadrones/${escuadronId}/`
}

function leerEvento(data) {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

// El servidor solo avisa de que el panel ha cambiado; el detalle se vuelve a pedir por REST.
// Los avisos no se guardan: con cada suscripción, también tras reconectar, hay que pedirlo de nuevo.
export function conectarEscuadron(escuadronId, {
  alActualizar,
  alSuscribirse,
  alCambiarEstado,
  crearSocket = (url) => new WebSocket(url),
  renovarSesion = refreshSession,
} = {}) {
  let socket = null
  let espera = 0
  let intentos = 0
  let tokenRecienRenovado = false
  let cerrado = false
  let estado = null

  function cambiarEstado(nuevo) {
    if (nuevo === estado) return
    estado = nuevo
    alCambiarEstado?.(nuevo)
  }

  function abrir() {
    espera = 0
    if (cerrado) return
    if (!getSession()) {
      detener()
      return
    }
    if (estado === null) cambiarEstado('conectando')
    let actual
    try {
      actual = crearSocket(urlEscuadron(escuadronId))
    } catch {
      detener()
      return
    }
    let autenticado = false
    socket = actual

    actual.addEventListener('open', () => {
      actual.send(JSON.stringify({ tipo: 'autenticar', access: getSession()?.access ?? '' }))
    })
    actual.addEventListener('message', ({ data }) => {
      if (socket !== actual) return
      const evento = leerEvento(data)
      if (evento?.tipo === 'autenticado') {
        autenticado = true
        intentos = 0
        tokenRecienRenovado = false
        cambiarEstado('conectado')
        alSuscribirse?.()
      } else if (evento?.tipo === 'panel.actualizado') {
        alActualizar?.(evento)
      }
    })
    actual.addEventListener('close', ({ code }) => {
      if (socket !== actual) return
      socket = null
      alCerrarse(code, autenticado)
    })
  }

  // 4401 antes de autenticarse: el access ha caducado (dura 5 minutos) o no hay acceso al escuadrón.
  // Se renueva la sesión una vez; si el servidor rechaza también el token nuevo, se deja de intentar.
  function alCerrarse(code, autenticado) {
    if (code === NO_AUTENTICADO && !autenticado) {
      if (tokenRecienRenovado) {
        detener()
        return
      }
      tokenRecienRenovado = true
      cambiarEstado('reconectando')
      renovarSesion().then(abrir, (error) => {
        if (error instanceof ApiError) detener()
        else programar()
      })
      return
    }
    tokenRecienRenovado = false
    programar()
  }

  function programar() {
    if (cerrado) return
    cambiarEstado('reconectando')
    espera = setTimeout(abrir, Math.min(ESPERA_MAXIMA, ESPERA_INICIAL * 2 ** intentos))
    intentos += 1
  }

  function reintentarYa() {
    if (!espera) return
    clearTimeout(espera)
    abrir()
  }

  function alVolver() {
    if (document.visibilityState === 'visible') reintentarYa()
  }

  function cerrar() {
    if (cerrado) return
    cerrado = true
    clearTimeout(espera)
    espera = 0
    window.removeEventListener('online', reintentarYa)
    document.removeEventListener('visibilitychange', alVolver)
    const actual = socket
    socket = null
    actual?.close(CIERRE_NORMAL, 'salida del panel')
  }

  function detener() {
    if (cerrado) return
    cerrar()
    alCambiarEstado?.('desconectado')
  }

  window.addEventListener('online', reintentarYa)
  document.addEventListener('visibilitychange', alVolver)
  abrir()
  return { cerrar }
}
