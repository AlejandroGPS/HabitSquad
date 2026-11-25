import { deletePushSubscription, getVapidPublicKey, savePushSubscription } from './api.js'

const ESPERA_SERVICE_WORKER = 4000

// La clave VAPID llega en base64 URL-safe; el navegador la quiere en bytes.
export function claveAplicacion(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  return Uint8Array.from(atob(base64 + relleno), (letra) => letra.charCodeAt(0))
}

function mismaClave(suscripcion, clave) {
  const actual = suscripcion.options?.applicationServerKey
  if (!actual) return true
  const bytes = new Uint8Array(actual)
  return bytes.length === clave.length && bytes.every((byte, indice) => byte === clave[indice])
}

// Estados: 'no-soportado' (el navegador no tiene Web Push; en iPhone, si la app no está instalada),
// 'no-disponible' (no hay service worker, como con `npm run dev`), 'bloqueado' (permiso denegado),
// 'activado' y 'desactivado'.
export function crearAvisos({
  entorno = globalThis,
  api = { getVapidPublicKey, savePushSubscription, deletePushSubscription },
  espera = ESPERA_SERVICE_WORKER,
} = {}) {
  const soportado = Boolean(entorno.navigator?.serviceWorker && entorno.PushManager && entorno.Notification)

  // Al entrar directamente en la pantalla el service worker puede no estar listo todavía.
  function registro() {
    let reloj
    const limite = new Promise((resolve) => { reloj = setTimeout(resolve, espera, null) })
    return Promise.race([entorno.navigator.serviceWorker.ready, limite]).finally(() => clearTimeout(reloj))
  }

  // Si ya hay suscripción, se vuelve a enviar: el servidor la actualiza y así no se pierde
  // si se borró allí. Si falla, el navegador sigue suscrito y se reintenta la próxima vez.
  async function consultar() {
    if (!soportado) return 'no-soportado'
    if (entorno.Notification.permission === 'denied') return 'bloqueado'
    const registrado = await registro()
    if (!registrado) return 'no-disponible'
    const suscripcion = await registrado.pushManager.getSubscription()
    if (!suscripcion || entorno.Notification.permission !== 'granted') return 'desactivado'
    await api.savePushSubscription(suscripcion.toJSON()).catch(() => {})
    return 'activado'
  }

  // El permiso se pide antes de cualquier espera para que el navegador lo asocie a la pulsación.
  async function activar() {
    if (!soportado) return 'no-soportado'
    const { Notification } = entorno
    const permiso = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    if (permiso === 'denied') return 'bloqueado'
    if (permiso !== 'granted') return 'desactivado'
    const registrado = await registro()
    if (!registrado) return 'no-disponible'
    const clave = claveAplicacion(await api.getVapidPublicKey())
    let suscripcion = await registrado.pushManager.getSubscription()
    if (suscripcion && !mismaClave(suscripcion, clave)) {
      await suscripcion.unsubscribe()
      suscripcion = null
    }
    suscripcion ??= await registrado.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave })
    try {
      await api.savePushSubscription(suscripcion.toJSON())
    } catch (error) {
      await suscripcion.unsubscribe().catch(() => {})
      throw error
    }
    return 'activado'
  }

  async function desactivar() {
    if (!soportado) return 'no-soportado'
    const registrado = await registro()
    const suscripcion = await registrado?.pushManager.getSubscription()
    if (suscripcion) {
      await api.deletePushSubscription(suscripcion.endpoint)
      await suscripcion.unsubscribe()
    }
    return 'desactivado'
  }

  return { consultar, activar, desactivar }
}
